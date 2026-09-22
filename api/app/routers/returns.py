import secrets
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from app.core.deps import get_db, get_admin_or_partner_user, get_user_branch_id
from app.models.purchase_return import PurchaseReturn
from app.models.purchase import PurchaseBill
from app.models.inventory import InventoryItem
from app.models.transaction import FinancialTransaction
from app.schemas.purchase_return import PurchaseReturnCreate, PurchaseReturnResponse
from app.routers.bootstrap import invalidate_bootstrap_cache

router = APIRouter()

@router.get("", response_model=List[PurchaseReturnResponse])
async def list_returns(
    vendor_name: Optional[str] = None,
    branch_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    """List all Return to Vendor (RTV) orders and Debit Notes."""
    query = select(PurchaseReturn)
    active_branch = user_branch_id or branch_id
    if active_branch:
        query = query.where(or_(PurchaseReturn.branch_id == active_branch, PurchaseReturn.branch_id == None))
    if vendor_name:
        query = query.where(PurchaseReturn.vendor_name.ilike(f"%{vendor_name}%"))

    query = query.order_by(PurchaseReturn.date.desc(), PurchaseReturn.id.desc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("", response_model=PurchaseReturnResponse)
async def create_purchase_return(
    return_in: PurchaseReturnCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    """Process a Return to Vendor (RTV), decrement inventory units, and issue an official Debit Note."""
    if not return_in.items:
        raise HTTPException(status_code=400, detail="Return must include at least one item")

    active_branch = user_branch_id or return_in.branch_id
    today_str = return_in.date or datetime.now().strftime("%Y-%m-%d")
    suffix = secrets.token_hex(2).upper()
    rtv_id = f"RTV-{datetime.now().year}-{suffix}"
    debit_note_no = f"DN-{datetime.now().year}-{suffix}"

    total_refund = sum(item.quantity * item.unit_cost for item in return_in.items)

    # 0. Pre-validate that all returned products exist and have sufficient stock
    for item in return_in.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Return quantity for '{item.item_name}' must be greater than zero.")
        if item.unit_cost < 0:
            raise HTTPException(status_code=400, detail=f"Unit cost for '{item.item_name}' cannot be negative.")
        
        inv_query = select(InventoryItem).where(InventoryItem.item_name.ilike(item.item_name))
        if active_branch:
            inv_query = inv_query.where(InventoryItem.branch_id == active_branch)
        inv_res = await db.execute(inv_query)
        inv_item = inv_res.scalars().first()
        if not inv_item:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot return '{item.item_name}': Product not found in branch inventory."
            )
        if (inv_item.quantity or 0) < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot return {item.quantity} units of '{item.item_name}'. Only {inv_item.quantity or 0} units available in stock."
            )

    # 1. Decrement inventory for returned products
    items_snapshot = []
    for item in return_in.items:
        line_cost = item.quantity * item.unit_cost
        items_snapshot.append({
            "item_name": item.item_name,
            "quantity": item.quantity,
            "unit_cost": item.unit_cost,
            "total_cost": line_cost,
            "batch_number": item.batch_number or "N/A",
            "reason": item.reason or return_in.reason or "Stock Return"
        })

        inv_query = select(InventoryItem).where(InventoryItem.item_name.ilike(item.item_name))
        if active_branch:
            inv_query = inv_query.where(InventoryItem.branch_id == active_branch)
        
        inv_res = await db.execute(inv_query.with_for_update())
        inv_item = inv_res.scalars().first()
        if inv_item:
            inv_item.quantity = max(0, (inv_item.quantity or 0) - item.quantity)
            db.add(inv_item)

    # 2. If settlement is Deduct_From_Payable, reduce vendor bills
    if return_in.settlement_type == "Deduct_From_Payable":
        bills_res = await db.execute(
            select(PurchaseBill).where(
                PurchaseBill.vendor_name.ilike(return_in.vendor_name),
                PurchaseBill.remaining_due > 0
            ).order_by(PurchaseBill.date.asc())
        )
        unpaid_bills = bills_res.scalars().all()
        rem_to_offset = total_refund
        for b in unpaid_bills:
            if rem_to_offset <= 0:
                break
            deduction = min(b.remaining_due, rem_to_offset)
            b.remaining_due = max(0.0, b.remaining_due - deduction)
            b.total_amount = max(0.0, b.total_amount - deduction)
            if b.remaining_due == 0:
                b.payment_status = "Paid"
            b.notes = f"{b.notes or ''} | Debit Note {debit_note_no} applied (Stock return): -Rs. {deduction}".strip(" |")
            db.add(b)
            rem_to_offset -= deduction

    # 3. If settlement is Cash_Refund, record cash drawer inflow transaction
    if return_in.settlement_type == "Cash_Refund" and total_refund > 0:
        txn_id = f"TXN-RTV-{secrets.token_hex(2).upper()}"
        inv_id = f"INV-RTV-{datetime.now().year}-{secrets.token_hex(2).upper()}"
        rtv_txn = FinancialTransaction(
            id=txn_id,
            invoice_id=inv_id,
            client_name=f"Vendor Refund: {return_in.vendor_name}",
            service_name=f"Vendor Return Cash Recovery ({debit_note_no})",
            transaction_type="Vendor_Refund",
            amount=total_refund,
            discount=0.0,
            tax=0.0,
            tax_percent=0.0,
            grand_total=total_refund,
            amount_paid=total_refund,
            remaining_due=0.0,
            payment_status="Paid",
            date=today_str,
            time=datetime.now().strftime("%I:%M %p"),
            payment_method="Cash",
            status="Paid",
            items=[{
                "name": f"Return Cash Recovery: {item.item_name}",
                "price": float(item.unit_cost or 0),
                "quantity": int(item.quantity or 1)
            } for item in return_in.items],
            branch_id=active_branch,
            audit_logs=[]
        )
        db.add(rtv_txn)

    creator = getattr(current_user, 'email', 'Admin/Partner')

    # 4. Create Debit Note record
    db_return = PurchaseReturn(
        id=rtv_id,
        debit_note_number=debit_note_no,
        vendor_name=return_in.vendor_name,
        branch_id=active_branch,
        date=today_str,
        items=items_snapshot,
        total_refund_amount=total_refund,
        settlement_type=return_in.settlement_type,
        status="Completed",
        reason=return_in.reason or "Goods Returned to Vendor",
        approved_by=creator,
        notes=return_in.notes
    )
    db.add(db_return)

    await db.commit()
    await db.refresh(db_return)
    invalidate_bootstrap_cache()

    return db_return
