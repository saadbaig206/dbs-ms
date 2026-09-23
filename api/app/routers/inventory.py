from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user, get_user_branch_id
from app.models.inventory import InventoryItem
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse

router = APIRouter()

@router.get("", response_model=List[InventoryResponse])
async def list_inventory(
    search: Optional[str] = None,
    branch_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    from sqlalchemy import or_
    query = select(InventoryItem)
    if search:
        query = query.where(InventoryItem.item_name.ilike(f"%{search}%") | InventoryItem.supplier.ilike(f"%{search}%"))
    if branch_id:
        query = query.where(or_(InventoryItem.branch_id == branch_id, InventoryItem.branch_id == None))
        
    result = await db.execute(query.order_by(InventoryItem.id.desc()))
    return result.scalars().all()

import secrets
from app.routers.bootstrap import invalidate_bootstrap_cache

@router.post("", response_model=InventoryResponse)
async def create_inventory_item(
    item_in: InventoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    item_id = f"INV-{secrets.token_hex(3).upper()}"
    
    db_item = InventoryItem(
        id=item_id,
        item_name=item_in.item_name,
        category=item_in.category,
        quantity=item_in.quantity,
        min_stock=item_in.min_stock,
        supplier=item_in.supplier,
        price=item_in.price,
        last_restocked=item_in.last_restocked,
        branch_id=item_in.branch_id
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    invalidate_bootstrap_cache()
    return db_item

@router.put("/{item_id}", response_model=InventoryResponse)
async def update_inventory_item(
    item_id: str,
    item_in: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    if current_user.role == "partner":
        raise HTTPException(status_code=403, detail="Partners cannot create or edit vendor stock")

    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
        
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    invalidate_bootstrap_cache()
    return db_item

@router.patch("/{item_id}/quantity", response_model=InventoryResponse)
async def adjust_quantity(
    item_id: str,
    delta: int,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    if current_user.role == "partner" and delta < 0:
        raise HTTPException(status_code=403, detail="Partners cannot reduce inventory stock")

    if delta < 0 and current_user.role != "admin" and not reason:
        raise HTTPException(status_code=400, detail="Stock reductions require an explanation/reason for audit tracking")

    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    if delta < 0 and abs(delta) > db_item.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reduce stock by {abs(delta)}. Only {db_item.quantity} units available for '{db_item.item_name}'."
        )

    db_item.quantity = max(0, db_item.quantity + delta)
    if delta > 0:
        db_item.last_restocked = datetime.now().strftime("%Y-%m-%d")
    elif delta < 0:
        from app.models.notification import NotificationItem
        adj_user = getattr(current_user, 'name', None) or getattr(current_user, 'email', 'Staff')
        adj_alert = NotificationItem(
            id=f"NOT-ADJ-{int(datetime.now().timestamp() * 1000)}",
            title=f"Stock Adjustment: {db_item.item_name} ({delta})",
            message=f"{adj_user} adjusted stock of '{db_item.item_name}' by {delta} units (New qty: {db_item.quantity}). Reason: {reason or 'Manual adjustment'}.",
            time=datetime.now().strftime("%Y-%m-%d %I:%M %p"),
            type="inventory",
            read=False
        )
        db.add(adj_alert)
        
    db.add(db_item)
    
    # Trigger low stock alert
    if db_item.quantity <= db_item.min_stock:
        from app.models.notification import NotificationItem
        alert_id = f"NOT-INV-{int(datetime.now().timestamp() * 1000)}"
        stock_alert = NotificationItem(
            id=alert_id,
            title=f"Low Stock Alert: {db_item.item_name}",
            message=f"Stock for '{db_item.item_name}' has fallen to {db_item.quantity} (Min threshold: {db_item.min_stock}). Please restock.",
            time=datetime.now().strftime("%Y-%m-%d %I:%M %p"),
            type="inventory",
            read=False
        )
        db.add(stock_alert)
        
    await db.commit()
    await db.refresh(db_item)
    invalidate_bootstrap_cache()
    return db_item

