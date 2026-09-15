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
    client_id: str = None
) -> FinancialTransaction:
    # Compute totals
    subtotal = sum(item["price"] * item["quantity"] for item in cart_items)
    discount = (subtotal * discount_percent) / 100.0
    taxable = subtotal - discount
    tax = (taxable * tax_percent) / 100.0
    grand_total = round(taxable + tax, 2)
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # Generate collision-resistant unique Transaction and Invoice IDs
    count_stmt = select(func.count()).select_from(FinancialTransaction)
    txn_count_result = await db.execute(count_stmt)
    txn_count = (txn_count_result.scalar() or 0) + 1

    suffix = secrets.token_hex(2).upper()
    txn_id = f"TXN-{900 + txn_count}-{suffix}"
    invoice_id = f"INV-{datetime.now().year}-{str(txn_count).zfill(3)}-{suffix}"

    while True:
        exists_stmt = select(FinancialTransaction).where(FinancialTransaction.id == txn_id)
        exists_result = await db.execute(exists_stmt)
        if not exists_result.scalars().first():
            break
        txn_count += 1
        suffix = secrets.token_hex(2).upper()
        txn_id = f"TXN-{900 + txn_count}-{suffix}"
        invoice_id = f"INV-{datetime.now().year}-{str(txn_count).zfill(3)}-{suffix}"
    
    # 1. Update client totals and history (creating client on the fly if needed)
    client = None
    if client_id:
        c_res = await db.execute(select(Client).where(Client.id == client_id).with_for_update())
        client = c_res.scalars().first()
    if not client and client_phone and client_phone != "0000000000":
        c_res = await db.execute(select(Client).where(Client.phone == client_phone).with_for_update())
        client = c_res.scalars().first()
    if not client:
        c_res = await db.execute(select(Client).where(Client.name.ilike(client_name)).with_for_update())
        client = c_res.scalars().first()
    
    service_names = ", ".join(item["name"] for item in cart_items)
    
    if not client:
        new_client_id = f"CLT-{secrets.token_hex(3).upper()}"
        client = Client(
            id=new_client_id,
            name=client_name,
            phone=client_phone or "0000000000",
            gender="Other",
            age=30,
            address="N/A",
            total_spent=0.0,
            visits_count=0,
            history=[],
            joined_date=today_str,
            branch_id=branch_id
        )
        db.add(client)
        await db.flush()

    client.visits_count = (client.visits_count or 0) + 1
    client.total_spent = (client.total_spent or 0.0) + grand_total
    
    # Append history item
    history_item = {
        "id": f"HIS-{txn_id}",
        "date": today_str,
        "serviceName": service_names,
        "staffName": client.assigned_staff_name or "Front Desk",
        "amount": grand_total,
        "status": "Paid"
    }
    
    if client.history is None:
        client.history = []
    client.history.append(history_item)
    flag_modified(client, "history")
    db.add(client)
        
    # 2. Decrement inventory where applicable
    for item in cart_items:
        service = None
        if "serviceId" in item:
            service_result = await db.execute(select(ServiceItem).where(ServiceItem.id == item["serviceId"]))
            service = service_result.scalars().first()

        # If it has mapped required inventory, deduct mapped items
        if service and getattr(service, "required_inventory", None):
            for req in service.required_inventory:
                inv_item_id = req.get("inventory_item_id")
                qty_used = req.get("quantity_used", 1)
                
                # Retrieve the branch inventory item
                inv_query = select(InventoryItem).where(InventoryItem.id == inv_item_id)
                if branch_id:
                    inv_query = inv_query.where(InventoryItem.branch_id == branch_id)
                inv_query = inv_query.with_for_update()
                
                inv_result = await db.execute(inv_query)
                inv_item = inv_result.scalars().first()
                
                if inv_item:
                    total_needed = qty_used * item["quantity"]
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
        else:
            # Fall back to legacy name-based match
            query = select(InventoryItem).where(InventoryItem.item_name.ilike(f"%{item['name']}%"))
            if branch_id:
                query = query.where(InventoryItem.branch_id == branch_id)
            query = query.with_for_update()
                
            inv_result = await db.execute(query)
            inv_item = inv_result.scalars().first()
            if inv_item:
                if inv_item.quantity < item["quantity"]:
                    raise Exception(
                        f"Insufficient stock for '{item['name']}' at this branch. "
                        f"Available: {inv_item.quantity}, Requested: {item['quantity']}"
                    )
                inv_item.quantity -= item["quantity"]
                db.add(inv_item)
                
                # Trigger automated stock alerts
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

    current_time_str = datetime.now().strftime("%I:%M %p")

    # 3. Create the FinancialTransaction record
    transaction = FinancialTransaction(
        id=txn_id,
        invoice_id=invoice_id,
        client_name=client_name,
        service_name=service_names,
        amount=subtotal,
        discount=discount,
        tax=tax,
        tax_percent=tax_percent,
        grand_total=grand_total,
        date=today_str,
        time=current_time_str,
        payment_method=payment_method,
        status="Paid",
        items=[{
            "name": item["name"],
            "price": item["price"],
            "quantity": item["quantity"]
        } for item in cart_items],
        card_last_four=card_last_four,
        card_type=card_type,
        bank_txn_id=bank_txn_id,
        branch_id=branch_id
    )
    db.add(transaction)
    
    await db.commit()
    await db.refresh(transaction)
    return transaction
