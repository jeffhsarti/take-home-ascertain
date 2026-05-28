# Task 16 — Dashboard data visualization

- **Assignment:** Advanced UI/UX (data visualization — patient status chart)
- **Depends on:** task-14 (stats endpoint), task-15 (theme)
- **Status:** Not started

## Objective

Turn the dashboard from four bare numbers into an at-a-glance overview with charts, using
the `/patients/stats` aggregates and `@mui/x-charts` so visuals inherit the MUI theme and
dark mode automatically.

## Deliverables

- Add dependency `@mui/x-charts`.
- `frontend/src/hooks/usePatientStats.ts` — TanStack Query hook for `GET /patients/stats`;
  **replaces** `useDashboardStats` (delete it and its 4-call implementation).
- `frontend/src/api/patients.ts` — `getPatientStats()` client + a `PatientStats` type in
  `frontend/src/types/index.ts` mirroring the backend schema.
- `frontend/src/components/dashboard/` charts, each wrapped in a themed `Card` with a title:
  - `StatusDonut.tsx` — `PieChart` (donut, `innerRadius`); the explicit "patient status
    chart". Colors match `StatusChip` (active/inactive/discharged).
  - `AgeHistogram.tsx` — `BarChart` over the five age buckets.
  - `BloodTypeBars.tsx` — `BarChart` over the 8 blood types.
  - `TopConditionsBars.tsx` — `BarChart` with `layout="horizontal"`, top conditions.
- `frontend/src/pages/Dashboard.tsx` — compose the redesigned `StatCard` row (from task-15)
  plus a responsive chart grid.

## Implementation Notes

- **Library:** `@mui/x-charts` (MIT) integrates with the existing MUI theme — no separate
  styling layer, palette/dark mode come for free. Define a single status→color map shared
  with `StatusChip` so the donut and chips agree.
- **Responsive:** charts size to their container (x-charts autosizing / parent width); the
  grid is `repeat(2, 1fr)` on desktop, single column on mobile. Verify on a narrow viewport
  per the challenge's low-resolution requirement.
- **Loading/empty/error:** skeleton placeholders (task-15) while the query is pending; a
  friendly empty message if a dataset is all-zero; reuse the existing error `Alert`.
- **One request:** the dashboard now makes a single `/patients/stats` call instead of four
  list calls — note this in the README as a performance/architecture decision.
- Keep chart components presentational (data in via props); the page owns the query.

## Acceptance Criteria

- Dashboard renders the status donut plus age, blood-type, and top-conditions charts from
  live aggregates, in one network request.
- Charts restyle correctly when toggling dark/light and remain legible on a narrow screen.
- StatCards and the donut use identical status colors.
- `npm run lint`, `npm run build`, and tests pass.
