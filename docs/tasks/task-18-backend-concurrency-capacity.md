# Task 18 — Backend concurrency & connection-pool capacity

- **Assignment:** Performance follow-up — **first-order** fix from task-17 findings
- **Priority:** P1 (do this before the query-shape tasks 19–22; it's what actually caps throughput)
- **Depends on:** task-12 (containerization), task-17 (k6 suite, to verify)
- **Status:** ✅ Implemented & verified (2026-05-27, branch `perf/tasks-18-21`)

## Why

The task-17 `stress` run collapsed uniformly: ~60% request failures, p95 ~5s, max ~25s,
and **all query-shape variants converged** to the same latency. That signature means the
ceiling is a shared resource upstream of the queries, not any single query. The code
confirms it:

- `backend/entrypoint.sh` runs `uvicorn app.main:app` with **one worker** → a single
  asyncio event loop for the whole process.
- `backend/app/db/session.py` uses `create_async_engine(..., pool_pre_ping=True)` with
  **default pool sizing** (`pool_size=5`, `max_overflow=10` → max 15 connections), and
  `pool_pre_ping` adds a `SELECT 1` round-trip on every checkout.
- No `statement_timeout`, so a slow request hangs for tens of seconds instead of failing fast.

## Objective

Give the backend headroom for concurrent load: more event loops, an explicitly sized and
tuned connection pool, and timeouts that fail fast — all env-configurable, with Postgres
`max_connections` sized to match.

## Deliverables

- `backend/app/core/config.py` — new settings (with safe defaults):
  `web_concurrency: int = 2`, `db_pool_size: int = 10`, `db_max_overflow: int = 20`,
  `db_pool_timeout: int = 30`, `db_statement_timeout_ms: int = 15000`.
- `backend/app/db/session.py` — pass the pool settings to `create_async_engine`
  (`pool_size`, `max_overflow`, `pool_timeout`, `pool_recycle`); set a server-side
  `statement_timeout` via asyncpg `connect_args={"server_settings": {"statement_timeout": ...}}`;
  reconsider `pool_pre_ping` (drop it or keep only with a recycle window — it costs a
  round-trip per checkout).
- `backend/entrypoint.sh` — run uvicorn with `--workers ${WEB_CONCURRENCY}` (or switch to
  `gunicorn -k uvicorn.workers.UvicornWorker -w ${WEB_CONCURRENCY}`).
- `docker-compose.yml` / `.env.example` — surface `WEB_CONCURRENCY` and the pool vars; set
  Postgres `max_connections` (via `command: -c max_connections=...`) ≥
  `WEB_CONCURRENCY × (db_pool_size + db_max_overflow)` + headroom.

## Implementation Notes

- **Each uvicorn worker is a separate process with its own asyncio loop and its own pool.**
  Total DB connections = `workers × (pool_size + max_overflow)`. With Postgres default
  `max_connections=100`, e.g. 2 workers × (10+20) = 60 is safe; 4 × 30 = 120 would exceed
  it — coordinate the two or connections get refused (a *new* failure mode).
- The lifespan **seeding** runs per worker on startup; it's idempotent (no-op once rows
  exist), but expect N workers to race the count check harmlessly on a fresh DB. Fine, but
  note it.
- `statement_timeout` converts the 25s hangs into fast, clean errors — better signal and
  frees connections sooner under load.
- Don't over-provision workers beyond CPU cores; the DB, not the app, is the next ceiling.

## Acceptance Criteria

- Re-running task-17 `stress` (same target rates) drops the failure rate from ~60% toward
  the `<1%` threshold and raises sustained `http_reqs/s` materially over the baseline run.
- `load` profile holds within the per-endpoint p95 budgets.
- Total DB connections at peak stay under Postgres `max_connections` (no "too many
  connections" errors in `docker logs ascertain-db`).
- Record the before/after numbers in this file (and in task-17's Findings).

## Outcome (measured)

Implemented: 2 uvicorn workers (`WEB_CONCURRENCY`), explicit pool (`pool_size=10`,
`max_overflow=20`, `pool_recycle` replacing `pool_pre_ping`), a 15s `statement_timeout`,
seed moved to the entrypoint (once, before forking), and Postgres `max_connections=200`.

Re-running task-17 `stress` (combined target ~1200 rps), before → after:

| Metric | Before | After |
|---|---|---|
| `http_req_failed` | **60.20%** | **0.01%** |
| checks pass | 51.14% | 99.99% |
| max latency | ~25.7s | ~30s (tail, on the still-saturated list/search) |

The failure collapse is gone. Combined with task-19, the `dashboard` scenario p95 dropped
from ~5s (collapsed) to **178ms** under the same stress. At realistic sustained traffic
(`load`, ~722 rps) **all thresholds pass**: dashboard 57ms / list 113ms / search 121ms p95,
0% failures.

**Remaining ceiling:** under `stress` peak, `browse_list` and `search` p95 still hit ~7s
(thresholds breached) — the per-request `COUNT(*)` + offset cost saturating the DB at
~1000 rps combined. That's task-22's territory (deferred). More workers would also help,
bounded by `max_connections`.
