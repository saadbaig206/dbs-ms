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

def safe_dump(obj, schema_cls):
    try:
        return schema_cls.model_validate(obj).model_dump(by_alias=True)
    except Exception:
        try:
            if hasattr(obj, '__dict__'):
                d = {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}
                return d
        except Exception:
            pass
        return {}

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
    try:
        branches_res = await db.execute(select(Branch))
        branches = [safe_dump(b, BranchResponse) for b in branches_res.scalars().all()]
    except Exception:
        branches = []

    # 3. Staff
    try:
        staff_res = await db.execute(select(Staff))
        staff = [safe_dump(s, StaffResponse) for s in staff_res.scalars().all()]
    except Exception:
        staff = []

    # 4. Services
    try:
        services_res = await db.execute(select(ServiceItem))
        services = [safe_dump(s, ServiceResponse) for s in services_res.scalars().all()]
    except Exception:
        services = []

    # 5. Clients
    try:
        c_query = select(Client)
        if user_branch_id:
            c_query = c_query.where(or_(Client.branch_id == user_branch_id, Client.branch_id == None))
        clients_res = await db.execute(c_query.order_by(Client.id.desc()))
        clients = [safe_dump(c, ClientResponse) for c in clients_res.scalars().all()]
    except Exception:
        clients = []

    # 6. Appointments
    try:
        a_query = select(Appointment)
        if user_branch_id:
            a_query = a_query.where(or_(Appointment.branch_id == user_branch_id, Appointment.branch_id == None))
        appointments_res = await db.execute(a_query.order_by(Appointment.id.desc()))
        appointments = [safe_dump(a, AppointmentResponse) for a in appointments_res.scalars().all()]
    except Exception:
        appointments = []

    # 7. Inventory
    try:
        i_query = select(InventoryItem)
        if user_branch_id:
            i_query = i_query.where(or_(InventoryItem.branch_id == user_branch_id, InventoryItem.branch_id == None))
        inventory_res = await db.execute(i_query)
        inventory = [safe_dump(i, InventoryResponse) for i in inventory_res.scalars().all()]
    except Exception:
        inventory = []

    # 8. Attendance
    try:
        att_res = await db.execute(select(AttendanceRecord).order_by(AttendanceRecord.date.desc(), AttendanceRecord.id.desc()))
        attendance = [safe_dump(att, AttendanceResponse) for att in att_res.scalars().all()]
    except Exception:
        attendance = []

    # 9. Notifications
    try:
        notif_res = await db.execute(select(NotificationItem).order_by(NotificationItem.id.desc()))
        notifications = [safe_dump(n, NotificationResponse) for n in notif_res.scalars().all()]
    except Exception:
        notifications = []

    # 10. Expenses
    try:
        e_query = select(ExpenseItem)
        if user_branch_id:
            e_query = e_query.where(ExpenseItem.branch_id == user_branch_id)
        expenses_res = await db.execute(e_query.order_by(ExpenseItem.id.desc()))
        expenses = [safe_dump(e, ExpenseResponse) for e in expenses_res.scalars().all()]
    except Exception:
        expenses = []

    # 11. Transactions (admin/partner only)
    transactions = []
    if role in ("admin", "partner"):
        try:
            t_query = select(FinancialTransaction)
            if user_branch_id:
                t_query = t_query.where(FinancialTransaction.branch_id == user_branch_id)
            transactions_res = await db.execute(t_query.order_by(FinancialTransaction.id.desc()))
            transactions = [safe_dump(t, FinancialTransactionResponse) for t in transactions_res.scalars().all()]
        except Exception:
            transactions = []

    # 12. Partners (admin only)
    partners = []
    if role == "admin":
        try:
            p_res = await db.execute(select(User).where(User.role == "partner"))
            partners = [{"id": u.id, "username": u.email} for u in p_res.scalars().all()]
        except Exception:
            partners = []

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
