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
    bank_txn_id: str = None
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
    
    # 1. Update client totals and history if they exist
    client_result = await db.execute(select(Client).where(Client.name == client_name))
    client = client_result.scalars().first()
    
    service_names = ", ".join(item["name"] for item in cart_items)
    
    if client:
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
        
        # Handle mutable JSON field modification detection
        new_history = list(client.history or [])
        new_history.append(history_item)
        client.history = new_history
        db.add(client)
        
    # 2. Decrement inventory where applicable
    # We check if any inventory item matches the name of services in the cart
    for item in cart_items:
        inv_result = await db.execute(
            select(InventoryItem).where(InventoryItem.item_name.ilike(f"%{item['name']}%"))
        )
        inv_item = inv_result.scalars().first()
        if inv_item:
            inv_item.quantity = max(0, inv_item.quantity - item["quantity"])
            db.add(inv_item)

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
        bank_txn_id=bank_txn_id
    )
    db.add(transaction)
    
    # 4. Create Notification
    notification = NotificationItem(
        id=f"NOT-{int(datetime.now().timestamp() * 1000)}",
        title=f"Payment Received (Rs. {grand_total})",
        message=f"Invoice {invoice_id} processed via {payment_method} for {client_name}.",
        time="Just now",
        type="payment",
        read=False
    )
    db.add(notification)
    
    await db.commit()
    await db.refresh(transaction)
    return transaction
