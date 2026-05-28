# Healthcare Dashboard

A patient-management dashboard for a medical practice: a **React + TypeScript** frontend,
a **FastAPI** backend, and **PostgreSQL**, all runnable with a single `docker compose` command.

- Browse 10,000 seeded patients with server-side pagination, search, filtering, and sorting
- View a patient's profile, clinical notes, and a generated summary
- Create, edit, and delete patients with client- and server-side validation

---

## Quick start (Docker)

The only prerequisite is Docker (with Compose).

```bash
cp .env.example .env
docker compose up --build
```

| What               | URL                        |
| ------------------ | -------------------------- |
| App (frontend)     | http://localhost:8080      |
| API docs (Swagger) | http://localhost:8000/docs |

The backend automatically applies migrations and seeds ~10,000 patients on first start.
**No secrets are required** — the patient summary falls back to a deterministic template
unless an `ANTHROPIC_API_KEY` is provided.

---

## Architecture & key decisions

| Concern      | Choice                                                    | Why                                                                     |
| ------------ | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Frontend     | React 19 + TypeScript + Vite                              | Fast dev/build, strict typing                                           |
| UI           | MUI + `@mui/x-data-grid`                                  | Polished components; the grid handles sorting/paging/row virtualization |
| Server state | TanStack Query                                            | Caching, background refetch, `keepPreviousData` for non-blocking lists  |
| Client state | Zustand                                                   | Minimal store for list filters/sort, synced to the URL for deep-linking |
| Forms        | react-hook-form + zod                                     | Declarative validation mirroring the server                             |
| Backend      | FastAPI + SQLAlchemy 2.0 (async) + asyncpg                | Modern async stack                                                      |
| Migrations   | Alembic (async)                                           | Reproducible schema                                                     |
| Summary      | Template by default, Claude if `ANTHROPIC_API_KEY` is set | Reproducible with zero secrets; LLM is a transparent upgrade            |

**Networking:** the browser talks only to the frontend (`:8080`). nginx serves the static
build and reverse-proxies `/api/*` to the backend (`:8000`) over the Docker network, so
there is no CORS in the Docker setup. The backend port is exposed only for Swagger.

**Stretch goals implemented:**

- **Tests** — pytest + Vitest/RTL/MSW
- **Dashboard data viz** — `/patients/stats` aggregation endpoint + 4 charts (status donut,
  age histogram, blood-type bars, top conditions) using `@mui/x-charts`
- **Theme overhaul + dark mode** with a shared color palette across charts and status chips
- **Frontend perf** — DataGrid row virtualization, lazy-loaded routes, memoized cells
- **Advanced backend** — Alembic migrations + server-side sort/filter/search query params
- **Backend perf hardening** — uvicorn worker tuning, SQLAlchemy pool sizing, in-process
  cache on `/patients/stats`, min-length guard on search (defeats trigram seq-scan), btree
  indexes on the remaining sortable columns
- **Load & stress testing** — full k6 suite covering read paths, write smoke (regression
  canary), and write stress (ramp-to-knee, isolated stack). See [`perf/README.md`](./perf/README.md).

---

## Local development (without Docker)

