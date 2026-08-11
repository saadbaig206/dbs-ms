from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.expense import ExpenseItem
from app.models.staff import Staff

def get_current_month_label() -> str:
    # Returns e.g. "August 2026"
    return datetime.now().strftime("%B %Y")

async def sync_staff_salary_expense(db: AsyncSession, member: Staff):
    month_label = get_current_month_label()
    title = f"Salary - {member.name} ({month_label})"
    
    # Query for an existing pending Salary expense for this staff member
    result = await db.execute(
        select(ExpenseItem).where(
            ExpenseItem.staff_id == member.id,
            ExpenseItem.category == "Salary",
            ExpenseItem.status == "Pending"
        )
    )
    existing_expense = result.scalars().first()
    
    if member.status != "Active":
        # If no longer active, remove any pending salary expense
        if existing_expense:
            await db.delete(existing_expense)
            await db.commit()
        return

    # If active, we ensure a pending salary expense exists and matches their salary
    today_str = datetime.now().strftime("%Y-%m-%d")
    if existing_expense:
        existing_expense.amount = member.salary
        existing_expense.title = title
        existing_expense.date = today_str
    else:
        new_expense = ExpenseItem(
            id=f"EXP-SAL-{member.id}",
            title=title,
            category="Salary",
            amount=member.salary,
            date=today_str,
            status="Pending",
            payment_method="Bank Transfer",
            notes=f"Monthly salary for {member.role}",
            staff_id=member.id
        )
        db.add(new_expense)
    
    await db.commit()

async def remove_expenses_by_staff_id(db: AsyncSession, staff_id: str):
    result = await db.execute(
        select(ExpenseItem).where(
            ExpenseItem.staff_id == staff_id,
            ExpenseItem.category == "Salary"
        )
    )
    expenses = result.scalars().all()
    for expense in expenses:
        await db.delete(expense)
    await db.commit()
