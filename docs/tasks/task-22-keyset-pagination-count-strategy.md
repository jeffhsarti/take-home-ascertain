# Task 22 — Keyset pagination & count strategy for deep pages

- **Assignment:** Performance follow-up — query-shape (hypothesis #3) from task-17
- **Priority:** P3 (largest change, lowest urgency; touches the API contract + frontend)
- **Depends on:** task-05 (list endpoint), task-08 (list UI), task-21 (sort indexes), task-17
- **Status:** Not started — proposed from k6 findings, awaiting prioritization

## Why

List pagination is OFFSET-based: page 499 issues `OFFSET 9960`, scanning and discarding
~10k rows, and a `COUNT(*)` over the filtered subquery runs on **every** request. The smoke
baseline showed `depth:deep` p95 (~11ms) above `shallow` (~7ms); the gap grows with table
size. Both costs are O(table) rather than O(page).

## Objective

Make deep navigation O(page) and stop paying a full `COUNT(*)` per request — without
regressing the list UX.

## Deliverables (decide the approach during review)

- **Keyset/cursor pagination** in `app/services/patients.py` + `app/api/patients.py`:
  `WHERE (sort_col, id) > (:last_sort, :last_id) ORDER BY sort_col, id LIMIT n`, returning an
  opaque `next_cursor`. Requires a stable tiebreaker (`id`) and an index on `(sort_col, id)`
  (ties into task-21).
- **Count strategy:** cache the unfiltered total (it changes rarely), and/or use an
  approximate count (`reltuples`) for unfiltered lists; keep an exact count only for narrow
  filtered queries where it's cheap.
- **Frontend:** `frontend/src/components/patients/PatientList.tsx` + `hooks/usePatients.ts`
  + `api/patients.ts` — adapt the DataGrid, which is **page-based and shows a total**.

## Implementation Notes

- **This is an API-contract + UX decision, not a pure backend swap.** MUI `DataGrid` wants a
  total row count and random page jumps; keyset gives efficient next/prev but not "jump to
  page 250". Options to weigh in review:
  1. **Keyset for next/prev**, drop the total (or show "many"): cleanest perf, changes UX.
  2. **Keep page-based UX but cap `page`** to a sane max and **cache the total** — small
     change, kills the worst case without a contract break. *(Recommended first step.)*
  3. **Hybrid:** page-based for the first N pages, cursor beyond. Most complex.
- Note the existing pagination URL-state/`paginationModel` gotcha (see the DataGrid
  pagination memory) when touching the grid.
- Re-measure after task-18/21: capacity + sort indexes may shrink the deep-page gap enough
  that option 2 is sufficient.

## Acceptance Criteria

- task-17's `browse_list{depth:deep}` p95 approaches `{depth:shallow}` (no O(offset) scan on
  the chosen path).
- `COUNT(*)` is no longer executed on every list request (cached/approximate, or removed).
- The list UI still paginates correctly and the chosen total/cursor behavior is documented.
