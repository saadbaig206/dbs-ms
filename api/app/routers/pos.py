from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_staff_user
from app.services.pos import checkout
from app.schemas.transaction import FinancialTransactionResponse, InvoiceLineItemSchema
from app.schemas.base import CamelModel

router = APIRouter()

class POSCheckoutPayload(CamelModel):
    client_name: str
    payment_method: str
    discount_percent: float = 0.0
    tax_percent: float = 0.0
    cart_items: List[dict] # [{serviceId, name, price, quantity, category}]
    card_last_four: Optional[str] = None
    card_type: Optional[str] = None
    bank_txn_id: Optional[str] = None
    branch_id: Optional[str] = None

@router.post("/checkout", response_model=FinancialTransactionResponse)
async def pos_checkout(
    payload: POSCheckoutPayload,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    try:
        transaction = await checkout(
            db=db,
            client_name=payload.client_name,
            payment_method=payload.payment_method,
            discount_percent=payload.discount_percent,
            tax_percent=payload.tax_percent,
            cart_items=payload.cart_items,
            card_last_four=payload.card_last_four,
            card_type=payload.card_type,
            bank_txn_id=payload.bank_txn_id,
            branch_id=payload.branch_id
        )
        return transaction
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
