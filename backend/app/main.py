from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.notes import router as notes_router
from app.api.patients import router as patients_router
from app.core.config import settings
from app.core.logging import RequestLoggingMiddleware, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup hooks (e.g. seeding) are wired in later tasks.
    yield


def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI(title="Healthcare Dashboard API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    app.include_router(health_router)
    app.include_router(patients_router)
    app.include_router(notes_router)
    return app


app = create_app()
