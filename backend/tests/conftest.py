import asyncpg
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.models  # noqa: F401  -- register models on Base.metadata
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.services.patients import reset_stats_cache

# Derive a dedicated test database on the same server as the dev database.
_SERVER = settings.database_url.replace("+asyncpg", "").rsplit("/", 1)[0]
_ADMIN_DSN = f"{_SERVER}/postgres"
TEST_DB_URL = settings.database_url.rsplit("/", 1)[0] + "/healthcare_test"


async def _ensure_test_database() -> None:
    conn = await asyncpg.connect(_ADMIN_DSN)
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = 'healthcare_test'")
        if not exists:
            await conn.execute("CREATE DATABASE healthcare_test")
    finally:
        await conn.close()


@pytest_asyncio.fixture
async def client():
    """Async test client backed by a freshly created test schema per test."""
    await _ensure_test_database()
    engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    # The stats cache is a module global; clear it so it never leaks across tests
    # (each test gets a fresh schema).
    reset_stats_cache()

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
def patient_payload() -> dict:
    return {
        "first_name": "Test",
        "last_name": "Patient",
        "date_of_birth": "1990-05-15",
        "email": "test.patient@example.com",
        "phone": "555-0100",
        "address_street": "1 Main St",
        "address_city": "Springfield",
        "address_state": "IL",
        "address_zip": "62701",
        "blood_type": "O+",
        "status": "active",
        "allergies": ["Penicillin"],
        "conditions": ["Asthma"],
        "last_visit": "2025-01-10",
    }
