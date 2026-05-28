# Task 12 — Containerization

- **Assignment:** Part 5 (items 1–4)
- **Depends on:** task-00 (db service + initial `.env.example`), task-05, task-06, task-10
- **Status:** Not started

## Objective

Package the full stack so the evaluator can launch everything with one command and no
secrets. This **extends** the compose skeleton from task-00 (which already provides the
`db` service and the env contract) with the backend and frontend services.

## Deliverables

- `backend/Dockerfile` — `python:3.12-slim`; install deps; copy app; `entrypoint.sh`.
- `backend/entrypoint.sh` — `alembic upgrade head` → `python -m app.seed` (idempotent) →
  `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- `frontend/Dockerfile` — multi-stage: node build → copy `dist/` into `nginx:alpine`.
- `frontend/nginx.conf` — serve static assets with SPA fallback (`try_files ... /index.html`)
  and `location /api/ { proxy_pass http://backend:8000/; }` (strips `/api` prefix).
- Extend `docker-compose.yml` — add `backend` and `frontend` services alongside the
  existing `db` service; backend `DATABASE_URL` overridden to host `db`.
- Finalize `.env.example` — add the remaining variables on top of task-00's DB keys:
  `ANTHROPIC_API_KEY=` (blank/optional) and `BACKEND_CORS_ORIGINS`.

## Port / Networking

| Service | Internal | Host |
|---|---|---|
| db (postgres:16) | 5432 | 5432 (optional) |
| backend (uvicorn) | 8000 | 8000 (Swagger only) |
| frontend (nginx) | 80 | 8080 |

Browser hits `localhost:8080`; nginx proxies `/api/*` → `backend:8000` over the docker
network ⇒ no CORS. The frontend uses `baseURL=/api`.

## Implementation Notes

- `db` has a `healthcheck` (`pg_isready`); `backend` `depends_on: db: condition:
  service_healthy`.
- Named volume for Postgres data persistence.
- `.env.example` keys: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
  `DATABASE_URL` (async URL, e.g. `postgresql+asyncpg://...@db:5432/...`),
  `ANTHROPIC_API_KEY=` (blank/optional), `BACKEND_CORS_ORIGINS`.
- Confirm the nginx prefix-strip matches backend routes (backend serves bare `/patients`;
  nginx maps `/api/patients → /patients`). Trailing-slash behavior in `proxy_pass` matters.

## Acceptance Criteria

- `cp .env.example .env && docker compose up --build` brings up all three services.
- Frontend reachable at `http://localhost:8080`; app works end-to-end (list, CRUD, notes,
  summary) **without setting any secret**.
- `curl localhost:8000/health` → `{"status":"ok"}`; Swagger at `localhost:8000/docs`.
- DB data survives a `docker compose restart` (volume).
