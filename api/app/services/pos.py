from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.client import Client
from app.models.transaction import FinancialTransaction
from app.models.notification import NotificationItem
from app.models.inventory import InventoryItem
from app.models.service import ServiceItem

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
    branch_id: str = None
) -> FinancialTransaction:
    # Compute totals
    subtotal = sum(item["price"] * item["quantity"] for item in cart_items)
    discount = (subtotal * discount_percent) / 100.0
    taxable = subtotal - discount
    tax = (taxable * tax_percent) / 100.0
    grand_total = round(taxable + tax, 2)
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # Generate Invoice ID
    # Query current count of transactions efficiently using count
    count_stmt = select(func.count()).select_from(FinancialTransaction)
    txn_count_result = await db.execute(count_stmt)
    txn_count = txn_count_result.scalar() or 0
    
    invoice_id = f"INV-{datetime.now().year}-{str(txn_count + 1).zfill(3)}"
    txn_id = f"TXN-{900 + txn_count + 1}"
    
    # 1. Update client totals and history (creating client on the fly if needed)
    client_result = await db.execute(select(Client).where(Client.name.ilike(client_name)))
    client = client_result.scalars().first()
    
    service_names = ", ".join(item["name"] for item in cart_items)
    
    if not client:
        count_result = await db.execute(select(Client))
        count = len(count_result.scalars().all())
        client_id = f"CLT-{800 + count + 1}"
        client = Client(
            id=client_id,
            name=client_name,
            phone="0000000000",
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

    client.visits_count += 1
    client.total_spent += grand_total
    
    # Append history item
    history_item = {
        "id": f"HIS-{txn_id}",
        "date": today_str,
        "serviceName": service_names,
        "staffName": client.assigned_staff_name or "Front Desk",
        "amount": grand_total,
        "status": "Paid"
    }
    
    client.history.append(history_item)
    db.add(client)
        
    # 2. Decrement inventory where applicable
    # We check if any inventory item matches the name of services in the cart
    for item in cart_items:
        query = select(InventoryItem).where(InventoryItem.item_name.ilike(f"%{item['name']}%"))
        if branch_id:
            query = query.where(InventoryItem.branch_id == branch_id)
            
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
                    time="Just now",
                    type="inventory",
                    read=False
                )
                db.add(stock_alert)

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
