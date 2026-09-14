import asyncio
import os
import sys
import time
import ssl
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "api"))

load_dotenv()

from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select
from app.models.user import User
from app.core.security import verify_password

async def test_connection(db_url: str, label: str):
    print(f"\n--- Testing Database Connection: {label} ---")
    
    url_clean = db_url
    if url_clean.startswith("postgresql://"):
        url_clean = url_clean.replace("postgresql://", "postgresql+asyncpg://", 1)
    if "?" in url_clean:
        url_clean = url_clean.split("?")[0]
        
    print(f"Host: {url_clean.split('@')[-1] if '@' in url_clean else url_clean}")

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    start_time = time.time()
    try:
        engine = create_async_engine(
            url_clean,
            connect_args={"ssl": ssl_ctx},
            echo=False
        )
        AsyncSessionLocal = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with AsyncSessionLocal() as session:
            # 1. Ping
            t0 = time.time()
            res = await session.execute(text("SELECT version();"))
            version_str = res.scalar()
            ping_ms = (time.time() - t0) * 1000
            print(f"[SUCCESS] Connected in {ping_ms:.1f}ms")
            print(f"PostgreSQL Version: {version_str[:65]}...")

            # 2. Table Inspection
            tables = ["users", "branches", "staff", "services", "clients", "appointments", "inventory", "expenses", "financial_transactions"]
            print("\nTable Row Counts:")
            for t in tables:
                try:
                    c_res = await session.execute(text(f"SELECT COUNT(*) FROM {t}"))
                    print(f"  - {t}: {c_res.scalar()} rows")
                except Exception as ex:
                    print(f"  - {t}: Error ({ex})")

            # 3. User Credentials Check
            print("\nUser Accounts & Passwords Check:")
            u_res = await session.execute(select(User))
            users = u_res.scalars().all()
            for u in users:
                is_drzaini = (u.email.lower() == "drzaini")
                pass_check = ""
                if is_drzaini:
                    pass_check = " (drzaini109 OK)" if verify_password("drzaini109", u.hashed_password) else " (Password MISMATCH)"
                elif u.email == "admin@gmail.com":
                    pass_check = " (admin OK)" if verify_password("admin", u.hashed_password) else " (Password MISMATCH)"
                elif u.email == "staff@gmail.com":
                    pass_check = " (staff OK)" if verify_password("staff", u.hashed_password) else " (Password MISMATCH)"
                print(f"  - ID {u.id}: {u.email} | Role: {u.role}{pass_check}")

        await engine.dispose()
        print(f"Total test time: {(time.time() - start_time):.2f}s")
        return True
    except Exception as e:
        print(f"[FAILED] Could not connect: {e}")
        return False

async def main():
    print("================ DATABASE DIAGNOSTIC TOOL ================")
    # 1. Test .env DATABASE_URL
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        await test_connection(env_url, ".env DATABASE_URL")
    else:
        print("No DATABASE_URL found in .env")

    # 2. Test settings.DATABASE_URL
    config_url = settings.DATABASE_URL
    await test_connection(config_url, "api/app/core/config.py Settings.DATABASE_URL")

if __name__ == "__main__":
    asyncio.run(main())
