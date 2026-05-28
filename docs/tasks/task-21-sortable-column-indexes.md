# Task 21 — Indexes for the remaining sortable columns

- **Assignment:** Performance follow-up — query-shape (hypothesis #4) from task-17
- **Priority:** P2 (cheapest win; one migration)
- **Depends on:** task-03 (schema/migrations), task-05 (sort params), task-17
- **Status:** ✅ Implemented & verified (2026-05-27) — migration `c3d4e5f6a7b8` adds btree
  indexes on `first_name`, `last_visit`, `created_at`; applied at head. At realistic `load`
  the indexed/unindexed sort gap is gone (both within budget); under extreme `stress` the
  difference is masked by DB saturation (task-22 territory).

## Why

Only `last_name`, `status`, and `email` are indexed. Sorting the list by `first_name`,
`last_visit`, or `created_at` (all exposed via `sort_by`) forces Postgres to sort the
filtered set. The smoke baseline showed `sort:unindexed` p95 (~11ms) above `sort:indexed`
(~7ms); the gap widens with the result set and offset.

## Objective

Add btree indexes so every value in the `sort_by` whitelist has index support, letting the
planner satisfy `ORDER BY ... LIMIT` from an index instead of sorting.

## Deliverables

- `backend/alembic/versions/<new>.py` — a migration creating btree indexes on
  `patients.first_name`, `patients.last_visit`, and `patients.created_at` (with matching
  `DROP INDEX` in `downgrade`). Mirror the naming used in
  `b2c3d4e5f6a7_add_indexes_and_unique_email.py` (`ix_patients_<col>`).

## Implementation Notes

- The `sort_by` whitelist in `app/services/patients.py` is `first_name`, `last_name`,
  `last_visit`, `status`, `created_at` — the three above are the unindexed ones.
- An index helps `ORDER BY col LIMIT n` most on **shallow** pages; with a large OFFSET the
  scan cost remains (that's task-22's concern). Still a clear win for the common case.
- Indexes are written on every insert/update — negligible here (read-heavy, modest write
  volume), but worth a one-line note in the migration.
- Consider whether any sort is always paired with a filter (e.g. `status` + `last_visit`);
  a composite index could help, but start with the single-column indexes and re-measure.

## Acceptance Criteria

- `EXPLAIN ANALYZE` on `... ORDER BY first_name LIMIT 20` shows an index scan, not a sort.
- task-17's `sort:unindexed` p95 converges toward `sort:indexed`.
- `alembic upgrade head` / `downgrade` apply cleanly.
