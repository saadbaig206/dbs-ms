from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Neon works well with pooled connection strings.
# We set up the async engine using settings.DATABASE_URL
db_url = settings.DATABASE_URL
engine = None
SessionLocal = None

if db_url:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "?" in db_url:
        db_url = db_url.split("?")[0]

    import ssl
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    engine = create_async_engine(
        db_url,
        connect_args={
            "ssl": ssl_ctx,
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "command_timeout": 30
        },
        pool_pre_ping=False,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
        pool_timeout=30
    )

    SessionLocal = async_sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

async def get_db():
    if not SessionLocal:
        raise Exception("Database connection is not configured. Please set the DATABASE_URL environment variable.")
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
