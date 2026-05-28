# Task 20 — Search minimum-length guard (trigram floor)

- **Assignment:** Performance follow-up — query-shape (hypothesis #2) from task-17
- **Priority:** P2 (cheap; also a UX/correctness win)
- **Depends on:** task-05 (list/search endpoint), task-08 (search UI), task-17
- **Status:** ✅ Implemented & verified (2026-05-27) — **contract: 422** for non-empty terms
  below the floor (3); whitespace-only is treated as no filter. Backend guard + frontend
  request guard + "type at least N characters" hint. k6 `term_kind:short` replaced with
  `prefix` (3-char) since sub-floor terms now 422. Backend tests added.

## Why

The trigram GIN indexes backing the `ILIKE '%term%'` search need **≥ 3 characters** to
produce a trigram; a 1–2 char term falls back to a sequential scan over all three columns.
The smoke baseline showed `term_kind:short` p95 (~23ms) materially above `full` (~16ms) and
`nomatch` (~4ms) — and short terms also return huge, low-value result sets.

## Objective

Refuse (or no-op) sub-trigram search terms so the API never issues an unindexed full-table
scan, and the UI never fires a search that can't be index-served.

## Deliverables

- `backend/app/api/patients.py` — enforce a minimum search length (default 3). Decide and
  document the contract: either return `422` with a clear message, or treat a too-short
  `search` as "no search filter". (Recommend `422` — explicit and testable.)
- `backend/app/core/config.py` — `search_min_length: int = 3`.
- `frontend/src/components/patients/SearchBar.tsx` / `hooks/usePatients.ts` — don't issue the
  request until the trimmed term reaches the floor (it already debounces); show a subtle hint.
- Tests: backend rejects/ignores `search="a"`; frontend doesn't call the API below the floor.

## Implementation Notes

- Apply the floor to the **trimmed** term; an all-whitespace term is "no search".
- pg_trgm's index applies to `ILIKE '%x%'` only when the pattern yields a trigram (3 chars).
  A 3-char floor matches that exactly; going to 2 would still seq-scan.
- **Couples to task-17:** if this lands as `422`, update `perf/k6/data.js` `term_kind:short`
  expectations (those requests become fast 422s, not slow 200s) so the suite stays green.

## Acceptance Criteria

- A search below the floor never produces a sequential scan (verify with
  `EXPLAIN ANALYZE` on `first_name ILIKE '%ab%'` vs the guarded path).
- task-17's `search{term_kind:short}` no longer issues an unindexed query (fast reject, or
  filter dropped).
- Full-surname and email searches are unchanged and still index-backed.
