# Healthcare Dashboard

A patient-management dashboard for a medical practice: a **React + TypeScript** frontend,
a **FastAPI** backend, and **PostgreSQL**, all runnable with a single `docker compose` command.

- Browse 120 seeded patients with server-side pagination, search, filtering, and sorting
- View a patient's profile, clinical notes, and a generated summary
- Create, edit, and delete patients with client- and server-side validation

---

## Quick start (Docker)

The only prerequisite is Docker (with Compose).

```bash
cp .env.example .env
docker compose up --build
```

| What | URL |
|------|-----|
| App (frontend) | http://localhost:8080 |
| API docs (Swagger) | http://localhost:8000/docs |

The backend automatically applies migrations and seeds ~120 patients on first start.
**No secrets are required** — the patient summary falls back to a deterministic template
unless an `ANTHROPIC_API_KEY` is provided.

---

## Architecture & key decisions

| Concern | Choice | Why |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Fast dev/build, strict typing |
| UI | MUI + `@mui/x-data-grid` | Polished components; the grid handles sorting/paging/row virtualization |
| Server state | TanStack Query | Caching, background refetch, `keepPreviousData` for non-blocking lists |
| Client state | Zustand | Minimal store for list filters/sort, synced to the URL for deep-linking |
| Forms | react-hook-form + zod | Declarative validation mirroring the server |
| Backend | FastAPI + SQLAlchemy 2.0 (async) + asyncpg | Modern async stack |
| Migrations | Alembic (async) | Reproducible schema |
| Summary | Template by default, Claude if `ANTHROPIC_API_KEY` is set | Reproducible with zero secrets; LLM is a transparent upgrade |

**Networking:** the browser talks only to the frontend (`:8080`). nginx serves the static
build and reverse-proxies `/api/*` to the backend (`:8000`) over the Docker network, so
there is no CORS in the Docker setup. The backend port is exposed only for Swagger.

**Stretch goals implemented:** automated tests (pytest + Vitest/RTL/MSW); performance
(DataGrid row virtualization, lazy-loaded routes, memoized cells); advanced backend
(Alembic migrations + server-side sort/filter query params).

---

## Local development (without Docker)

Requires Node 20+, [uv](https://docs.astral.sh/uv/), and a PostgreSQL instance. The
easiest way to get Postgres is the bundled service:

```bash
docker compose up -d db
```

**Backend** (http://localhost:8000):

```bash
cd backend
uv sync                       # installs deps + provisions Python 3.12
uv run alembic upgrade head   # create schema
uv run python -m app.seed     # seed ~120 patients (idempotent)
uv run uvicorn app.main:app --reload --port 8000
```

**Frontend** (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev   # Vite proxies /api -> http://localhost:8000
```

---

## Environment variables

See [`.env.example`](./.env.example). Copy it to `.env` before running.

| Variable | Purpose | Default |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres credentials | `postgres` / `postgres` / `healthcare` |
| `DATABASE_URL` | Async SQLAlchemy URL (host dev uses `localhost`; Compose overrides host to `db`) | local URL |
| `ANTHROPIC_API_KEY` | **Optional.** Enables LLM-generated summaries; blank uses the template | _(blank)_ |
| `BACKEND_CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:8080` |

---

## API

Interactive docs at `http://localhost:8000/docs`.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/patients` | List (params: `page`, `page_size`, `search`, `status`, `sort_by`, `sort_order`) |
| GET | `/patients/{id}` | Get one |
| POST | `/patients` | Create |
| PUT | `/patients/{id}` | Update |
| DELETE | `/patients/{id}` | Delete |
| POST | `/patients/{id}/notes` | Add a note (optional `timestamp`) |
| GET | `/patients/{id}/notes` | List notes |
| DELETE | `/patients/{id}/notes/{note_id}` | Delete a note |
| GET | `/patients/{id}/summary` | Generated patient summary |

---

## Testing

Both suites run offline and require no API key.

```bash
# Backend (needs Postgres running; creates a `healthcare_test` database)
cd backend && uv run pytest

# Frontend
cd frontend && npm test
```

---

## Project structure

```
backend/         FastAPI app (api/, models/, schemas/, services/), Alembic, tests
frontend/        Vite React app (pages/, components/, hooks/, api/, store/), tests
docker-compose.yml
.env.example
```

---

## Notes & trade-offs

- **Summary**: a deterministic template keeps the app fully runnable with no secrets; an
  `ANTHROPIC_API_KEY` transparently upgrades it to a Claude-generated narrative, with the
  template as a fallback on any error.
- **List performance**: pagination/sort/filter are server-side so the client stays light
  regardless of dataset size; the DataGrid virtualizes rendered rows.
- **State**: server data lives in TanStack Query; only UI filter/sort state is in Zustand,
  mirrored into the URL so list views are shareable and survive reloads.
- **With more time**: auth/roles, a status-distribution chart, optimistic create/edit,
  and E2E tests.
```
