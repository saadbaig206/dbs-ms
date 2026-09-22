from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.appointment import Appointment
from app.models.transaction import FinancialTransaction
from app.models.staff import Staff
from app.models.inventory import InventoryItem
from app.models.client import Client

async def get_dashboard_aggregates(db: AsyncSession, branch_id: str = None) -> dict:
    # 1. Total appointments count and status counts
    apt_query = select(Appointment)
    if branch_id:
        apt_query = apt_query.where(Appointment.branch_id == branch_id)
    apt_result = await db.execute(apt_query)
    appointments = apt_result.scalars().all()
    total_appointments = len(appointments)
    confirmed_appointments = sum(1 for a in appointments if a.status == "Confirmed")
    pending_appointments = sum(1 for a in appointments if a.status == "Pending")
    completed_appointments = sum(1 for a in appointments if a.status == "Completed")
    cancelled_appointments = sum(1 for a in appointments if a.status == "Cancelled")
    
    # 2. Total revenue (sum of active sales transactions, excluding Refunded, Cancelled, and Debt Settlements)
    txn_query = select(FinancialTransaction)
    if branch_id:
        txn_query = txn_query.where(FinancialTransaction.branch_id == branch_id)
    txn_result = await db.execute(txn_query)
    transactions = txn_result.scalars().all()
    active_txns = [
        t for t in transactions 
        if (t.status or '').lower() not in ('refunded', 'cancelled') 
        and getattr(t, 'transaction_type', 'Sale') != 'Debt_Settlement'
        and t.service_name != 'Client Debt Settlement'
    ]
    total_revenue = sum(t.grand_total for t in active_txns)
    
    # 3. Staff metrics
    staff_query = select(Staff)
    if branch_id:
        staff_query = staff_query.where(Staff.branch_id == branch_id)
    staff_result = await db.execute(staff_query)
    staff_list = staff_result.scalars().all()
    active_staff_count = sum(1 for s in staff_list if s.status == "Active")
    
    # 4. Inventory alerts
    inv_query = select(InventoryItem)
    if branch_id:
        inv_query = inv_query.where(InventoryItem.branch_id == branch_id)
    inv_result = await db.execute(inv_query)
    inventory_items = inv_result.scalars().all()
    low_stock_count = sum(1 for i in inventory_items if i.quantity <= i.min_stock)
    out_of_stock_count = sum(1 for i in inventory_items if i.quantity == 0)
    
    # 5. Client metrics
    client_query = select(Client)
    if branch_id:
        client_query = client_query.where(Client.branch_id == branch_id)
    client_result = await db.execute(client_query)
    clients = client_result.scalars().all()
    total_clients = len(clients)

    # 6. Monthly revenue breakdown (group active transactions by month/date)
    revenue_by_date = {}
    for t in active_txns:
        date_prefix = t.date[:7] if t.date else "2026-01"
        revenue_by_date[date_prefix] = revenue_by_date.get(date_prefix, 0.0) + t.grand_total

    return {
        "totalAppointments": total_appointments,
        "confirmedAppointments": confirmed_appointments,
        "pendingAppointments": pending_appointments,
        "completed_appointments": completed_appointments,
        "cancelledAppointments": cancelled_appointments,
        "totalRevenue": total_revenue,
        "activeStaffCount": active_staff_count,
        "lowStockCount": low_stock_count,
        "outOfStockCount": out_of_stock_count,
        "totalClients": total_clients,
        "revenueByMonth": [{"month": k, "revenue": v} for k, v in sorted(revenue_by_date.items())]
    }

