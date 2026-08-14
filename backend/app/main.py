from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine
from app.models.base import Base
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.routers import (
    auth, staff, services, clients, appointments, inventory,
    expenses, transactions, attendance, notifications, pos, dashboard, branches
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create tables on startup dynamically
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure branch_id columns exist in staff and clients tables
        await conn.execute(text(
            "ALTER TABLE staff ADD COLUMN IF NOT EXISTS branch_id VARCHAR REFERENCES branches(id) ON DELETE SET NULL;"
        ))
        await conn.execute(text(
            "ALTER TABLE clients ADD COLUMN IF NOT EXISTS branch_id VARCHAR REFERENCES branches(id) ON DELETE SET NULL;"
        ))
        
    # 2. Seed default users if none exist
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        result = await session.execute(select(User))
        if not result.scalars().first():
            admin_user = User(
                email="admin@gmail.com",
                hashed_password=get_password_hash("admin"),
                role="admin"
            )
            staff_user = User(
                email="staff@gmail.com",
                hashed_password=get_password_hash("staff"),
                role="staff"
            )
            session.add_all([admin_user, staff_user])
            await session.commit()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include Routers
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

@app.get("/")
def read_root():
    return {"message": "Aura Luxury Clinic POS & Management API is running!"}
