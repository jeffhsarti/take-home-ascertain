# Implementation Plan — Healthcare Dashboard

## Context

This repository implements the **Ascertain Full-Stack take-home**: a patient-management
dashboard for a medical practice, built as a **React/TypeScript (Vite) frontend +
FastAPI backend + PostgreSQL database**, orchestrated with `docker-compose`.

A core constraint drives several decisions: the evaluator must be able to launch the
entire stack with a **single command and without supplying any secrets**.

## Architecture Decisions

| Concern | Choice | Rationale |
|---|---|---|
| UI library | **MUI (Material UI v6)** + Emotion | Batteries-included components; `DataGrid` provides sort/filter/pagination/row-virtualization out of the box. |
| State management | **TanStack Query** (server state) + **Zustand** (UI state) | Clear separation: query caching/mutations for data, minimal store for filters/search/sort. |
| Forms & validation | **react-hook-form + zod**, integrated with MUI via `Controller` | Declarative client validation; schema shared shape with server error mapping. |
| Routing | **React Router** with `React.lazy` + `Suspense` | Code-splitting per route. |
| Summary generation | **Deterministic template by default; Claude API only if `ANTHROPIC_API_KEY` is set** | Reproducible with zero secrets; LLM is a transparent, optional upgrade with template fallback. |
| Backend | Python 3.12, FastAPI, Uvicorn, **SQLAlchemy 2.0 async + asyncpg**, Pydantic v2 | Modern idiomatic async stack. |
| Migrations | **Alembic** (async env) | Reproducible schema; stretch goal. |
| Seed | **Faker**, ~10,000 patients, idempotent | Exercises the "handle 100+ patients" requirement and gives the k6 perf suite real volume to push against. |
| Lint/format | **Ruff** (backend), **ESLint + Prettier** (frontend) | |

### Selected stretch goals
1. **Testing** — pytest for the API, Vitest + React Testing Library + MSW for the UI.
2. **Performance** — `DataGrid` row virtualization, lazy-loaded routes, memoized renders;
   k6 load/stress suite over the read paths (list/search/stats) — see task-17.
3. **Advanced backend** — Alembic migrations + server-side sort/filter query params on `GET /patients`.

## Directory Layout

```
take-home-ascertain/
├── backend/
│   ├── app/
│   │   ├── main.py                 # app factory, CORS, middleware, routers, lifespan
│   │   ├── core/config.py          # Pydantic Settings (env)
│   │   ├── core/logging.py         # structured logging + request middleware
│   │   ├── db/session.py           # async engine + session factory + get_db dep
│   │   ├── db/base.py              # DeclarativeBase
│   │   ├── models/                 # patient.py, note.py
│   │   ├── schemas/                # patient.py, note.py, summary.py (Pydantic v2)
│   │   ├── api/                    # health.py, patients.py, notes.py
│   │   ├── services/               # patients.py (query logic), summary.py (template + LLM)
│   │   └── seed.py                 # idempotent Faker seed (~10,000 patients)
│   ├── alembic/ + alembic.ini
│   ├── tests/
│   ├── pyproject.toml
│   ├── entrypoint.sh               # alembic upgrade head -> seed -> uvicorn
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx, App.tsx       # QueryClientProvider, ThemeProvider, RouterProvider
│   │   ├── api/                    # client.ts (axios, baseURL=/api), patients.ts, notes.ts
│   │   ├── hooks/                  # usePatients, usePatient, useNotes, useSummary, mutations
│   │   ├── store/uiStore.ts        # Zustand: search, filters, sort
│   │   ├── components/layout/      # AppShell (Header + Sidebar + main)
│   │   ├── components/patients/    # PatientList (DataGrid), SearchBar, StatusChip
│   │   ├── components/notes/       # NoteList, NoteForm
│   │   ├── pages/                  # Dashboard, Patients, PatientDetail, PatientForm, NotFound
│   │   ├── theme/index.ts
│   │   └── types/
│   ├── tests/
│   ├── Dockerfile                  # multi-stage: node build -> nginx
│   ├── nginx.conf                  # serve static + proxy /api -> backend
│   └── package.json, tsconfig*.json, vite.config.ts, eslint/prettier configs
├── docker-compose.yml
├── .env.example
└── README.md
```

