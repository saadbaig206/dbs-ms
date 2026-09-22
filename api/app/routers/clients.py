from datetime import datetime
from typing import List, Optional
from pydantic import Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user, get_admin_user, get_user_branch_id
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse

router = APIRouter()

from sqlalchemy import or_

@router.get("", response_model=List[ClientResponse])
async def list_clients(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user),
    branch_id: Optional[str] = Depends(get_user_branch_id)
):
    query = select(Client)
    if branch_id:
        query = query.where(or_(Client.branch_id == branch_id, Client.branch_id == None))
    if search:
        query = query.where(Client.name.ilike(f"%{search}%") | Client.phone.ilike(f"%{search}%") | Client.cnic.ilike(f"%{search}%"))
        
    result = await db.execute(query.order_by(Client.id.desc()))
    return result.scalars().all()

import secrets

@router.post("", response_model=ClientResponse)
async def create_client(
    client_in: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    client_id = f"CLT-{secrets.token_hex(3).upper()}"
    
    db_client = Client(
        id=client_id,
        name=client_in.name,
        phone=client_in.phone,
        cnic=client_in.cnic,
        gender=client_in.gender,
        age=client_in.age,
        address=client_in.address,
        assigned_staff_id=client_in.assigned_staff_id,
        assigned_staff_name=client_in.assigned_staff_name,
        preferred_service=client_in.preferred_service,
        notes=client_in.notes,
        total_spent=0.0,
        visits_count=0,
        history=[],
        joined_date=datetime.now().strftime("%Y-%m-%d"),
        branch_id=user_branch_id or client_in.branch_id
    )
    db.add(db_client)
    await db.commit()
    await db.refresh(db_client)
    try:
        from app.routers.bootstrap import invalidate_bootstrap_cache
        invalidate_bootstrap_cache()
    except Exception:
        pass
    return db_client

@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    client_in: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user),
    branch_id: Optional[str] = Depends(get_user_branch_id)
):
    query = select(Client).where(Client.id == client_id)
    if branch_id:
        query = query.where(Client.branch_id == branch_id)
    result = await db.execute(query)
    db_client = result.scalars().first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    update_data = client_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "history" and value is not None:
            # Map list of schema to list of dict
            setattr(db_client, field, [item.model_dump() for item in value])
        else:
            setattr(db_client, field, value)
        
    db.add(db_client)
    await db.commit()
    await db.refresh(db_client)
    try:
        from app.routers.bootstrap import invalidate_bootstrap_cache
        invalidate_bootstrap_cache()
    except Exception:
        pass
    return db_client

from app.schemas.base import CamelModel
from app.models.transaction import FinancialTransaction
from sqlalchemy.orm.attributes import flag_modified

class ClientSettleDueInput(CamelModel):
    amount: float = Field(..., gt=0.0)
    payment_method: str = "Cash"
    bank_txn_id: Optional[str] = None
    notes: Optional[str] = None

@router.post("/{client_id}/settle-dues")
async def settle_client_dues(
    client_id: str,
    payload: ClientSettleDueInput,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    """Record an installment or full debt settlement payment for a client."""
    res = await db.execute(select(Client).where(Client.id == client_id))
    client = res.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    curr_balance = client.outstanding_balance or 0.0
    if curr_balance <= 0.0:
        raise HTTPException(status_code=400, detail="Client has no outstanding balance to settle.")

    if payload.amount > curr_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Settlement amount (Rs. {payload.amount}) cannot exceed current outstanding debt (Rs. {curr_balance})."
        )

    if payload.payment_method == "Card" and (not payload.bank_txn_id or not str(payload.bank_txn_id).strip()):
        raise HTTPException(status_code=400, detail="Card settlement payments require POS terminal reference / Bank Transaction ID.")

    pay_amount = payload.amount
    client.outstanding_balance = max(0.0, curr_balance - pay_amount)
    client.total_spent = (client.total_spent or 0.0) + pay_amount

    # Offset open unpaid invoices for this client in FIFO order
    unpaid_stmt = (
        select(FinancialTransaction)
        .where(
            FinancialTransaction.client_id == client.id,
            FinancialTransaction.remaining_due > 0,
            FinancialTransaction.transaction_type == "Sale"
        )
        .order_by(FinancialTransaction.date.asc(), FinancialTransaction.id.asc())
        .with_for_update()
    )
    unpaid_res = await db.execute(unpaid_stmt)
    unpaid_txns = unpaid_res.scalars().all()
    rem_to_offset = pay_amount
    for utxn in unpaid_txns:
        if rem_to_offset <= 0:
            break
        offset = min(utxn.remaining_due, rem_to_offset)
        utxn.remaining_due = max(0.0, round(utxn.remaining_due - offset, 2))
        utxn.amount_paid = round((utxn.amount_paid or 0.0) + offset, 2)
        if utxn.remaining_due == 0:
            utxn.payment_status = "Paid"
            utxn.status = "Paid"
        else:
            utxn.payment_status = "Partial"
        rem_to_offset -= offset
        db.add(utxn)

    today_str = datetime.now().strftime("%Y-%m-%d")
    current_time_str = datetime.now().strftime("%I:%M %p")
    suffix = secrets.token_hex(2).upper()
    txn_id = f"TXN-DUE-{suffix}"
    inv_id = f"INV-DUE-{datetime.now().year}-{suffix}"

    history_item = {
        "id": f"HIS-{txn_id}",
        "date": today_str,
        "serviceName": f"Debt Settlement ({payload.notes or 'Account Due'})",
        "staffName": getattr(current_user, 'name', None) or getattr(current_user, 'email', 'Front Desk'),
        "amount": pay_amount,
        "status": "Paid"
    }
    if client.history is None:
        client.history = []
    client.history.append(history_item)
    flag_modified(client, "history")
    db.add(client)

    # Financial Transaction entry for the receipt
    txn = FinancialTransaction(
        id=txn_id,
        invoice_id=inv_id,
        client_id=client.id,
        client_name=client.name,
        service_name="Client Debt Settlement",
        transaction_type="Debt_Settlement",
        amount=pay_amount,
        discount=0.0,
        tax=0.0,
        tax_percent=0.0,
        grand_total=pay_amount,
        amount_paid=pay_amount,
        remaining_due=0.0,
        payment_status="Paid",
        date=today_str,
        time=current_time_str,
        payment_method=payload.payment_method,
        bank_txn_id=payload.bank_txn_id,
        status="Paid",
        items=[{
            "name": f"Due Payment Settlement - Remaining Client Debt: Rs. {client.outstanding_balance}",
            "price": pay_amount,
            "quantity": 1
        }],
        branch_id=client.branch_id or user_branch_id,
        audit_logs=[]
    )
    db.add(txn)

    await db.commit()
    await db.refresh(client)
    try:
        from app.routers.bootstrap import invalidate_bootstrap_cache
        invalidate_bootstrap_cache()
    except Exception:
        pass

    return {
        "message": f"Successfully settled Rs. {pay_amount}. Remaining balance: Rs. {client.outstanding_balance}",
        "outstandingBalance": client.outstanding_balance,
        "transactionId": txn.id,
        "invoiceId": txn.invoice_id
    }

