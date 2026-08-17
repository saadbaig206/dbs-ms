from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_staff_user, get_admin_user
from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse

router = APIRouter()

@router.get("", response_model=List[BranchResponse])
async def list_branches(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_staff_user)
):
    query = select(Branch)
    result = await db.execute(query.order_by(Branch.id.asc()))
    return result.scalars().all()

@router.post("", response_model=BranchResponse)
async def create_branch(
    branch_in: BranchCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    # Find next ID
    result = await db.execute(select(Branch))
    existing = result.scalars().all()
    next_num = len(existing) + 1
    branch_id = f"BR-{str(next_num).zfill(3)}"

    db_branch = Branch(
        id=branch_id,
        name=branch_in.name,
        location=branch_in.location,
        phone=branch_in.phone,
        latitude=branch_in.latitude,
        longitude=branch_in.longitude
    )
    db.add(db_branch)
    await db.commit()
    await db.refresh(db_branch)
    return db_branch

@router.put("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: str,
    branch_in: BranchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    result = await db.execute(select(Branch).where(Branch.id == branch_id))
    db_branch = result.scalars().first()
    if not db_branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )
    
    update_data = branch_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_branch, key, value)
        
    db.add(db_branch)
    await db.commit()
    await db.refresh(db_branch)
    return db_branch

@router.delete("/{branch_id}")
async def delete_branch(
    branch_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    result = await db.execute(select(Branch).where(Branch.id == branch_id))
    db_branch = result.scalars().first()
    if not db_branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )
    
    # Nullify references in related tables to prevent foreign key errors or orphans
    from app.models.staff import Staff
    from app.models.appointment import Appointment
    from app.models.transaction import FinancialTransaction
    from app.models.inventory import InventoryItem
    from app.models.expense import ExpenseItem
    
    await db.execute(update(Staff).where(Staff.branch_id == branch_id).values(branch_id=None))
    await db.execute(update(Appointment).where(Appointment.branch_id == branch_id).values(branch_id=None))
    await db.execute(update(FinancialTransaction).where(FinancialTransaction.branch_id == branch_id).values(branch_id=None))
    await db.execute(update(InventoryItem).where(InventoryItem.branch_id == branch_id).values(branch_id=None))
    await db.execute(update(ExpenseItem).where(ExpenseItem.branch_id == branch_id).values(branch_id=None))

    await db.delete(db_branch)
    await db.commit()
    return {"message": "Branch deleted successfully"}
