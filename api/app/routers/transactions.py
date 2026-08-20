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
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user)
):
    query = select(FinancialTransaction)
    if search:
        query = query.where(FinancialTransaction.client_name.ilike(f"%{search}%") | FinancialTransaction.invoice_id.ilike(f"%{search}%"))
    if branch_id:
        query = query.where(FinancialTransaction.branch_id == branch_id)
        
    result = await db.execute(query.order_by(FinancialTransaction.id.desc()))
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
    current_user = Depends(get_admin_or_partner_user)
):
    result = await db.execute(select(FinancialTransaction).where(FinancialTransaction.id == transaction_id))
    db_transaction = result.scalars().first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    update_data = transaction_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_transaction, field, value)
        
    db.add(db_transaction)
    await db.commit()
    await db.refresh(db_transaction)
    return db_transaction

