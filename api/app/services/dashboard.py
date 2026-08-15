from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.appointment import Appointment
from app.models.transaction import FinancialTransaction
from app.models.staff import Staff
from app.models.inventory import InventoryItem
from app.models.client import Client

async def get_dashboard_aggregates(db: AsyncSession) -> dict:
    # 1. Total appointments count and status counts
    apt_result = await db.execute(select(Appointment))
    appointments = apt_result.scalars().all()
    total_appointments = len(appointments)
    confirmed_appointments = sum(1 for a in appointments if a.status == "Confirmed")
    pending_appointments = sum(1 for a in appointments if a.status == "Pending")
    completed_appointments = sum(1 for a in appointments if a.status == "Completed")
    cancelled_appointments = sum(1 for a in appointments if a.status == "Cancelled")
    
    # 2. Total revenue (sum of transactions grand_total)
    txn_result = await db.execute(select(FinancialTransaction))
    transactions = txn_result.scalars().all()
    total_revenue = sum(t.grand_total for t in transactions)
    
    # 3. Staff metrics
    staff_result = await db.execute(select(Staff))
    staff_list = staff_result.scalars().all()
    active_staff_count = sum(1 for s in staff_list if s.status == "Active")
    
    # 4. Inventory alerts
    inv_result = await db.execute(select(InventoryItem))
    inventory_items = inv_result.scalars().all()
    low_stock_count = sum(1 for i in inventory_items if i.quantity <= i.min_stock)
    out_of_stock_count = sum(1 for i in inventory_items if i.quantity == 0)
    
    # 5. Client metrics
    client_result = await db.execute(select(Client))
    clients = client_result.scalars().all()
    total_clients = len(clients)

    # 6. Monthly revenue breakdown (group transactions by month/date)
    # Simple grouping for charts
    revenue_by_date = {}
    for t in transactions:
        # t.date is YYYY-MM-DD
        date_prefix = t.date[:7] # YYYY-MM
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
