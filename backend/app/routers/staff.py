from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user, get_admin_user
from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse
from app.services.salary import sync_staff_salary_expense, remove_expenses_by_staff_id

router = APIRouter()

@router.get("", response_model=List[StaffResponse])
async def list_staff(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    query = select(Staff)
    if search:
        query = query.where(Staff.name.ilike(f"%{search}%") | Staff.role.ilike(f"%{search}%"))
    
    result = await db.execute(query.order_by(Staff.id.desc()))
    return result.scalars().all()

@router.post("", response_model=StaffResponse)
async def create_staff_member(
    staff_in: StaffCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    # Auto-generate ID
    count_result = await db.execute(select(Staff))
    count = len(count_result.scalars().all())
    staff_id = f"STF-{100 + count + 1}"
    
    db_staff = Staff(
        id=staff_id,
        photo=staff_in.photo,
        name=staff_in.name,
        role=staff_in.role,
        salary=staff_in.salary,
        phone=staff_in.phone,
        email=staff_in.email,
        joining_date=staff_in.joining_date,
        status=staff_in.status,
        performance_rating=staff_in.performance_rating,
        assigned_services=staff_in.assigned_services,
        attendance_rate=staff_in.attendance_rate
    )
    db.add(db_staff)
    await db.commit()
    await db.refresh(db_staff)
    
    # Sync salary expense if Active
    if db_staff.status == "Active":
        await sync_staff_salary_expense(db, db_staff)
        
    return db_staff

@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff_member(
    staff_id: str,
    staff_in: StaffUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    db_staff = result.scalars().first()
    if not db_staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
        
    update_data = staff_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_staff, field, value)
        
    db.add(db_staff)
    await db.commit()
    await db.refresh(db_staff)
    
    # Sync salary expense based on status
    if db_staff.status == "Active":
        await sync_staff_salary_expense(db, db_staff)
    else:
        await remove_expenses_by_staff_id(db, staff_id)
        
    return db_staff

@router.delete("/{staff_id}")
async def delete_staff_member(
    staff_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    db_staff = result.scalars().first()
    if not db_staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
        
    await db.delete(db_staff)
    await remove_expenses_by_staff_id(db, staff_id)
    await db.commit()
    return {"message": "Staff member deleted successfully"}
