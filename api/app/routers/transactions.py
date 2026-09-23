from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_admin_user, get_staff_user, get_admin_or_partner_user
from app.models.transaction import FinancialTransaction
from app.schemas.transaction import FinancialTransactionResponse, FinancialTransactionUpdate

router = APIRouter()

@router.get("", response_model=List[FinancialTransactionResponse])
async def list_transactions(
    search: Optional[str] = None,
    branch_id: Optional[str] = None,
    skip: Optional[int] = None,
    limit: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user)
):
    query = select(FinancialTransaction)
    if search:
        query = query.where(FinancialTransaction.client_name.ilike(f"%{search}%") | FinancialTransaction.invoice_id.ilike(f"%{search}%"))
    if branch_id:
        query = query.where(FinancialTransaction.branch_id == branch_id)
        
    query = query.order_by(FinancialTransaction.id.desc())
    if skip is not None:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{id_or_invoice_id}", response_model=FinancialTransactionResponse)
async def get_transaction(
    id_or_invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user) # staff can view transaction for printing receipt
):
    result = await db.execute(
        select(FinancialTransaction).where(
            (FinancialTransaction.id == id_or_invoice_id) | (FinancialTransaction.invoice_id == id_or_invoice_id)
        )
    )
    transaction = result.scalars().first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@router.put("/{transaction_id}", response_model=FinancialTransactionResponse)
async def update_transaction(
    transaction_id: str,
    transaction_in: FinancialTransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    result = await db.execute(select(FinancialTransaction).where(FinancialTransaction.id == transaction_id))
    db_transaction = result.scalars().first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    from datetime import datetime
    from sqlalchemy.orm.attributes import flag_modified

    old_grand_total = db_transaction.grand_total or 0.0
    old_rem_due = db_transaction.remaining_due or 0.0
    old_amount_paid = db_transaction.amount_paid if db_transaction.amount_paid is not None else old_grand_total

    update_data = transaction_in.model_dump(exclude_unset=True)
    update_reason = update_data.pop("update_reason", None)

    changes = {}
    for field, value in update_data.items():
        old_val = getattr(db_transaction, field, None)
        if old_val != value:
            changes[field] = {"from": str(old_val), "to": str(value)}
            setattr(db_transaction, field, value)

    if changes:
        if db_transaction.audit_logs is None:
            db_transaction.audit_logs = []
        audit_entry = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M:%S %p"),
            "updated_by": getattr(current_user, "email", "Admin"),
            "changes": changes,
            "reason": update_reason or "Administrative update"
        }
        db_transaction.audit_logs.append(audit_entry)
        flag_modified(db_transaction, "audit_logs")
        
    db.add(db_transaction)

    # Sync remaining_due, payment_status, and client balances when grand_total, amount_paid, or status changes
    status_voided = "status" in update_data and update_data["status"] in ("Cancelled", "Refunded") and changes.get("status", {}).get("from") not in ("Cancelled", "Refunded")

    if "grand_total" in update_data or "amount_paid" in update_data or status_voided:
        if status_voided:
            db_transaction.remaining_due = 0.0
            db_transaction.payment_status = update_data["status"]
            due_diff = -old_rem_due
            paid_diff = -old_amount_paid
        else:
            was_fully_paid = (old_rem_due == 0) or (old_amount_paid >= old_grand_total) or (db_transaction.status == "Paid")

            if "amount_paid" not in update_data and "grand_total" in update_data:
                if was_fully_paid:
                    db_transaction.amount_paid = db_transaction.grand_total
                else:
                    db_transaction.amount_paid = min(db_transaction.grand_total, old_amount_paid)
            
            db_transaction.remaining_due = max(0.0, round((db_transaction.grand_total or 0.0) - (db_transaction.amount_paid or 0.0), 2))
            db_transaction.payment_status = "Paid" if db_transaction.remaining_due == 0 else ("Partial" if (db_transaction.amount_paid or 0) > 0 else "Unpaid")
            if db_transaction.status not in ("Refunded", "Cancelled"):
                db_transaction.status = "Paid" if db_transaction.remaining_due == 0 else "Pending"

            due_diff = db_transaction.remaining_due - old_rem_due
            paid_diff = (db_transaction.amount_paid or 0.0) - old_amount_paid

        from app.models.client import Client
        from sqlalchemy.orm.attributes import flag_modified
        client = None
        if getattr(db_transaction, "client_id", None):
            c_res = await db.execute(select(Client).where(Client.id == db_transaction.client_id))
            client = c_res.scalars().first()
        if not client and db_transaction.client_name:
            c_res = await db.execute(select(Client).where(Client.name.ilike(db_transaction.client_name)))
            client = c_res.scalars().first()

        if client:
            client.total_spent = max(0.0, (client.total_spent or 0.0) + paid_diff)
            client.outstanding_balance = max(0.0, (client.outstanding_balance or 0.0) + due_diff)
            if client.history:
                for h in client.history:
                    if h.get("id") == f"HIS-{db_transaction.id}":
                        h["amount"] = 0.0 if status_voided else db_transaction.amount_paid
                        h["grandTotal"] = 0.0 if status_voided else db_transaction.grand_total
                        h["due"] = 0.0 if status_voided else db_transaction.remaining_due
                        h["status"] = db_transaction.payment_status
                flag_modified(client, "history")
            db.add(client)

    await db.commit()
    await db.refresh(db_transaction)
    
    try:
        from app.routers.bootstrap import invalidate_bootstrap_cache
        invalidate_bootstrap_cache()
    except Exception:
        pass

    return db_transaction


