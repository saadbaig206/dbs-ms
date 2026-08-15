from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_admin_user, get_staff_user
from app.models.transaction import FinancialTransaction
from app.schemas.transaction import FinancialTransactionResponse

router = APIRouter()

@router.get("", response_model=List[FinancialTransactionResponse])
async def list_transactions(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    query = select(FinancialTransaction)
    if search:
        query = query.where(FinancialTransaction.client_name.ilike(f"%{search}%") | FinancialTransaction.invoice_id.ilike(f"%{search}%"))
        
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
