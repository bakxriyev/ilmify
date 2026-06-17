from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from app.config import settings

async_engine = create_async_engine(
    settings.database_url,
    pool_size=settings.db_min_connections,
    max_overflow=settings.db_max_connections - settings.db_min_connections,
    pool_recycle=3600,
    echo=settings.debug,
)

async_session_factory = async_sessionmaker(async_engine, expire_on_commit=False)

sync_engine = create_engine(
    settings.database_url_sync,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=settings.debug,
)


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def execute_read_only_query(query: str, params: dict | None = None) -> list[dict]:
    clean = query.strip().rstrip(";")
    async with async_session_factory() as session:
        result = await session.execute(text(clean), params or {})
        rows = result.fetchall()
        columns = result.keys()
        return [dict(zip(columns, row)) for row in rows]


def execute_read_only_query_sync(query: str, params: dict | None = None) -> list[dict]:
    clean = query.strip().rstrip(";")
    with sync_engine.connect() as conn:
        result = conn.execute(text(clean), params or {})
        rows = result.fetchall()
        columns = result.keys()
        return [dict(zip(columns, row)) for row in rows]
