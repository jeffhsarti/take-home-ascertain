# Task 19 — Cache the `/patients/stats` aggregation

- **Assignment:** Performance follow-up — query-shape (hypothesis #1) from task-17
- **Priority:** P2 (after task-18; re-measure first — capacity may already relieve this)
- **Depends on:** task-14 (`/patients/stats`), task-17
- **Status:** ✅ Implemented & verified (2026-05-27) — per-process TTL cache (default 60s).
  Under task-17 `stress`, dashboard p95 dropped from ~5s (collapsed) to **178ms**; it's now
  the fastest scenario. Tests cover cache hit (TTL>0) and disabled (TTL=0).

## Why

`/patients/stats` is the costliest endpoint (smoke baseline p95 ~23ms vs ~7–16ms for list/
search): it re-runs five aggregations on every call — status & blood-type `GROUP BY`,
`EXTRACT(YEAR FROM AGE())` bucketing, and a **JSONB lateral unnest** of `conditions` across
all 10k rows — with no caching. The dashboard is the landing page, so it takes traffic on
every session open.

## Objective

Serve dashboard aggregates from a short-lived cache so repeated loads don't re-aggregate the
whole table, while keeping the numbers fresh enough for a dashboard.

## Deliverables

- `backend/app/services/patients.py` — wrap `get_patient_stats` with an async-safe,
  time-bounded cache (single cached `PatientStats` value + timestamp, guarded by an
  `asyncio.Lock`; refresh when older than the TTL).
- `backend/app/core/config.py` — `stats_cache_ttl_seconds: int = 60` (0 disables the cache).
- `backend/tests/test_stats.py` — assert a second call within the TTL does **not** re-query
  (e.g. spy/patch the aggregation), and that the shape is unchanged.

## Implementation Notes

- **Default approach: in-process TTL cache.** Simplest, no new infra. Caveat: the cache is
  **per uvicorn worker** (see task-18), so with N workers a value can be up to TTL stale and
  workers may differ briefly — acceptable for a stats dashboard.
- **If stronger freshness/consistency is needed later:** a periodically-refreshed
  materialized view / rollup table, or a shared cache (Redis). Note as alternatives; don't
  build them now.
- Keep `get_patient_stats` itself pure; put the caching in a thin wrapper so tests can call
  the uncached function directly.

## Acceptance Criteria

- With the cache warm, task-17's `dashboard` scenario p95 stays flat as load rises (cache
  hits skip the aggregation) instead of climbing fastest.
- Cache miss still returns correct, fully zero-filled aggregates; `sum(by_status) == total`.
- `stats_cache_ttl_seconds=0` restores the always-fresh behavior (tests cover both).