Requires Node 22+, [uv](https://docs.astral.sh/uv/), and a PostgreSQL instance. The
easiest way to get Postgres is the bundled service:

```bash
docker compose up -d db
```

**Backend** (http://localhost:8000):

```bash
cd backend
uv sync                       # installs deps + provisions Python 3.12
uv run alembic upgrade head   # create schema
uv run python -m app.seed     # seed ~10,000 patients (idempotent)
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

| Variable                                              | Purpose                                                                                                                                                    | Default                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres credentials                                                                                                                                       | `postgres` / `postgres` / `healthcare` |
| `DATABASE_URL`                                        | Async SQLAlchemy URL (host dev uses `localhost`; Compose overrides host to `db`)                                                                           | local URL                              |
| `ANTHROPIC_API_KEY`                                   | **Optional.** Enables LLM-generated summaries; blank uses the template                                                                                     | _(blank)_                              |
| `BACKEND_CORS_ORIGINS`                                | Comma-separated allowed origins                                                                                                                            | `http://localhost:8080`                |
| `WEB_CONCURRENCY`                                     | uvicorn worker processes (each has its own pool)                                                                                                           | `2`                                    |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW`                    | SQLAlchemy pool per worker. Total connections = `WEB_CONCURRENCY * (POOL_SIZE + MAX_OVERFLOW)`; keep under Postgres `max_connections` (compose sets `200`) | `10` / `20`                            |
| `SEED_COUNT`                                          | Patients to seed on first start. Lowered to `1000` for the perf-stack DB                                                                                   | `10000`                                |

---

## API

Interactive docs at `http://localhost:8000/docs`.

| Method | Path                             | Description                                                                     |
| ------ | -------------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/health`                        | Health check                                                                    |
| GET    | `/patients`                      | List (params: `page`, `page_size`, `search`, `status`, `sort_by`, `sort_order`) |
| GET    | `/patients/{id}`                 | Get one                                                                         |
| POST   | `/patients`                      | Create                                                                          |
| PUT    | `/patients/{id}`                 | Update                                                                          |
| DELETE | `/patients/{id}`                 | Delete                                                                          |
| POST   | `/patients/{id}/notes`           | Add a note (optional `timestamp`)                                               |
| GET    | `/patients/{id}/notes`           | List notes                                                                      |
| DELETE | `/patients/{id}/notes/{note_id}` | Delete a note                                                                   |
| GET    | `/patients/{id}/summary`         | Generated patient summary                                                       |

---

## Testing

Both suites run offline and require no API key.

```bash
# Backend (needs Postgres running; creates a `healthcare_test` database)
cd backend && uv run pytest

# Frontend
cd frontend && npm test
```

### Performance / stress (k6)

A k6 suite under [`perf/`](./perf/README.md) covers both read paths (dashboard, list,
search) and write paths (create/update/delete on patients and notes). With the stack
running, from the repo root:

```bash
# Read profiles — baseline first; swap PROFILE for load | stress | spike
docker run --rm --network host -w /scripts --user "$(id -u):$(id -g)" \
  -e PROFILE=smoke -v "$PWD/perf/k6:/scripts" grafana/k6 run main.js

# Write regression canary (1 VU, sequential POST/PUT/DELETE chain, net-zero rows)
docker run --rm --network host -w /scripts --user "$(id -u):$(id -g)" \
  -e PROFILE=writes-smoke -v "$PWD/perf/k6:/scripts" grafana/k6 run main.js
```

A separate **isolated** stack (`docker compose --profile perf up`) on `:8001` backs the
ramp-to-knee write profiles (`writes-stress-pure`, `writes-stress-mixed`) so the main
10k-seed DB is never touched. No local k6 install required. See
[`perf/README.md`](./perf/README.md) for the full profile matrix, thresholds, bring-up
of the isolated stack, and how the tagged output pinpoints each suspected bottleneck.

---

## Project structure

```
backend/         FastAPI app (api/, models/, schemas/, services/), Alembic, tests
frontend/        Vite React app (pages/, components/, hooks/, api/, store/), tests
perf/            k6 load/stress suite (read + write profiles, isolated stack)
docs/            Planning artifacts — plan.md + per-task briefs under tasks/
docker-compose.yml
.env.example
```

---

## Scope & limitations

This is a take-home exercise; the brief explicitly scopes out user accounts. **Treat this
codebase as a portfolio artifact, not a production system.** Concretely, before using it
with real patient data you would need to add:

- **Authentication & authorization.** No login, no roles, no per-user scoping — every
  caller has full read/write on every patient. Open the front door, you're already in.
- **Audit logging.** No record of who read or modified which record. Required by HIPAA
  (US), LGPD (BR), GDPR (EU) for any system handling health data.
- **PHI handling.** Logs include request URLs and may include patient IDs; there is no
  field-level redaction, no encryption at rest beyond Postgres defaults, and no data
  retention / right-to-deletion workflow beyond a hard `DELETE`.
- **Transport security.** nginx serves HTTP; no TLS termination is configured. Fine for
  localhost, not fine for anything else.
- **Rate limiting / abuse protection.** No `slowapi` or equivalent — a single bad client
  can saturate the connection pool (see `perf/` for the actual saturation curve).

The seed data is synthetic (Faker). Do not load real PHI into this stack as-is.

---

## Notes & trade-offs

- **Summary**: a deterministic template keeps the app fully runnable with no secrets; an
  `ANTHROPIC_API_KEY` transparently upgrades it to a Claude-generated narrative, with the
  template as a fallback on any error.
- **List performance**: pagination/sort/filter are server-side so the client stays light
  regardless of dataset size; the DataGrid virtualizes rendered rows.
- **State**: server data lives in TanStack Query; only UI filter/sort state is in Zustand,
  mirrored into the URL so list views are shareable and survive reloads.
- **With more time**: auth/roles, optimistic create/edit, E2E tests, and applying the
  task-24 mitigations (shared cache or materialized view) to close the read-SLO breach
  the mixed write-stress profile surfaces.

```

```
