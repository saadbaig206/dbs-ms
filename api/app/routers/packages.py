import secrets
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user, get_admin_user, get_user_branch_id
from app.models.package import ClientPackage, PackageRedemptionLog
from app.models.transaction import FinancialTransaction
from app.schemas.package import (
    ClientPackageCreate,
    ClientPackageResponse,
    PackageRedemptionInput,
    PackageRedemptionResponse
)
from app.routers.bootstrap import invalidate_bootstrap_cache

router = APIRouter()

@router.get("", response_model=List[ClientPackageResponse])
@router.get("/", response_model=List[ClientPackageResponse], include_in_schema=False)
async def list_packages(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    """List client prepaid treatment packages."""
    query = select(ClientPackage)
    if client_id:
        query = query.where(ClientPackage.client_id == client_id)
    if status:
        query = query.where(ClientPackage.status == status)
    
    query = query.order_by(ClientPackage.purchase_date.desc(), ClientPackage.id.desc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("", response_model=ClientPackageResponse)
@router.post("/", response_model=ClientPackageResponse, include_in_schema=False)
async def create_package(
    pkg_in: ClientPackageCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    """Enroll a client into a multi-session treatment package (Admin only)."""
    pkg_id = f"PKG-{datetime.now().year}-{secrets.token_hex(2).upper()}"
    today_str = pkg_in.purchase_date or datetime.now().strftime("%Y-%m-%d")
    exp_year = datetime.now().year + 1
    default_exp = datetime.now().replace(year=exp_year).strftime("%Y-%m-%d")
    pkg_exp = pkg_in.expiry_date or default_exp
    price_per = round(pkg_in.total_amount_paid / max(1, pkg_in.total_sessions), 2)
    active_branch = user_branch_id or pkg_in.branch_id

    db_pkg = ClientPackage(
        id=pkg_id,
        client_id=pkg_in.client_id,
        client_name=pkg_in.client_name,
        package_name=pkg_in.package_name,
        service_id=pkg_in.service_id,
        total_sessions=pkg_in.total_sessions,
        used_sessions=0,
        remaining_sessions=pkg_in.total_sessions,
        total_amount_paid=pkg_in.total_amount_paid,
        price_per_session=price_per,
        status="Active",
        branch_id=active_branch,
        purchase_date=today_str,
        expiry_date=pkg_exp,
        notes=pkg_in.notes
    )
    db.add(db_pkg)
    await db.commit()
    await db.refresh(db_pkg)
    invalidate_bootstrap_cache()
    return db_pkg

@router.post("/{package_id}/redeem", response_model=PackageRedemptionResponse)
async def redeem_package_session(
    package_id: str,
    redeem_in: PackageRedemptionInput,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    """Redeem one prepaid session from an active package, zeroing the charge and printing a receipt."""
    res = await db.execute(select(ClientPackage).where(ClientPackage.id == package_id))
    pkg = res.scalars().first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    if pkg.status != "Active":
        raise HTTPException(status_code=400, detail=f"Package is not active (Status: {pkg.status})")
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    if pkg.expiry_date and today_str > pkg.expiry_date:
        raise HTTPException(status_code=400, detail=f"Package expired on {pkg.expiry_date} and can no longer be redeemed")

    if pkg.remaining_sessions <= 0:
        raise HTTPException(status_code=400, detail="All sessions for this package have already been redeemed")

    session_num = pkg.used_sessions + 1
    pkg.used_sessions = session_num
    pkg.remaining_sessions = max(0, pkg.total_sessions - session_num)
    if pkg.remaining_sessions == 0:
        pkg.status = "Completed"

    db.add(pkg)

    today_str = datetime.now().strftime("%Y-%m-%d")
    current_time_str = datetime.now().strftime("%I:%M %p")
    rdm_id = f"RDM-{secrets.token_hex(3).upper()}"

    # 1. Log Redemption
    log = PackageRedemptionLog(
        id=rdm_id,
        package_id=pkg.id,
        client_name=pkg.client_name,
        session_number=session_num,
        date=today_str,
        time=current_time_str,
        staff_name=redeem_in.staff_name or "Clinical Staff",
        notes=redeem_in.notes or f"Session {session_num} of {pkg.total_sessions}"
    )
    db.add(log)

    # Deduct consumable inventory if mapped to underlying service
    if pkg.service_id:
        from app.models.service import ServiceItem
        from app.models.inventory import InventoryItem
        from app.models.notification import NotificationItem
        
        srv_res = await db.execute(select(ServiceItem).where(ServiceItem.id == pkg.service_id))
        service = srv_res.scalars().first()
        if service and getattr(service, "required_inventory", None):
            b_id = pkg.branch_id or user_branch_id
            for req in service.required_inventory:
                inv_item_id = req.get("inventory_item_id")
                qty_used = req.get("quantity_used", 1)
                
                inv_query = select(InventoryItem).where(InventoryItem.id == inv_item_id)
                if b_id:
                    inv_query = inv_query.where(InventoryItem.branch_id == b_id)
                inv_query = inv_query.with_for_update()
                
                inv_result = await db.execute(inv_query)
                inv_item = inv_result.scalars().first()
                if inv_item:
                    if inv_item.quantity < qty_used:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Cannot redeem session: Insufficient stock for consumable '{inv_item.item_name}' (Available: {inv_item.quantity}, Required: {qty_used})"
                        )
                    inv_item.quantity -= qty_used
                    db.add(inv_item)
                    
                    if inv_item.quantity <= inv_item.min_stock:
                        alert_id = f"NOT-INV-{int(datetime.now().timestamp() * 1000)}"
                        stock_alert = NotificationItem(
                            id=alert_id,
                            title=f"Low Stock Alert: {inv_item.item_name}",
                            message=f"Stock for '{inv_item.item_name}' has fallen to {inv_item.quantity} (Min threshold: {inv_item.min_stock}). Please restock.",
                            time=datetime.now().strftime("%Y-%m-%d %I:%M %p"),
                            type="inventory",
                            read=False
                        )
                        db.add(stock_alert)

    # 2. Record Zero-Charge Financial Transaction for printing official receipt
    txn_id = f"TXN-PKG-{secrets.token_hex(3).upper()}"
    inv_id = f"INV-PKG-{datetime.now().year}-{secrets.token_hex(2).upper()}"
    txn = FinancialTransaction(
        id=txn_id,
        invoice_id=inv_id,
        client_id=pkg.client_id,
        client_name=pkg.client_name,
        service_name=f"{pkg.package_name} (Session {session_num}/{pkg.total_sessions})",
        transaction_type="Package_Redemption",
        amount=0.0,
        discount=0.0,
        tax=0.0,
        tax_percent=0.0,
        grand_total=0.0,
        amount_paid=0.0,
        remaining_due=0.0,
        payment_status="Paid",
        date=today_str,
        time=current_time_str,
        payment_method="Package Credit",
        status="Paid",
        package_id=pkg.id,
        items=[{
            "name": f"{pkg.package_name} - Session {session_num} of {pkg.total_sessions} (Prepaid)",
            "price": 0.0,
            "quantity": 1
        }],
        branch_id=pkg.branch_id or user_branch_id,
        audit_logs=[]
    )
    db.add(txn)

    await db.commit()
    invalidate_bootstrap_cache()

    return PackageRedemptionResponse(
        id=log.id,
        package_id=log.package_id,
        client_name=log.client_name,
        session_number=log.session_number,
        date=log.date,
        time=log.time,
        staff_name=log.staff_name,
        notes=log.notes
    )
