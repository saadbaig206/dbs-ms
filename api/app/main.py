from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine
from app.models.base import Base
from app.models.user import User
from app.models.whatsapp import WhatsAppSettings
from app.core.security import get_password_hash
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.routers import (
    auth, staff, services, clients, appointments, inventory,
    expenses, transactions, attendance, notifications, pos, dashboard, branches, whatsapp, bootstrap,
    purchases, partners, packages, returns
)

_db_initialized = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _db_initialized
    if not _db_initialized:
        try:
            if engine:
                # 1. Create tables on startup dynamically
                async with engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
                    migration_statements = [
                        "ALTER TABLE staff ADD COLUMN IF NOT EXISTS branch_id VARCHAR REFERENCES branches(id) ON DELETE SET NULL",
                        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS branch_id VARCHAR REFERENCES branches(id) ON DELETE SET NULL",
                        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS cnic VARCHAR",
                        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS outstanding_balance FLOAT DEFAULT 0.0",
                        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS branch_id VARCHAR REFERENCES branches(id) ON DELETE SET NULL",
                        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_status VARCHAR DEFAULT 'Pending'",
                        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'treatment'",
                        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR",
                        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'Unpaid'",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS branch_id VARCHAR REFERENCES branches(id) ON DELETE SET NULL",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS time VARCHAR",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS tax_percent FLOAT DEFAULT 0.0",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS items JSON",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS card_last_four VARCHAR",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS card_type VARCHAR",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS bank_txn_id VARCHAR",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS amount_paid FLOAT",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS client_id VARCHAR REFERENCES clients(id) ON DELETE SET NULL",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS cash_received FLOAT",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS cash_returned FLOAT",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS remaining_due FLOAT DEFAULT 0.0",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'Paid'",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS payment_splits JSON",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS package_id VARCHAR",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR DEFAULT 'Sale'",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS audit_logs JSON DEFAULT '[]'",
                        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS reprint_count INTEGER DEFAULT 0",
                        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS branch_id VARCHAR REFERENCES branches(id) ON DELETE SET NULL",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS branch_id VARCHAR REFERENCES branches(id) ON DELETE SET NULL",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS added_by VARCHAR",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_by VARCHAR",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_name VARCHAR",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS product_name VARCHAR",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_type VARCHAR",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS actual_amount FLOAT",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount_paid FLOAT",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS remaining_amount FLOAT",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_logs JSON DEFAULT '[]'",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deletion_approvals JSON DEFAULT '[]'",
                        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deletion_requested_by VARCHAR",
                        "ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS branch_id VARCHAR UNIQUE REFERENCES branches(id) ON DELETE SET NULL",
                        "ALTER TABLE services ADD COLUMN IF NOT EXISTS required_inventory JSON DEFAULT '[]'",
                    ]
                    for stmt in migration_statements:
                        try:
                            async with conn.begin_nested():
                                await conn.execute(text(stmt))
                        except Exception:
                            pass

                
                # 2. Seed default users and settings if none exist
                async_session = sessionmaker(
                    engine, class_=AsyncSession, expire_on_commit=False
                )
                async with async_session() as session:
                    from sqlalchemy import func
                    default_users = [
                        ("admin@gmail.com", "admin", "admin"),
                        ("staff@gmail.com", "staff", "staff"),
                        ("drzaini", "drzaini109", "admin")
                    ]
                    for email_str, pass_str, role_str in default_users:
                        u_res = await session.execute(select(User).where(func.lower(User.email) == email_str))
                        if not u_res.scalars().first():
                            session.add(User(
                                email=email_str,
                                hashed_password=get_password_hash(pass_str),
                                role=role_str
                            ))
                    await session.commit()

                    from app.models.branch import Branch
                    from app.models.staff import Staff

                    branch_result = await session.execute(select(Branch))
                    if not branch_result.scalars().first():
                        default_branch = Branch(
                            id="BR-001",
                            name="Main Branch",
                            location="DBS Lahore, Pakistan",
                            phone="+924211112233",
                            latitude=31.5204,
                            longitude=74.3587
                        )
                        session.add(default_branch)
                        await session.commit()


                    settings_result = await session.execute(select(WhatsAppSettings))
                    if not settings_result.scalars().first():
                        default_settings = WhatsAppSettings(
                            system_prompt="You are a helpful customer service assistant for DBS Aesthetics Clinic. Be professional, polite, and direct.",
                            knowledge_base="Aura Luxury / DBS Aesthetics Clinic is a premium luxury clinic. We offer advanced skincare, laser treatments, hair transplants, dental aesthetics, and cosmetic surgery."
                        )
                        session.add(default_settings)
                        await session.commit()
                _db_initialized = True
            else:
                print("Lifespan startup skipped database setup: engine is None.")
        except Exception as e:
            print(f"Lifespan initialization failed: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins else ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=500)

# Include Routers
app.include_router(bootstrap.router, prefix=f"{settings.API_V1_STR}/bootstrap", tags=["bootstrap"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(staff.router, prefix=f"{settings.API_V1_STR}/staff", tags=["staff"])
app.include_router(services.router, prefix=f"{settings.API_V1_STR}/services", tags=["services"])
app.include_router(clients.router, prefix=f"{settings.API_V1_STR}/clients", tags=["clients"])
app.include_router(appointments.router, prefix=f"{settings.API_V1_STR}/appointments", tags=["appointments"])
app.include_router(inventory.router, prefix=f"{settings.API_V1_STR}/inventory", tags=["inventory"])
app.include_router(expenses.router, prefix=f"{settings.API_V1_STR}/expenses", tags=["expenses"])
app.include_router(transactions.router, prefix=f"{settings.API_V1_STR}/transactions", tags=["transactions"])
app.include_router(attendance.router, prefix=f"{settings.API_V1_STR}/attendance", tags=["attendance"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(pos.router, prefix=f"{settings.API_V1_STR}/pos", tags=["pos"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(branches.router, prefix=f"{settings.API_V1_STR}/branches", tags=["branches"])
app.include_router(whatsapp.router, prefix=f"{settings.API_V1_STR}/whatsapp", tags=["whatsapp"])
app.include_router(purchases.router, prefix=f"{settings.API_V1_STR}/purchases", tags=["purchases"])
app.include_router(partners.router, prefix=f"{settings.API_V1_STR}/partners", tags=["partners"])
app.include_router(packages.router, prefix=f"{settings.API_V1_STR}/packages", tags=["packages"])
app.include_router(returns.router, prefix=f"{settings.API_V1_STR}/returns", tags=["returns"])


@app.get("/")
def read_root():
    return {"message": "Aura Luxury Clinic POS & Management API is running!"}
