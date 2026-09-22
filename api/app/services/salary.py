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
    month_token = datetime.now().strftime("%Y%m")
    expense_id = f"EXP-SAL-{member.id}-{month_token}"
    
    if existing_expense:
        existing_expense.amount = member.salary
        existing_expense.title = title
        existing_expense.date = today_str
    else:
        # Check if an expense with this month's ID already exists (e.g. paid earlier this month)
        check_res = await db.execute(select(ExpenseItem).where(ExpenseItem.id == expense_id))
        if not check_res.scalars().first():
            new_expense = ExpenseItem(
                id=expense_id,
                title=title,
                category="Salary",
                amount=member.salary,
                date=today_str,
                status="Pending",
                payment_method="Bank Transfer",
                notes=f"Monthly salary for {member.role}",
                staff_id=member.id,
                branch_id=member.branch_id
            )
            db.add(new_expense)
    
    await db.commit()

async def remove_expenses_by_staff_id(db: AsyncSession, staff_id: str):
    # CRITICAL: Only delete pending salary expenses. NEVER purge historical Paid salaries!
    result = await db.execute(
        select(ExpenseItem).where(
            ExpenseItem.staff_id == staff_id,
            ExpenseItem.category == "Salary",
            ExpenseItem.status == "Pending"
        )
    )
    expenses = result.scalars().all()
    for expense in expenses:
        await db.delete(expense)
    await db.commit()

