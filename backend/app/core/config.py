from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, read from the environment / .env file.

    Env files are searched both in the current directory and the repo root, so the
    backend works whether it is launched from `backend/` (local dev) or with env vars
    injected by docker-compose.
    """

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/healthcare"
    anthropic_api_key: str | None = None
    backend_cors_origins: str = "http://localhost:8080,http://localhost:5173"
    env: str = "development"

    # Concurrency & connection pool (task-18). Each uvicorn worker is a separate
    # process with its own asyncio loop and its own pool, so the DB sees up to
    # web_concurrency * (db_pool_size + db_max_overflow) connections — keep that
    # under Postgres `max_connections`.
    web_concurrency: int = 2
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_timeout: int = 30
    db_pool_recycle: int = 1800
    # Server-side per-statement timeout (ms). Fails slow queries fast and frees the
    # connection instead of hanging. 0 disables it.
    db_statement_timeout_ms: int = 15000

    # Short-lived cache for /patients/stats (task-19). Per-worker; 0 disables.
    stats_cache_ttl_seconds: int = 60

    # Minimum search length (task-20). Below this the trigram index can't help, so
    # the API rejects the term instead of running a sequential scan.
    search_min_length: int = 3

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
