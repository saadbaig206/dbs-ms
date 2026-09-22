from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm.attributes import flag_modified
from pydantic import Field

from app.core.deps import get_db, get_staff_user, get_admin_user, get_user_branch_id
from app.services.pos import checkout
from app.models.transaction import FinancialTransaction
from app.models.client import Client
from app.models.inventory import InventoryItem
from app.models.service import ServiceItem
from app.models.package import ClientPackage
from app.models.appointment import Appointment
from app.schemas.transaction import FinancialTransactionResponse, TransactionRefundInput, InvoiceLineItemSchema
from app.schemas.base import CamelModel

router = APIRouter()

class POSCheckoutPayload(CamelModel):
    client_name: str
    payment_method: str
    discount_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    tax_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    cart_items: List[dict] # [{serviceId, name, price, quantity, category, isProduct, inventoryItemId}]
    card_last_four: Optional[str] = None
    card_type: Optional[str] = None
    bank_txn_id: Optional[str] = None
    branch_id: Optional[str] = None
    client_phone: Optional[str] = None
    client_id: Optional[str] = None
    client_time: Optional[str] = None
    client_date: Optional[str] = None
    amount_paid: Optional[float] = Field(default=None, ge=0.0)
    remaining_due: Optional[float] = Field(default=None, ge=0.0)
    cash_received: Optional[float] = Field(default=None, ge=0.0)
    cash_returned: Optional[float] = Field(default=None, ge=0.0)
    payment_splits: Optional[List[dict]] = None
    package_id: Optional[str] = None
    appointment_id: Optional[str] = None

