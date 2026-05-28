# Task 01 — Backend Scaffold & Tooling

- **Assignment:** Part 1 (Backend, item 1)
- **Depends on:** —
- **Status:** Not started

## Objective

Stand up a FastAPI application with a working health-check endpoint, project structure,
configuration, logging, and linting — the foundation every other backend task builds on.

## Deliverables

- `backend/pyproject.toml` — dependencies (fastapi, uvicorn[standard], sqlalchemy,
  asyncpg, pydantic, pydantic-settings, alembic, anthropic, faker; dev: ruff, pytest,
  pytest-asyncio, httpx) + Ruff and pytest configuration.
- `backend/app/main.py` — app factory: instantiate FastAPI, attach CORS, request-logging
  middleware, exception handlers, and routers; `lifespan` hook placeholder.
- `backend/app/core/config.py` — `Settings` via `pydantic-settings` (DATABASE_URL,
  ANTHROPIC_API_KEY optional, BACKEND_CORS_ORIGINS, ENV).
- `backend/app/core/logging.py` — logging setup + a lightweight per-request middleware
  (method, path, status, duration).
- `backend/app/api/health.py` — `GET /health` → `{"status": "ok"}`.
- Update root `.gitignore` with Python entries (`__pycache__/`, `.venv/`, `*.pyc`,
  `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`).

## Implementation Notes

- Routers mounted under no global prefix at the app level; the nginx proxy strips `/api`
  before forwarding, so backend routes are `/health`, `/patients`, etc. (Confirm prefix
  strategy with task-12; default: backend serves bare paths, nginx maps `/api/* → /*`.)
- Keep `main.py` thin — wiring only. Business logic lives in `services/`.
- Consistent error envelope: register a handler producing `{"detail": ...}` for
  `HTTPException` and validation errors.

## Acceptance Criteria

- `uvicorn app.main:app --reload` starts cleanly.
- `GET /health` returns `200 {"status":"ok"}`.
- `ruff check .` and `ruff format --check .` pass.
- OpenAPI docs render at `/docs`.
