from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from app.core.deps import get_db, get_current_user, get_user_branch_id
from app.models.user import User
from app.models.branch import Branch
from app.models.staff import Staff
from app.models.service import ServiceItem
from app.models.client import Client
from app.models.appointment import Appointment
from app.models.inventory import InventoryItem
from app.models.attendance import AttendanceRecord
from app.models.notification import NotificationItem
from app.models.expense import ExpenseItem
from app.models.transaction import FinancialTransaction
from app.schemas.branch import BranchResponse
from app.schemas.staff import StaffResponse
from app.schemas.service import ServiceResponse
from app.schemas.client import ClientResponse
from app.schemas.appointment import AppointmentResponse
from app.schemas.inventory import InventoryResponse
from app.schemas.attendance import AttendanceResponse
from app.schemas.notification import NotificationResponse
from app.schemas.expense import ExpenseResponse
from app.schemas.transaction import FinancialTransactionResponse

router = APIRouter()

@router.get("", response_model=Dict[str, Any])
async def get_bootstrap_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    role = current_user.role
    
    # 1. Active User Info
    user_info = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "branch_id": getattr(current_user, "_cached_branch_id", None)
    }

    # 2. Branches
    branches_res = await db.execute(select(Branch))
    branches = [BranchResponse.model_validate(b).model_dump(by_alias=True) for b in branches_res.scalars().all()]

    # 3. Staff
    staff_res = await db.execute(select(Staff))
    staff = [StaffResponse.model_validate(s).model_dump(by_alias=True) for s in staff_res.scalars().all()]

    # 4. Services
    services_res = await db.execute(select(ServiceItem))
    services = [ServiceResponse.model_validate(s).model_dump(by_alias=True) for s in services_res.scalars().all()]

    # 5. Clients
    c_query = select(Client)
    if user_branch_id:
        c_query = c_query.where(or_(Client.branch_id == user_branch_id, Client.branch_id == None))
    clients_res = await db.execute(c_query.order_by(Client.id.desc()))
    clients = [ClientResponse.model_validate(c).model_dump(by_alias=True) for c in clients_res.scalars().all()]

    # 6. Appointments
    a_query = select(Appointment)
    if user_branch_id:
        a_query = a_query.where(or_(Appointment.branch_id == user_branch_id, Appointment.branch_id == None))
    appointments_res = await db.execute(a_query.order_by(Appointment.id.desc()))
    appointments = [AppointmentResponse.model_validate(a).model_dump(by_alias=True) for a in appointments_res.scalars().all()]

    # 7. Inventory
    i_query = select(InventoryItem)
    if user_branch_id:
        i_query = i_query.where(or_(InventoryItem.branch_id == user_branch_id, InventoryItem.branch_id == None))
    inventory_res = await db.execute(i_query)
    inventory = [InventoryResponse.model_validate(i).model_dump(by_alias=True) for i in inventory_res.scalars().all()]

    # 8. Attendance
    att_res = await db.execute(select(AttendanceRecord).order_by(AttendanceRecord.date.desc(), AttendanceRecord.id.desc()))
    attendance = [AttendanceResponse.model_validate(att).model_dump(by_alias=True) for att in att_res.scalars().all()]

    # 9. Notifications
    notif_res = await db.execute(select(NotificationItem).order_by(NotificationItem.id.desc()))
    notifications = [NotificationResponse.model_validate(n).model_dump(by_alias=True) for n in notif_res.scalars().all()]

    # 10. Expenses
    e_query = select(ExpenseItem)
    if user_branch_id:
        e_query = e_query.where(ExpenseItem.branch_id == user_branch_id)
    expenses_res = await db.execute(e_query.order_by(ExpenseItem.id.desc()))
    expenses = [ExpenseResponse.model_validate(e).model_dump(by_alias=True) for e in expenses_res.scalars().all()]

    # 11. Transactions (admin/partner only)
    transactions = []
    if role in ("admin", "partner"):
        t_query = select(FinancialTransaction)
        if user_branch_id:
            t_query = t_query.where(FinancialTransaction.branch_id == user_branch_id)
        transactions_res = await db.execute(t_query.order_by(FinancialTransaction.id.desc()))
        transactions = [FinancialTransactionResponse.model_validate(t).model_dump(by_alias=True) for t in transactions_res.scalars().all()]

    # 12. Partners (admin only)
    partners = []
    if role == "admin":
        p_res = await db.execute(select(User).where(User.role == "partner"))
        partners = [{"id": u.id, "username": u.email} for u in p_res.scalars().all()]

    return {
        "user": user_info,
        "branches": branches,
        "staff": staff,
        "services": services,
        "clients": clients,
        "appointments": appointments,
        "inventory": inventory,
        "attendance": attendance,
        "notifications": notifications,
        "expenses": expenses,
        "transactions": transactions,
        "partners": partners
    }
