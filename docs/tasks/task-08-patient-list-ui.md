# Task 08 — Patient List UI

- **Assignment:** Part 2 (item 3) + performance stretch (virtualization, memoization)
- **Depends on:** task-05, task-07
- **Status:** Not started

## Objective

Implement the patient list with search, filtering, sorting, and pagination, backed by the
list endpoint — efficient for 100+ patients and non-blocking on search.

## Deliverables

- `frontend/src/hooks/usePatients.ts` — TanStack Query hook wrapping `GET /patients`,
  keyed by `{page, pageSize, search, status, sortBy, sortOrder}`, with
  `placeholderData: keepPreviousData`.
- `frontend/src/components/patients/PatientList.tsx` — MUI `DataGrid` with columns:
  name, age, last visit, status (chip). Server-side pagination, sorting, and filtering
  driven by the Zustand UI store + query params.
- `frontend/src/components/patients/SearchBar.tsx` — debounced search input.
- `frontend/src/components/patients/StatusChip.tsx` — memoized status pill.
- `frontend/src/pages/Patients.tsx` — composes the above.

## Implementation Notes

- **Server-side everything:** set `paginationMode`, `sortingMode`, `filterMode` to
  `'server'` on the `DataGrid`; feed `rowCount` from the response `total`. This keeps the
  client efficient regardless of dataset size.
- **Virtualization:** `DataGrid` virtualizes rendered rows natively — note this in the
  README as the performance-stretch implementation.
- **Non-blocking search:** debounce the input (~300ms) before updating the query key;
  combined with `keepPreviousData`, the grid shows prior rows (dimmed/loading) instead of
  blanking while the next page loads. Optionally wrap state updates in `startTransition`.
- **Memoization:** memoize column definitions (`useMemo`) and cell renderers
  (`React.memo`) to avoid needless re-renders.
- Row click → navigate to `/patients/:id`. Include a "New patient" action → `/patients/new`.
- Sync search/filter/sort/page into the URL query string (deep-linkable, survives reload).

## Acceptance Criteria

- List renders seeded patients with working server-side pagination, sort, and status
  filter.
- Typing in search does not freeze the UI; results update after debounce.
- Scrolling/paging through 100+ patients stays smooth.
