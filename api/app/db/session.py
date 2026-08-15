from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Neon works well with pooled connection strings.
# We set up the async engine using settings.DATABASE_URL
db_url = settings.DATABASE_URL
if "?" in db_url:
    db_url = db_url.split("?")[0]

engine = create_async_engine(
    db_url,
    connect_args={"ssl": "require"},
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
