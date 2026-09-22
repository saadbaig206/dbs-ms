from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm.attributes import flag_modified
from app.models.client import Client
from app.models.transaction import FinancialTransaction
from app.models.notification import NotificationItem
from app.models.inventory import InventoryItem
from app.models.service import ServiceItem

import uuid
import secrets

async def checkout(
    db: AsyncSession,
    client_name: str,
    payment_method: str,
    discount_percent: float,
    tax_percent: float,
    cart_items: list[dict], # list of dicts with serviceId, name, price, quantity, category
    card_last_four: str = None,
    card_type: str = None,
    bank_txn_id: str = None,
    branch_id: str = None,
    client_phone: str = None,
    client_id: str = None,
    client_time: str = None,
    client_date: str = None,
    amount_paid: float = None,
    remaining_due: float = None,
    payment_splits: list[dict] = None,
    package_id: str = None,
    appointment_id: str = None,
    is_admin: bool = False,
    cash_received: float = None,
    cash_returned: float = None
) -> FinancialTransaction:

    # 0. Validate cart items
    if not cart_items:
        raise Exception("Cart cannot be empty for checkout.")
    for item in cart_items:
        p = float(item.get("price", 0))
        q = int(item.get("quantity", 1))
        if p < 0:
            raise Exception(f"Item price cannot be negative: {item.get('name')}")
        if q <= 0:
            raise Exception(f"Item quantity must be greater than zero: {item.get('name')}")

    # Enforce catalog price protection: staff cannot reduce catalog unit prices without Admin authorization
    if not is_admin:
        for item in cart_items:
            srv_id = item.get("serviceId")
            cat_price = None
            if srv_id and not str(srv_id).startswith("INV-") and not str(srv_id).startswith("CUSTOM"):
                s_res = await db.execute(select(ServiceItem).where(ServiceItem.id == srv_id))
                s_obj = s_res.scalars().first()
                if s_obj:
                    cat_price = s_obj.price
            elif srv_id and str(srv_id).startswith("INV-"):
                inv_res = await db.execute(select(InventoryItem).where(InventoryItem.id == srv_id))
                inv_obj = inv_res.scalars().first()
                if inv_obj:
                    cat_price = inv_obj.price

            if cat_price is not None and float(item.get("price", 0)) < cat_price:
                raise Exception(
                    f"Price reduction below catalog price (Rs. {cat_price}) for '{item.get('name')}' requires Admin supervisor approval."
                )

    # Compute totals
    subtotal = sum(float(item["price"]) * int(item["quantity"]) for item in cart_items)
    discount = (subtotal * discount_percent) / 100.0
    taxable = max(0.0, subtotal - discount)
    tax = (taxable * tax_percent) / 100.0
    grand_total = round(taxable + tax, 2)
    
    # Server-authoritative timestamp for non-admins (prevents backdating sales)
    now = datetime.now()
    if is_admin:
        today_str = client_date or now.strftime("%Y-%m-%d")
        current_time_str = client_time or now.strftime("%I:%M %p")
    else:
        today_str = now.strftime("%Y-%m-%d")
        current_time_str = now.strftime("%I:%M %p")
    
    # Generate collision-resistant unique Transaction and Invoice IDs
    count_stmt = select(func.count()).select_from(FinancialTransaction)
    txn_count_result = await db.execute(count_stmt)
    txn_count = (txn_count_result.scalar() or 0) + 1

    suffix = secrets.token_hex(2).upper()
    txn_id = f"TXN-{str(txn_count).zfill(4)}-{suffix}"
    invoice_id = f"INV-{datetime.now().year}-{str(txn_count).zfill(3)}-{suffix}"

    while True:
        exists_stmt = select(FinancialTransaction).where(FinancialTransaction.id == txn_id)
        exists_result = await db.execute(exists_stmt)
        if not exists_result.scalars().first():
            break
        txn_count += 1
        suffix = secrets.token_hex(2).upper()
        txn_id = f"TXN-{str(txn_count).zfill(4)}-{suffix}"
        invoice_id = f"INV-{datetime.now().year}-{str(txn_count).zfill(3)}-{suffix}"
    
    # Strict server math invariant: amount_paid cannot exceed grand_total or be negative
    if amount_paid is None:
        actual_amount_paid = grand_total
    else:
        actual_amount_paid = round(max(0.0, min(float(amount_paid), grand_total)), 2)
    
    actual_remaining_due = round(max(0.0, grand_total - actual_amount_paid), 2)

    # Split payment validation: splits sum must strictly equal amount_paid
    if payment_splits:
        split_sum = round(sum(float(s.get("amount", 0)) for s in payment_splits), 2)
        if split_sum != actual_amount_paid:
            raise Exception(f"Split payment total ({split_sum}) must exactly equal amount paid ({actual_amount_paid}).")

    payment_status = "Paid"
    if actual_remaining_due > 0 and actual_amount_paid > 0:
        payment_status = "Partial"
    elif actual_remaining_due > 0 and actual_amount_paid == 0:
        payment_status = "Unpaid"

    # 1. Update client totals, outstanding dues and history (creating client on the fly if needed)
    client = None
    is_walk_in = (client_name.strip().lower() in ("walk-in", "walk-in client", "walk in", "guest")) and (not client_phone or client_phone == "0000000000") and (not client_id)

    if not is_walk_in:
        if client_id:
            c_res = await db.execute(select(Client).where(Client.id == client_id).with_for_update())
            client = c_res.scalars().first()
        if not client and client_phone and client_phone != "0000000000":
            c_res = await db.execute(select(Client).where(Client.phone == client_phone).with_for_update())
            client = c_res.scalars().first()
        if not client:
            # Strict exact match by client name to prevent misattribution to other clients
            c_res = await db.execute(select(Client).where(func.lower(Client.name) == client_name.strip().lower()).with_for_update())
            clients_matched = c_res.scalars().all()
            if len(clients_matched) == 1:
                client = clients_matched[0]
            # If multiple clients share the exact name and phone was not provided, do not arbitrarily assign
    
    service_names = ", ".join(item["name"] for item in cart_items)
    
    if not client:
        new_client_id = f"CLT-GUEST-{suffix}" if is_walk_in else f"CLT-{secrets.token_hex(3).upper()}"
        client = Client(
            id=new_client_id,
            name=f"Walk-in Client ({suffix})" if is_walk_in else client_name,
            phone=client_phone or "0000000000",
            gender="Other",
            age=30,
            address="N/A",
            total_spent=0.0,
            outstanding_balance=0.0,
            visits_count=0,
            history=[],
            joined_date=today_str,
            branch_id=branch_id
        )
        db.add(client)
        await db.flush()

    client.visits_count = (client.visits_count or 0) + 1
    client.total_spent = (client.total_spent or 0.0) + actual_amount_paid
    client.outstanding_balance = (client.outstanding_balance or 0.0) + actual_remaining_due
    
    # Append history item
    history_item = {
        "id": f"HIS-{txn_id}",
        "date": today_str,
        "serviceName": service_names,
        "staffName": client.assigned_staff_name or "Front Desk",
        "amount": actual_amount_paid,
        "grandTotal": grand_total,
        "due": actual_remaining_due,
        "status": payment_status
    }
    
    if client.history is None:
        client.history = []
    client.history.append(history_item)
    flag_modified(client, "history")
    db.add(client)

    # 2. Package creation or redemption handling
    from app.models.package import ClientPackage, PackageRedemptionLog
    
    created_pkg_id = package_id
    for item in cart_items:
        if item.get("isPackage") or item.get("sessions", 1) > 1:
            qty = int(item.get("quantity", 1))
            sessions_per_bundle = int(item.get("sessions", 3))
            total_pkg_sessions = sessions_per_bundle * qty
            total_pkg_cost = float(item["price"]) * qty
            item_pkg_id = f"PKG-{secrets.token_hex(3).upper()}"
            from datetime import timedelta
            pkg_exp = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
            client_pkg = ClientPackage(
                id=item_pkg_id,
                client_id=client.id,
                client_name=client.name,
                package_name=item["name"],
                service_id=str(item.get("serviceId", "CUSTOM")),
                total_sessions=total_pkg_sessions,
                used_sessions=0,
                remaining_sessions=total_pkg_sessions,
                total_amount_paid=total_pkg_cost,
                price_per_session=round(total_pkg_cost / total_pkg_sessions, 2) if total_pkg_sessions > 0 else 0.0,
                status="Active",
                branch_id=branch_id,
                purchase_date=today_str,
                expiry_date=pkg_exp,
                notes=f"Purchased via POS Txn {txn_id} (Qty: {qty} bundles x {sessions_per_bundle} sessions)"
            )
            db.add(client_pkg)
            if not created_pkg_id:
                created_pkg_id = item_pkg_id

    if package_id and not any(item.get("isPackage") or item.get("sessions", 1) > 1 for item in cart_items):
        pkg_res = await db.execute(select(ClientPackage).where(ClientPackage.id == package_id))
        pkg = pkg_res.scalars().first()
        if pkg and pkg.remaining_sessions > 0:
            pkg.used_sessions += 1
            pkg.remaining_sessions -= 1
            if pkg.remaining_sessions == 0:
                pkg.status = "Completed"
            db.add(pkg)
            redemption = PackageRedemptionLog(
                id=f"RED-{secrets.token_hex(3).upper()}",
                package_id=pkg.id,
                client_name=client.name,
                session_number=pkg.used_sessions,
                date=today_str,
                time=current_time_str,
                staff_name=client.assigned_staff_name or "Staff",
                notes=f"Redeemed via POS Txn {txn_id}"
            )
            db.add(redemption)
        
    # 3. Decrement inventory where applicable
    inventory_notices = []
    for item in cart_items:
        # Check A: Service with mapped required inventory recipe
        service = None
        if "serviceId" in item and not str(item["serviceId"]).startswith("INV-"):
            service_result = await db.execute(select(ServiceItem).where(ServiceItem.id == item["serviceId"]))
            service = service_result.scalars().first()

        if service and getattr(service, "required_inventory", None):
            for req in service.required_inventory:
                inv_item_id = req.get("inventory_item_id")
                qty_used = req.get("quantity_used", 1)
                
                inv_query = select(InventoryItem).where(InventoryItem.id == inv_item_id)
                if branch_id:
                    inv_query = inv_query.where(InventoryItem.branch_id == branch_id)
                inv_query = inv_query.with_for_update()
                
                inv_result = await db.execute(inv_query)
                inv_item = inv_result.scalars().first()
                
                if inv_item:
                    total_needed = qty_used * int(item["quantity"])
                    if inv_item.quantity < total_needed:
                        raise Exception(
                            f"Insufficient stock for '{inv_item.item_name}' at this branch. "
                            f"Available: {inv_item.quantity}, Requested: {total_needed}"
                        )
                    inv_item.quantity -= total_needed
                    db.add(inv_item)
                    
                    # Trigger stock alert
                    if inv_item.quantity <= inv_item.min_stock:
                        alert_id = f"NOT-INV-{int(datetime.now().timestamp() * 1000)}"
                        stock_alert = NotificationItem(
                            id=alert_id,
                            title=f"Low Stock Alert: {inv_item.item_name}",
                            message=f"Stock for '{inv_item.item_name}' has fallen to {inv_item.quantity} (Min threshold: {inv_item.min_stock}). Please restock.",
                            time=datetime.now().strftime("%Y-%m-%d %I:%M %p"),
                            type="inventory",
                            read=False
                        )
                        db.add(stock_alert)
            continue
        elif service and not getattr(service, "required_inventory", None):
            inventory_notices.append(f"Service '{item['name']}' has no inventory recipe mapped.")

        # Check B: Direct Retail Product Sale or Exact-Name Inventory Match
        inv_id = item.get("inventoryItemId") or item.get("serviceId")
        inv_item = None
        if inv_id and str(inv_id).startswith("INV-"):
            inv_query = select(InventoryItem).where(InventoryItem.id == inv_id)
            if branch_id:
                inv_query = inv_query.where(InventoryItem.branch_id == branch_id)
            inv_result = await db.execute(inv_query.with_for_update())
            inv_item = inv_result.scalars().first()

        if not inv_item:
            # Safe exact name match (never wildcard substring)
            inv_query = select(InventoryItem).where(InventoryItem.item_name == item["name"])
            if branch_id:
                inv_query = inv_query.where(InventoryItem.branch_id == branch_id)
            inv_result = await db.execute(inv_query.with_for_update())
            inv_item = inv_result.scalars().first()

        if inv_item:
            qty_needed = int(item["quantity"])
            if inv_item.quantity < qty_needed:
                raise Exception(
                    f"Insufficient stock for retail product '{inv_item.item_name}' at this branch. "
                    f"Available: {inv_item.quantity}, Requested: {qty_needed}"
                )
            inv_item.quantity -= qty_needed
            db.add(inv_item)

            if inv_item.quantity <= inv_item.min_stock:
                alert_id = f"NOT-INV-{int(datetime.now().timestamp() * 1000)}"
                stock_alert = NotificationItem(
                    id=alert_id,
                    title=f"Low Stock Alert: {inv_item.item_name}",
                    message=f"Stock for '{inv_item.item_name}' has fallen to {inv_item.quantity} (Min threshold: {inv_item.min_stock}). Please restock.",
                    time=datetime.now().strftime("%Y-%m-%d %I:%M %p"),
                    type="inventory",
                    read=False
                )
                db.add(stock_alert)

    initial_audit_logs = []
    for notice in inventory_notices:
        initial_audit_logs.append({
            "timestamp": f"{today_str} {current_time_str}",
            "action": "InventoryNotice",
            "message": notice
        })

    # 4. Create the FinancialTransaction record
    transaction = FinancialTransaction(
        id=txn_id,
        invoice_id=invoice_id,
        client_id=client.id if client else None,
        client_name=client_name,
        service_name=service_names,
        transaction_type="Sale",
        amount=subtotal,
        discount=discount,
        tax=tax,
        tax_percent=tax_percent,
        grand_total=grand_total,
        amount_paid=actual_amount_paid,
        remaining_due=actual_remaining_due,
        cash_received=cash_received,
        cash_returned=cash_returned,
        payment_status=payment_status,
        payment_splits=payment_splits or [],
        package_id=created_pkg_id,
        date=today_str,
        time=current_time_str,
        payment_method=payment_method,
        status="Paid" if actual_remaining_due == 0 else "Pending",
        items=[{
            "name": item["name"],
            "price": float(item["price"]),
            "quantity": int(item["quantity"]),
            "isProduct": bool(item.get("isProduct") or item.get("category") == "Products" or item.get("inventoryItemId")),
            "staffId": item.get("staffId"),
            "staffName": item.get("staffName"),
            "packageId": item.get("packageId"),
        } for item in cart_items],
        card_last_four=card_last_four,
        card_type=card_type,
        bank_txn_id=bank_txn_id,
        branch_id=branch_id,
        audit_logs=initial_audit_logs,
        reprint_count=0
    )
    db.add(transaction)
    
    # 5. Link Appointment if billed from appointment flow or auto-match same-day appointment (preventing ghost bookings)
    from app.models.appointment import Appointment
    linked_apt = None
    if appointment_id:
        apt_stmt = select(Appointment).where(Appointment.id == appointment_id)
        apt_res = await db.execute(apt_stmt)
        linked_apt = apt_res.scalars().first()
    elif client and client.id and not is_walk_in:
        apt_stmt = select(Appointment).where(
            Appointment.client_id == client.id,
            Appointment.date == today_str,
            Appointment.status.in_(["Scheduled", "Confirmed", "In-Progress"])
        )
        apt_res = await db.execute(apt_stmt)
        linked_apt = apt_res.scalars().first()

    if linked_apt:
        linked_apt.transaction_id = txn_id
        linked_apt.payment_status = "Paid" if actual_remaining_due == 0 else "Billed"
        linked_apt.status = "Completed"
        db.add(linked_apt)

    await db.commit()
    await db.refresh(transaction)
    return transaction
