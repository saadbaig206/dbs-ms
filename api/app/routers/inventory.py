from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user, get_admin_user
from app.models.inventory import InventoryItem
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse

router = APIRouter()

@router.get("", response_model=List[InventoryResponse])
async def list_inventory(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    query = select(InventoryItem)
    if search:
        query = query.where(InventoryItem.item_name.ilike(f"%{search}%") | InventoryItem.supplier.ilike(f"%{search}%"))
        
    result = await db.execute(query.order_by(InventoryItem.id.desc()))
    return result.scalars().all()

@router.post("", response_model=InventoryResponse)
async def create_inventory_item(
    item_in: InventoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    count_result = await db.execute(select(InventoryItem))
    count = len(count_result.scalars().all())
    item_id = f"INV-{str(count + 1).zfill(2)}"
    
    db_item = InventoryItem(
        id=item_id,
        item_name=item_in.item_name,
        category=item_in.category,
        quantity=item_in.quantity,
        min_stock=item_in.min_stock,
        supplier=item_in.supplier,
        price=item_in.price,
        last_restocked=item_in.last_restocked
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=InventoryResponse)
async def update_inventory_item(
    item_id: str,
    item_in: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
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
    return db_item

@router.patch("/{item_id}/quantity", response_model=InventoryResponse)
async def adjust_quantity(
    item_id: str,
    delta: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    db_item.quantity = max(0, db_item.quantity + delta)
    if delta > 0:
        db_item.last_restocked = datetime.now().strftime("%Y-%m-%d")
        
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item
