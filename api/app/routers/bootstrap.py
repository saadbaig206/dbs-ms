import time
import asyncio
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from app.core.deps import get_db, get_current_user, get_user_branch_id
from app.db.session import SessionLocal
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

# In-memory bootstrap cache (TTL 60 seconds)
_BOOTSTRAP_CACHE: Dict[str, Any] = {}
_BOOTSTRAP_CACHE_EXPIRY: Dict[str, float] = {}

def invalidate_bootstrap_cache():
    global _BOOTSTRAP_CACHE, _BOOTSTRAP_CACHE_EXPIRY
    _BOOTSTRAP_CACHE.clear()
    _BOOTSTRAP_CACHE_EXPIRY.clear()

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

async def fetch_item(stmt, schema_cls=None) -> list:
    """Execute a query on its own isolated session from the connection pool for true parallel execution."""
    if not SessionLocal:
        return []
    try:
        async with SessionLocal() as session:
            res = await session.execute(stmt)
            records = res.scalars().all()
            if schema_cls:
                return [safe_dump(r, schema_cls) for r in records]
            return records
    except Exception as exc:
        print(f"Bootstrap parallel query error: {exc}")
        return []

@router.get("", response_model=Dict[str, Any])
async def get_bootstrap_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user_branch_id: Optional[str] = Depends(get_user_branch_id)
):
    role = current_user.role
    cache_key = f"{current_user.id}:{role}:{user_branch_id or 'all'}"
    now = time.time()

    # Serve from in-memory cache if fresh (< 60s)
    if cache_key in _BOOTSTRAP_CACHE and now < _BOOTSTRAP_CACHE_EXPIRY.get(cache_key, 0):
        return _BOOTSTRAP_CACHE[cache_key]

    user_info = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "branch_id": getattr(current_user, "_cached_branch_id", None)
    }

    # True Parallel Fetching using SessionLocal pool
    if SessionLocal:
        # Common parallel tasks
        branches_task = fetch_item(select(Branch), BranchResponse)
        staff_task = fetch_item(select(Staff), StaffResponse)
        services_task = fetch_item(select(ServiceItem), ServiceResponse)

        c_query = select(Client)
        if user_branch_id:
            c_query = c_query.where(or_(Client.branch_id == user_branch_id, Client.branch_id == None))
        clients_task = fetch_item(c_query.order_by(Client.id.desc()), ClientResponse)

        a_query = select(Appointment)
        if user_branch_id:
            a_query = a_query.where(or_(Appointment.branch_id == user_branch_id, Appointment.branch_id == None))
        appointments_task = fetch_item(a_query.order_by(Appointment.id.desc()), AppointmentResponse)

        i_query = select(InventoryItem)
        if user_branch_id:
            i_query = i_query.where(or_(InventoryItem.branch_id == user_branch_id, InventoryItem.branch_id == None))
        inventory_task = fetch_item(i_query, InventoryResponse)

        # Cap attendance to 100 recent entries for rapid serialization
        att_query = select(AttendanceRecord).order_by(AttendanceRecord.date.desc(), AttendanceRecord.id.desc()).limit(100)
        attendance_task = fetch_item(att_query, AttendanceResponse)

        # Cap notifications to 50 recent (filter inventory for partner)
        notif_query = select(NotificationItem)
        if role == "partner":
            notif_query = notif_query.where(NotificationItem.type != "inventory")
        notif_query = notif_query.order_by(NotificationItem.id.desc()).limit(50)
        notifications_task = fetch_item(notif_query, NotificationResponse)

        task_names = ["branches", "staff", "services", "clients", "appointments", "inventory", "attendance", "notifications"]
        tasks = [branches_task, staff_task, services_task, clients_task, appointments_task, inventory_task, attendance_task, notifications_task]

        # Role-gated tasks (Staff never queries expenses, transactions, or partners)
        if role in ("admin", "partner"):
            e_query = select(ExpenseItem)
            if user_branch_id:
                e_query = e_query.where(ExpenseItem.branch_id == user_branch_id)
            task_names.append("expenses")
            tasks.append(fetch_item(e_query.order_by(ExpenseItem.id.desc()), ExpenseResponse))

            t_query = select(FinancialTransaction)
            if user_branch_id:
                t_query = t_query.where(FinancialTransaction.branch_id == user_branch_id)
            task_names.append("transactions")
            tasks.append(fetch_item(t_query.order_by(FinancialTransaction.id.desc()), FinancialTransactionResponse))

        if role == "admin":
            async def fetch_partners():
                try:
                    async with SessionLocal() as s:
                        p_res = await s.execute(select(User).where(User.role == "partner"))
                        return [{"id": u.id, "username": u.email} for u in p_res.scalars().all()]
                except Exception:
                    return []
            task_names.append("partners")
            tasks.append(fetch_partners())

        gathered = await asyncio.gather(*tasks)
        result_map = dict(zip(task_names, gathered))

        payload = {
            "user": user_info,
            "branches": result_map.get("branches", []),
            "staff": result_map.get("staff", []),
            "services": result_map.get("services", []),
            "clients": result_map.get("clients", []),
            "appointments": result_map.get("appointments", []),
            "inventory": result_map.get("inventory", []),
            "attendance": result_map.get("attendance", []),
            "notifications": result_map.get("notifications", []),
            "expenses": result_map.get("expenses", []),
            "transactions": result_map.get("transactions", []),
            "partners": result_map.get("partners", [])
        }
    else:
        # Fallback sequential execution if pool is not configured
        try:
            b_res = await db.execute(select(Branch))
            branches = [safe_dump(b, BranchResponse) for b in b_res.scalars().all()]
        except Exception:
            branches = []

        try:
            s_res = await db.execute(select(Staff))
            staff = [safe_dump(s, StaffResponse) for s in s_res.scalars().all()]
        except Exception:
            staff = []

        try:
            srv_res = await db.execute(select(ServiceItem))
            services = [safe_dump(s, ServiceResponse) for s in srv_res.scalars().all()]
        except Exception:
            services = []

        try:
            c_query = select(Client)
            if user_branch_id:
                c_query = c_query.where(or_(Client.branch_id == user_branch_id, Client.branch_id == None))
            c_res = await db.execute(c_query.order_by(Client.id.desc()))
            clients = [safe_dump(c, ClientResponse) for c in c_res.scalars().all()]
        except Exception:
            clients = []

        try:
            a_query = select(Appointment)
            if user_branch_id:
                a_query = a_query.where(or_(Appointment.branch_id == user_branch_id, Appointment.branch_id == None))
            a_res = await db.execute(a_query.order_by(Appointment.id.desc()))
            appointments = [safe_dump(a, AppointmentResponse) for a in a_res.scalars().all()]
        except Exception:
            appointments = []

        try:
            i_query = select(InventoryItem)
            if user_branch_id:
                i_query = i_query.where(or_(InventoryItem.branch_id == user_branch_id, InventoryItem.branch_id == None))
            i_res = await db.execute(i_query)
            inventory = [safe_dump(i, InventoryResponse) for i in i_res.scalars().all()]
        except Exception:
            inventory = []

        try:
            att_res = await db.execute(select(AttendanceRecord).order_by(AttendanceRecord.date.desc(), AttendanceRecord.id.desc()).limit(100))
            attendance = [safe_dump(att, AttendanceResponse) for att in att_res.scalars().all()]
        except Exception:
            attendance = []

        try:
            notif_query = select(NotificationItem)
            if role == "partner":
                notif_query = notif_query.where(NotificationItem.type != "inventory")
            notif_res = await db.execute(notif_query.order_by(NotificationItem.id.desc()).limit(50))
            notifications = [safe_dump(n, NotificationResponse) for n in notif_res.scalars().all()]
        except Exception:
            notifications = []

        expenses = []
        if role in ("admin", "partner"):
            try:
                e_query = select(ExpenseItem)
                if user_branch_id:
                    e_query = e_query.where(ExpenseItem.branch_id == user_branch_id)
                e_res = await db.execute(e_query.order_by(ExpenseItem.id.desc()))
                expenses = [safe_dump(e, ExpenseResponse) for e in e_res.scalars().all()]
            except Exception:
                expenses = []

        transactions = []
        if role in ("admin", "partner"):
            try:
                t_query = select(FinancialTransaction)
                if user_branch_id:
                    t_query = t_query.where(FinancialTransaction.branch_id == user_branch_id)
                t_res = await db.execute(t_query.order_by(FinancialTransaction.id.desc()))
                transactions = [safe_dump(t, FinancialTransactionResponse) for t in t_res.scalars().all()]
            except Exception:
                transactions = []

        partners = []
        if role == "admin":
            try:
                p_res = await db.execute(select(User).where(User.role == "partner"))
                partners = [{"id": u.id, "username": u.email} for u in p_res.scalars().all()]
            except Exception:
                partners = []

        payload = {
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

    _BOOTSTRAP_CACHE[cache_key] = payload
    _BOOTSTRAP_CACHE_EXPIRY[cache_key] = now + 60.0

    return payload
