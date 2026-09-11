import asyncio
import os
import ssl
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in .env")

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    DATABASE_URL,
    connect_args={"ssl": ssl_ctx},
    echo=True
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def clean_database():
    print("=== Cleaning Database Tables ===")
    async with AsyncSessionLocal() as session:
        # Delete operational & transaction data
        tables_to_clear = [
            "clients",
            "appointments",
            "inventory",
            "expenses",
            "financial_transactions",
            "attendance",
            "notifications",
            "whatsapp_messages",
            "services"
        ]
        
        for table in tables_to_clear:
            try:
                await session.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
                print(f"Cleared table: {table}")
            except Exception as e:
                print(f"Could not truncate {table}, attempting DELETE: {e}")
                try:
                    await session.execute(text(f"DELETE FROM {table};"))
                    print(f"Deleted all records from {table}")
                except Exception as ex:
                    print(f"Error clearing table {table}: {ex}")

        # Ensure essential default admin accounts exist in users table
        import sys
        sys.path.append(os.path.join(os.path.dirname(__file__), "..", "api"))
        from app.models.user import User
        from app.core.security import get_password_hash

        # Re-seed default users if missing
        admin_pass = get_password_hash("admin")
        staff_pass = get_password_hash("staff")
        drzaini_pass = get_password_hash("drzaini109")

        users_to_ensure = [
            ("drzaini", drzaini_pass, "admin"),
            ("admin@gmail.com", admin_pass, "admin"),
            ("staff@gmail.com", staff_pass, "staff")
        ]

        for email, pwd, role in users_to_ensure:
            res = await session.execute(select(User).where(User.email == email))
            existing = res.scalars().first()
            if not existing:
                u = User(email=email, hashed_password=pwd, role=role)
                session.add(u)
                print(f"Added user: {email}")
            else:
                existing.hashed_password = pwd
                existing.role = role
                print(f"Updated user credentials: {email}")

        await session.commit()
        print("=== Database Clean Completed Successfully! ===")

if __name__ == "__main__":
    asyncio.run(clean_database())
