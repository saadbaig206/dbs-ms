import asyncio
import os
import ssl
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

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
    echo=False
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def inspect():
    tables = [
        "users", "branches", "staff", "services", "clients",
        "appointments", "inventory", "expenses", "financial_transactions",
        "attendance", "notifications", "whatsapp_settings", "whatsapp_messages"
    ]
    async with AsyncSessionLocal() as session:
        print("=== Database Table Counts ===")
        for t in tables:
            try:
                res = await session.execute(text(f"SELECT COUNT(*) FROM {t}"))
                count = res.scalar()
                print(f"Table '{t}': {count} rows")
            except Exception as e:
                print(f"Table '{t}': Error/Does not exist ({e})")

if __name__ == "__main__":
    asyncio.run(inspect())
