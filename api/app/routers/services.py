from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user, get_admin_user
from app.models.service import ServiceItem
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse

router = APIRouter()

@router.get("", response_model=List[ServiceResponse])
async def list_services(
    search: Optional[str] = None,
    category: Optional[str] = None,
    branch_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    query = select(ServiceItem)
    if search:
        query = query.where(ServiceItem.name.ilike(f"%{search}%") | ServiceItem.description.ilike(f"%{search}%"))
    if category:
        query = query.where(ServiceItem.category == category)
        
    result = await db.execute(query.order_by(ServiceItem.id.desc()))
    services = result.scalars().all()
    
    if branch_id:
        from app.models.inventory import InventoryItem
        inv_result = await db.execute(select(InventoryItem).where(InventoryItem.branch_id == branch_id))
        inventory_map = {item.id: item.quantity for item in inv_result.scalars().all()}
        
        for service in services:
            if service.required_inventory:
                out_of_stock = False
                for req in service.required_inventory:
                    req_id = req.get("inventory_item_id")
                    req_qty = req.get("quantity_used", 1)
                    available_qty = inventory_map.get(req_id, 0)
                    if available_qty < req_qty:
                        out_of_stock = True
                        break
                if out_of_stock:
                    service.status = "Out of Stock"
                    
    return services

@router.post("", response_model=ServiceResponse)
async def create_service(
    service_in: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    count_result = await db.execute(select(ServiceItem))
    count = len(count_result.scalars().all())
    service_id = f"SRV-{str(count + 1).zfill(2)}"
    
    db_service = ServiceItem(
        id=service_id,
        name=service_in.name,
        category=service_in.category,
        price=service_in.price,
        duration_minutes=service_in.duration_minutes,
        assigned_staff_ids=service_in.assigned_staff_ids,
        assigned_staff_names=service_in.assigned_staff_names,
        status=service_in.status,
        image=service_in.image,
        description=service_in.description
    )
    db.add(db_service)
    await db.commit()
    await db.refresh(db_service)
    return db_service

@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    service_in: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    result = await db.execute(select(ServiceItem).where(ServiceItem.id == service_id))
    db_service = result.scalars().first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
        
    update_data = service_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_service, field, value)
        
    db.add(db_service)
    await db.commit()
    await db.refresh(db_service)
    return db_service
