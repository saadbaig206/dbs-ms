from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_db, get_admin_or_partner_user, get_user_branch_id
from app.models.expense import ExpenseItem
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse

router = APIRouter()

@router.get("", response_model=List[ExpenseResponse])
async def list_expenses(
    search: Optional[str] = None,
    branch_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    query = select(ExpenseItem)
    if search:
        query = query.where(ExpenseItem.title.ilike(f"%{search}%") | ExpenseItem.category.ilike(f"%{search}%"))
    active_branch_id = user_branch_id or branch_id
    if active_branch_id:
        query = query.where(ExpenseItem.branch_id == active_branch_id)
        
    result = await db.execute(query.order_by(ExpenseItem.id.desc()))
    return result.scalars().all()

@router.post("", response_model=ExpenseResponse)
async def create_expense(
    expense_in: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user)
):
    count_result = await db.execute(select(ExpenseItem))
    count = len(count_result.scalars().all())
    expense_id = f"EXP-{400 + count + 1}"
    
    db_expense = ExpenseItem(
        id=expense_id,
        title=expense_in.title,
        category=expense_in.category,
        amount=expense_in.amount,
        date=expense_in.date,
        status=expense_in.status,
        payment_method=expense_in.payment_method,
        notes=expense_in.notes,
        staff_id=expense_in.staff_id,
        branch_id=expense_in.branch_id
    )
    db.add(db_expense)
    await db.commit()
    await db.refresh(db_expense)
    return db_expense

@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user)
):
    result = await db.execute(select(ExpenseItem).where(ExpenseItem.id == expense_id))
    db_expense = result.scalars().first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    await db.delete(db_expense)
    await db.commit()
    return {"message": "Expense deleted successfully"}

@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    expense_in: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_or_partner_user)
):
    result = await db.execute(select(ExpenseItem).where(ExpenseItem.id == expense_id))
    db_expense = result.scalars().first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    update_data = expense_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_expense, field, value)
        
    db.add(db_expense)
    await db.commit()
    await db.refresh(db_expense)
    return db_expense
