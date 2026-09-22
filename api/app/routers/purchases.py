import secrets
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from app.core.deps import get_db, get_admin_or_partner_user, get_user_branch_id
from app.models.purchase import PurchaseBill, PurchaseItem
from app.models.inventory import InventoryItem
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseBillResponse,
    PurchaseItemResponse,
    PurchasePaymentInput
)
from app.routers.bootstrap import invalidate_bootstrap_cache

router = APIRouter()

@router.get("/items", response_model=List[PurchaseItemResponse])
async def list_purchase_items(
    search: Optional[str] = None,
    branch_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    """List purchased products individually with their specific unit costs and vendors."""
    query = select(PurchaseItem)
    active_branch = user_branch_id or branch_id
    if active_branch:
        query = query.where(or_(PurchaseItem.branch_id == active_branch, PurchaseItem.branch_id == None))
    if search:
        pattern = f"%{search}%"
        query = query.where(
            PurchaseItem.item_name.ilike(pattern) |
            PurchaseItem.vendor_name.ilike(pattern) |
            PurchaseItem.category.ilike(pattern)
        )
    if start_date:
        query = query.where(PurchaseItem.date >= start_date)
    if end_date:
        query = query.where(PurchaseItem.date <= end_date)

    query = query.order_by(PurchaseItem.date.desc(), PurchaseItem.id.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/bills", response_model=List[PurchaseBillResponse])
@router.get("/bills/", response_model=List[PurchaseBillResponse], include_in_schema=False)
async def list_purchase_bills(
    search: Optional[str] = None,
    branch_id: Optional[str] = None,
    payment_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    """List purchase orders / bills by vendor."""
    query = select(PurchaseBill)
    active_branch = user_branch_id or branch_id
    if active_branch:
        query = query.where(or_(PurchaseBill.branch_id == active_branch, PurchaseBill.branch_id == None))
    if search:
        pattern = f"%{search}%"
        query = query.where(
            PurchaseBill.vendor_name.ilike(pattern) |
            PurchaseBill.bill_number.ilike(pattern) |
            PurchaseBill.id.ilike(pattern)
        )
    if payment_status:
        query = query.where(PurchaseBill.payment_status == payment_status)

    query = query.order_by(PurchaseBill.date.desc(), PurchaseBill.id.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=PurchaseBillResponse)
@router.post("/", response_model=PurchaseBillResponse, include_in_schema=False)
@router.post("/bills", response_model=PurchaseBillResponse, include_in_schema=False)
async def create_purchase(
    purchase_in: PurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    """Record a vendor purchase order with multiple products, adding each item individually and updating inventory."""
    if not purchase_in.items:
        raise HTTPException(status_code=400, detail="A purchase must have at least one product item.")

    active_branch = user_branch_id or purchase_in.branch_id
    suffix = secrets.token_hex(2).upper()
    bill_id = f"PUR-{datetime.now().year}-{suffix}"
    
    total_amount = sum(item.unit_cost * item.quantity for item in purchase_in.items)
    
    if purchase_in.payment_status == "Paid":
        amount_paid = total_amount
        remaining_due = 0.0
    elif purchase_in.payment_status == "Pending":
        amount_paid = 0.0
        remaining_due = total_amount
    else: # Partial
        amount_paid = min(total_amount, purchase_in.amount_paid or 0.0)
        remaining_due = max(0.0, total_amount - amount_paid)

    creator_identifier = getattr(current_user, 'email', 'Admin/Partner')

    # 1. Create Purchase Bill
    db_bill = PurchaseBill(
        id=bill_id,
        vendor_name=purchase_in.vendor_name,
        bill_number=purchase_in.bill_number or f"BILL-{suffix}",
        date=purchase_in.date,
        total_amount=total_amount,
        amount_paid=amount_paid,
        remaining_due=remaining_due,
        payment_method=purchase_in.payment_method,
        payment_status=purchase_in.payment_status,
        notes=purchase_in.notes,
        branch_id=active_branch,
        created_by=creator_identifier
    )
    db.add(db_bill)

    # 2. Add individual items & synchronize Inventory
    today_str = purchase_in.date or datetime.now().strftime("%Y-%m-%d")
    
    for idx, item in enumerate(purchase_in.items):
        item_id = f"PIT-{suffix}-{idx + 1}"
        item_total = item.unit_cost * item.quantity

        db_item = PurchaseItem(
            id=item_id,
            purchase_id=bill_id,
            vendor_name=purchase_in.vendor_name,
            item_name=item.item_name,
            category=item.category,
            unit_cost=item.unit_cost,
            quantity=item.quantity,
            total_cost=item_total,
            batch_number=item.batch_number,
            expiry_date=item.expiry_date,
            date=today_str,
            branch_id=active_branch
        )
        db.add(db_item)

        # Inventory Auto-Sync
        inv_query = select(InventoryItem).where(
            InventoryItem.item_name.ilike(item.item_name)
        )
        if active_branch:
            inv_query = inv_query.where(InventoryItem.branch_id == active_branch)
        
        inv_res = await db.execute(inv_query)
        inv_item = inv_res.scalars().first()

        if inv_item:
            inv_item.quantity = (inv_item.quantity or 0) + item.quantity
            if item.selling_price and item.selling_price > 0:
                inv_item.price = item.selling_price
            inv_item.last_restocked = today_str
            inv_item.supplier = purchase_in.vendor_name
            db.add(inv_item)
        else:
            new_inv_id = f"INV-{secrets.token_hex(3).upper()}"
            retail_price = item.selling_price if (item.selling_price and item.selling_price > 0) else item.unit_cost
            new_inv = InventoryItem(
                id=new_inv_id,
                item_name=item.item_name,
                category=item.category or "Products",
                quantity=item.quantity,
                min_stock=5,
                supplier=purchase_in.vendor_name,
                price=retail_price,
                last_restocked=today_str,
                branch_id=active_branch
            )
            db.add(new_inv)

    # If upfront payment made on bill creation, log ExpenseItem
    if amount_paid > 0:
        from app.models.expense import ExpenseItem
        exp_id = f"EXP-PUR-{secrets.token_hex(3).upper()}"
        exp_item = ExpenseItem(
            id=exp_id,
            title=f"Vendor Bill Payment: {purchase_in.vendor_name} ({db_bill.bill_number or bill_id})",
            category="Inventory Purchase",
            amount=amount_paid,
            actual_amount=amount_paid,
            amount_paid=amount_paid,
            remaining_amount=0.0,
            date=today_str,
            status="Paid",
            payment_method=purchase_in.payment_method or "Cash",
            vendor_name=purchase_in.vendor_name,
            branch_id=active_branch,
            added_by=creator_identifier,
            paid_by=creator_identifier,
            notes=f"Initial payment on Purchase Bill {bill_id}."
        )
        db.add(exp_item)

    await db.commit()
    await db.refresh(db_bill)
    invalidate_bootstrap_cache()
    return db_bill

@router.post("/bills/{bill_id}/pay", response_model=PurchaseBillResponse)
async def pay_vendor_bill(
    bill_id: str,
    payment_in: PurchasePaymentInput,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user)
):
    """Settle full or partial outstanding due on a vendor purchase bill with expense tracking."""
    res = await db.execute(select(PurchaseBill).where(PurchaseBill.id == bill_id))
    bill = res.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Purchase bill not found")

    if payment_in.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than 0")

    current_due = bill.remaining_due if bill.remaining_due is not None else max(0.0, bill.total_amount - (bill.amount_paid or 0.0))
    if current_due <= 0:
        raise HTTPException(status_code=400, detail="Purchase bill is already fully settled")

    if payment_in.amount > current_due:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount (Rs. {payment_in.amount}) cannot exceed outstanding due (Rs. {current_due})"
        )

    new_paid = (bill.amount_paid or 0.0) + payment_in.amount
    new_due = max(0.0, bill.total_amount - new_paid)
    bill.amount_paid = new_paid
    bill.remaining_due = new_due
    bill.payment_status = "Paid" if new_due == 0 else "Partial"
    bill.payment_method = payment_in.payment_method

    today_str = datetime.now().strftime("%Y-%m-%d")
    now_str = datetime.now().strftime("%Y-%m-%d %I:%M %p")
    note_line = f"Paid Rs. {payment_in.amount} via {payment_in.payment_method} on {now_str}"
    if payment_in.notes:
        note_line += f" ({payment_in.notes})"
    bill.notes = f"{bill.notes or ''} | {note_line}".strip(" |")
    db.add(bill)

    # Log ExpenseItem to ensure Treasury cash flow & P&L reflect inventory cash-out
    from app.models.expense import ExpenseItem
    exp_id = f"EXP-PUR-{secrets.token_hex(3).upper()}"
    exp_item = ExpenseItem(
        id=exp_id,
        title=f"Vendor Bill Payment: {bill.vendor_name} ({bill.bill_number or bill.id})",
        category="Inventory Purchase",
        amount=payment_in.amount,
        actual_amount=payment_in.amount,
        amount_paid=payment_in.amount,
        remaining_amount=0.0,
        date=today_str,
        status="Paid",
        payment_method=payment_in.payment_method or "Cash",
        vendor_name=bill.vendor_name,
        branch_id=bill.branch_id,
        added_by=getattr(current_user, "name", None) or getattr(current_user, "email", "Admin"),
        paid_by=getattr(current_user, "name", None) or getattr(current_user, "email", "Admin"),
        notes=f"Settlement payment for Purchase Bill {bill.id}. {payment_in.notes or ''}".strip()
    )
    db.add(exp_item)

    await db.commit()
    await db.refresh(bill)
    invalidate_bootstrap_cache()
    return bill
