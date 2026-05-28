from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# A per-statement timeout, applied as an asyncpg server setting on every connection,
# so a slow query fails fast and returns its connection to the pool instead of hanging
# for tens of seconds under load. Migrations run via Alembic's own engine and are
# unaffected by this.
_connect_args: dict = {}
if settings.db_statement_timeout_ms > 0:
    _connect_args["server_settings"] = {
        "statement_timeout": str(settings.db_statement_timeout_ms)
    }

# Explicit pool sizing (task-18). pool_recycle replaces pool_pre_ping: it refreshes
# connections on an interval instead of paying a round-trip liveness check on every
# checkout.
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
    connect_args=_connect_args,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
