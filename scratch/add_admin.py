import asyncio
import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import func

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env")

# Standardize asyncpg URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove sslmode params from connection URL
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

async def main():
    # Import models and security after sys path
    import sys
    sys.path.append(os.path.join(os.path.dirname(__file__), "..", "api"))
    
    from app.models.user import User
    from app.core.security import get_password_hash, verify_password

    async with AsyncSessionLocal() as session:
        # Check if drzaini exists
        result = await session.execute(select(User).where(func.lower(User.email) == "drzaini"))
        user = result.scalars().first()

        hashed_pass = get_password_hash("drzaini109")

        if user:
            print("User drzaini already exists. Updating password and role...")
            user.hashed_password = hashed_pass
            user.role = "admin"
        else:
            print("Creating new admin user drzaini...")
            user = User(
                email="drzaini",
                hashed_password=hashed_pass,
                role="admin"
            )
            session.add(user)

        await session.commit()
        print("Successfully created/updated drzaini as admin with password drzaini109!")

        # Also verify logic
        result = await session.execute(select(User))
        all_users = result.scalars().all()
        print("Current users in database:")
        for u in all_users:
            print(f"- ID: {u.id}, Email/Username: {u.email}, Role: {u.role}")

if __name__ == "__main__":
    asyncio.run(main())
