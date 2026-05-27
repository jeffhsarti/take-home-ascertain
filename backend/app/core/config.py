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

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