@router.post("/checkout", response_model=FinancialTransactionResponse)
async def pos_checkout(
    payload: POSCheckoutPayload,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    try:
        # 1. Card slip validation: enforce terminal receipt reference to prevent theft disguised as card transactions
        has_card = (payload.payment_method == "Card") or (payload.payment_splits and any(s.get("method") == "Card" for s in payload.payment_splits))
        if has_card and (not payload.bank_txn_id or not str(payload.bank_txn_id).strip()):
            raise HTTPException(
                status_code=400,
                detail="Card payments require POS terminal reference / Bank Transaction ID (Slip No) to prevent unverified card tender."
            )

        # 2. Staff discount limit: non-admin cashiers cannot apply >20% discount without admin supervisor
        user_role = getattr(current_user, "role", "")
        if payload.discount_percent > 20.0 and user_role != "admin":
            raise HTTPException(
                status_code=403,
                detail="Discounts exceeding 20% require Admin supervisor override."
            )

        active_branch = user_branch_id or payload.branch_id
        is_admin_user = (user_role == "admin")

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
            branch_id=active_branch,
            client_phone=payload.client_phone,
            client_id=payload.client_id,
            client_time=payload.client_time,
            client_date=payload.client_date,
            amount_paid=payload.amount_paid,
            remaining_due=payload.remaining_due,
            cash_received=payload.cash_received,
            cash_returned=payload.cash_returned,
            payment_splits=payload.payment_splits,
            package_id=payload.package_id,
            appointment_id=payload.appointment_id,
            is_admin=is_admin_user
        )

        try:
            from app.routers.bootstrap import invalidate_bootstrap_cache
            invalidate_bootstrap_cache()
        except Exception:
            pass
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/transactions/{transaction_id}/refund", response_model=FinancialTransactionResponse)
async def refund_pos_transaction(
    transaction_id: str,
    payload: TransactionRefundInput,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    stmt = select(FinancialTransaction).where(FinancialTransaction.id == transaction_id)
    res = await db.execute(stmt)
    txn = res.scalars().first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if txn.status == "Refunded" or txn.payment_status == "Refunded":
        raise HTTPException(status_code=400, detail="Transaction has already been fully refunded")

    items_to_process = payload.items_to_refund if payload.items_to_refund else (txn.items or [])
    is_partial = bool(payload.items_to_refund and len(payload.items_to_refund) < len(txn.items or []))

    # 1. Restock Inventory if requested
    if payload.restock_inventory and items_to_process:
        for item in items_to_process:
            qty = int(item.get("quantity", 1))
            if item.get("isProduct"):
                # Restock direct product in branch
                inv_stmt = select(InventoryItem).where(InventoryItem.item_name == item.get("name"))
                if txn.branch_id:
                    inv_stmt = inv_stmt.where(InventoryItem.branch_id == txn.branch_id)
                inv_res = await db.execute(inv_stmt)
                inv_item = inv_res.scalars().first()
                if inv_item:
                    inv_item.quantity += qty
                    db.add(inv_item)
            else:
                # Restock service recipe consumables if configured
                srv_res = await db.execute(select(ServiceItem).where(ServiceItem.name == item.get("name")))
                service = srv_res.scalars().first()
                if service and getattr(service, "required_inventory", None):
                    for req in service.required_inventory:
                        inv_id = req.get("inventory_item_id")
                        used_per_service = req.get("quantity_used", 1)
                        total_restore = used_per_service * qty
                        inv_stmt = select(InventoryItem).where(InventoryItem.id == inv_id)
                        if txn.branch_id:
                            inv_stmt = inv_stmt.where(InventoryItem.branch_id == txn.branch_id)
                        inv_res = await db.execute(inv_stmt)
                        inv_item = inv_res.scalars().first()
                        if inv_item:
                            inv_item.quantity += total_restore
                            db.add(inv_item)

    # 2. Calculate refund amounts
    if is_partial:
        # Sum retail subtotal of refunded items
        refund_raw_subtotal = sum(float(it.get("price", 0.0)) * int(it.get("quantity", 1)) for it in items_to_process)
        eff_disc_factor = 1.0 - ((txn.discount or 0.0) / (txn.amount or 1.0) if txn.amount else 0.0)
        eff_tax_factor = 1.0 + ((txn.tax_percent or 0.0) / 100.0)
        refund_gross = round(refund_raw_subtotal * eff_disc_factor * eff_tax_factor, 2)
        
        # Split between paid and remaining due
        paid_available = txn.amount_paid or 0.0
        refund_paid = min(paid_available, refund_gross)
        refund_due = max(0.0, refund_gross - refund_paid)
        refund_due = min(refund_due, txn.remaining_due or 0.0)
    else:
        refund_paid = txn.amount_paid or 0.0
        refund_due = txn.remaining_due or 0.0

    # 3. Revert Client Totals & Outstanding Dues
    client = None
    if getattr(txn, "client_id", None):
        c_res = await db.execute(select(Client).where(Client.id == txn.client_id))
        client = c_res.scalars().first()
    if not client and txn.client_name:
        c_res = await db.execute(select(Client).where(Client.name == txn.client_name))
        client = c_res.scalars().first()

    if client:
        client.total_spent = max(0.0, (client.total_spent or 0.0) - refund_paid)
        deduct_due = min(client.outstanding_balance or 0.0, refund_due)
        client.outstanding_balance = max(0.0, (client.outstanding_balance or 0.0) - deduct_due)
        if client.history is None:
            client.history = []
        client.history.append({
            "id": f"REF-{txn.id}-{int(datetime.now().timestamp())}",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "serviceName": f"Refund: {', '.join([it.get('name', 'Item') for it in items_to_process])}",
            "staffName": getattr(current_user, "name", None) or getattr(current_user, "email", "Admin"),
            "amount": -refund_paid,
            "grandTotal": -(refund_paid + refund_due),
            "due": -refund_due,
            "status": "Partial Refund" if is_partial else "Refunded"
        })
        flag_modified(client, "history")
        db.add(client)

    # 4. Revoke linked package(s) if created by this transaction
    pkg_stmts = select(ClientPackage).where(
        (ClientPackage.id == txn.package_id) |
        (ClientPackage.notes.like(f"%{txn.id}%")) |
        (ClientPackage.notes.like(f"%{txn.invoice_id}%"))
    )
    pkg_res = await db.execute(pkg_stmts)
    revoked_pkgs = pkg_res.scalars().all()
    for pkg in revoked_pkgs:
        pkg.status = "Revoked"
        pkg.remaining_sessions = 0
        if "Revoked due to refund" not in (pkg.notes or ""):
            pkg.notes = (pkg.notes or "") + f" | Revoked due to refund of {txn.id}"
        db.add(pkg)

    # 5. Update linked appointment if exists
    apt_res = await db.execute(select(Appointment).where(Appointment.transaction_id == txn.id))
    linked_apt = apt_res.scalars().first()
    if linked_apt:
        linked_apt.payment_status = "Refunded"
        db.add(linked_apt)

    # 6. Update transaction status, grand_total, and audit log
    if is_partial:
        refund_total = round(refund_paid + refund_due, 2)
        txn.grand_total = max(0.0, round((txn.grand_total or 0.0) - refund_total, 2))
        txn.amount_paid = max(0.0, round((txn.amount_paid or 0.0) - refund_paid, 2))
        txn.remaining_due = max(0.0, round((txn.remaining_due or 0.0) - refund_due, 2))
        txn.status = "Partial Refund"
        txn.payment_status = "Partial Refund" if txn.amount_paid > 0 else "Refunded"

        if txn.items:
            refunded_names = set(it.get("name") for it in items_to_process)
            updated_items = []
            for it in txn.items:
                it_copy = dict(it)
                if it_copy.get("name") in refunded_names:
                    it_copy["refunded"] = True
                updated_items.append(it_copy)
            txn.items = updated_items
            flag_modified(txn, "items")
    else:
        txn.amount_paid = 0.0
        txn.remaining_due = 0.0
        txn.status = "Refunded"
        txn.payment_status = "Refunded"

    refund_log = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
        "action": "Refund" if not is_partial else "Partial Refund",
        "user": getattr(current_user, "name", None) or getattr(current_user, "email", "admin"),
        "reason": payload.reason,
        "restocked": payload.restock_inventory,
        "amount_refunded": refund_paid,
        "due_cancelled": refund_due,
        "items_refunded": [it.get("name") for it in items_to_process]
    }
    if txn.audit_logs is None:
        txn.audit_logs = []
    txn.audit_logs.append(refund_log)
    flag_modified(txn, "audit_logs")

    db.add(txn)
    await db.commit()
    await db.refresh(txn)

    try:
        from app.routers.bootstrap import invalidate_bootstrap_cache
        invalidate_bootstrap_cache()
    except Exception:
        pass

    return txn

@router.post("/transactions/{transaction_id}/reprint")
async def reprint_pos_transaction(
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    stmt = select(FinancialTransaction).where(FinancialTransaction.id == transaction_id)
    res = await db.execute(stmt)
    txn = res.scalars().first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    txn.reprint_count = (txn.reprint_count or 0) + 1
    reprint_log = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
        "action": "Reprint",
        "user": getattr(current_user, "name", None) or getattr(current_user, "email", "staff"),
        "reprint_count": txn.reprint_count
    }
    if txn.audit_logs is None:
        txn.audit_logs = []
    txn.audit_logs.append(reprint_log)
    flag_modified(txn, "audit_logs")

    db.add(txn)
    await db.commit()
    await db.refresh(txn)

    return {
        "id": txn.id,
        "invoiceId": txn.invoice_id,
        "reprintCount": txn.reprint_count
    }