## Data Model

**Patient**: `id` (UUID), `first_name`, `last_name`, `date_of_birth` (date; `age` derived
at runtime), `email`, `phone`, `address` (street/city/state/zip), `blood_type`
(enum A+/A-/B+/B-/AB+/AB-/O+/O-), `status` (enum active/inactive/discharged),
`allergies` (JSONB list[str]), `conditions` (JSONB list[str]), `last_visit` (date, nullable),
`created_at`, `updated_at`.

**Note**: `id` (UUID), `patient_id` (FK → patients, ON DELETE CASCADE), `content` (text),
`created_at` (timestamp; accepts client-provided value, defaults to now).

## API Surface

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{"status":"ok"}` |
| GET | `/patients` | `page`/`page_size`, `search` (name/email), `status`, `sort_by`/`sort_order`; returns `{items,total,page,page_size,total_pages}` |
| GET | `/patients/{id}` | 404 if missing |
| POST | `/patients` | 201 |
| PUT | `/patients/{id}` | 404 if missing |
| DELETE | `/patients/{id}` | 204; cascades notes |
| POST | `/patients/{id}/notes` | accepts `content` + optional `timestamp`; 201 |
| GET | `/patients/{id}/notes` | ordered by `created_at` desc |
| DELETE | `/patients/{id}/notes/{note_id}` | 204 |
| GET | `/patients/{id}/summary` | template + optional LLM |

**Validation/errors:** Pydantic v2 validators (email, phone, non-future DOB, enums).
FastAPI returns 422 on validation errors; explicit 404 handler; consistent `{detail}`
error shape; lightweight per-request logging middleware.

## Port Map (docker-compose)

| Service | Internal port | Host port |
|---|---|---|
| `db` (Postgres 16) | 5432 | 5432 (optional, debug) |
| `backend` (uvicorn) | 8000 | 8000 (Swagger `/docs` only) |
| `frontend` (nginx) | 80 | 8080 |

Browser → `localhost:8080` (nginx): `/` serves the React build, `/api/*` is proxied to
`http://backend:8000` over the docker network (resolved by service name). Same-origin
from the browser's perspective ⇒ **no CORS needed**.

## Execution Order (mapped to assignment parts)

The work is decomposed into the task files under [`docs/tasks/`](./tasks/). Summary:

0. **task-00** Infra bootstrap — provision Postgres via compose + env contract, so the
   backend is developed against a real DB from the start *(Part 1 / Part 5 foundation)*
1. **task-01** Backend scaffold — FastAPI + `/health` + config + Ruff *(Part 1)*
2. **task-02** Frontend scaffold — Vite + React/TS + MUI + ESLint/Prettier *(Part 1)*
3. **task-03** DB models & Alembic migrations *(Part 1 + stretch)*
4. **task-04** Seed data (~10,000 via Faker, idempotent) *(Part 1)*
5. **task-05** Patient CRUD + list with pagination/filter/sort *(Part 2 + stretch)*
6. **task-06** Notes + summary endpoints *(Part 3)*
7. **task-07** Frontend layout, routing, lazy loading, 404 *(Part 2 + perf)*
8. **task-08** Patient list UI (DataGrid, debounced search, sort, virtualization) *(Part 2 + perf)*
9. **task-09** Patient detail: notes + summary UI *(Part 3)*
10. **task-10** Patient create/edit form (rhf + zod, client+server validation) *(Part 4)*
11. **task-11** Testing (pytest + Vitest/RTL/MSW) *(stretch)*
12. **task-12** Containerization (Dockerfiles, nginx, compose, `.env.example`) *(Part 5)*
13. **task-13** README & developer docs *(Part 5)*

## End-to-End Verification

- `docker compose up --build` → frontend at `http://localhost:8080`, API at `:8000`.
- `curl localhost:8000/health` → `{"status":"ok"}`; `GET /patients` → paginated list (~10,000 seeded).
- Swagger at `localhost:8000/docs` to exercise all endpoints.
- UI: browse list (search/sort/paginate), create/edit/delete a patient (client+server
  validation), add/delete notes, open the summary, hit a 404 route, check responsiveness.
- `cd backend && pytest` and `cd frontend && npm test` green.
