import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.api.health import router as health_router
from app.api.notes import router as notes_router
from app.api.patients import router as patients_router
from app.core.config import settings
from app.core.logging import RequestLoggingMiddleware, setup_logging

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed on startup. Idempotent (no-op once the patients table has rows) and
    # best-effort: schema migrations are applied separately by the entrypoint, so a
    # seeding hiccup logs loudly but doesn't prevent the API from serving.
    try:
        from app.seed import seed

        await seed()
    except Exception:
        logger.exception("Startup seeding failed; continuing without seed data")
    yield


async def _integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Map DB constraint violations (e.g. duplicate email) to 409 instead of 500."""
    logger.warning("Integrity error on %s %s: %s", request.method, request.url.path, exc.orig)
    return JSONResponse(
        status_code=409,
        content={"detail": "Resource conflict: a record with these values already exists."},
    )


def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI(title="Healthcare Dashboard API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    app.add_exception_handler(IntegrityError, _integrity_error_handler)

    app.include_router(health_router)
    app.include_router(patients_router)
    app.include_router(notes_router)
    return app


app = create_app()
