# Task 07 — Frontend Layout, Routing & Lazy Loading

- **Assignment:** Part 2 (items 2, 4) + performance stretch (code splitting)
- **Depends on:** task-02
- **Status:** Not started

## Objective

Build the responsive application shell (header, sidebar, main content) and the routing
table, with lazy-loaded route components and a 404 page.

## Deliverables

- `frontend/src/components/layout/AppShell.tsx` — header with navigation + collapsible
  sidebar + main content `<Outlet />`. Sidebar becomes a temporary `Drawer` on small
  screens (MUI `useMediaQuery`).
- `frontend/src/App.tsx` / router config — routes:
  - `/` → `Dashboard` (KPIs / counts overview)
  - `/patients` → `Patients` (list)
  - `/patients/new` → `PatientForm` (create)
  - `/patients/:id` → `PatientDetail`
  - `/patients/:id/edit` → `PatientForm` (edit)
  - `*` → `NotFound`
- `frontend/src/pages/Dashboard.tsx`, `NotFound.tsx` (others are placeholders filled by
  later tasks).

## Implementation Notes

- Wrap route element components in `React.lazy` + a `<Suspense>` fallback (spinner) for
  code-splitting — directly serves the performance stretch goal.
- Header nav links use React Router `NavLink` with active styling.
- The Dashboard can show simple aggregate counts (total patients, by status) using the
  existing `GET /patients` data — keep it lightweight; no chart required.
- Responsive: verify layout at narrow widths (sidebar collapses, content reflows).

## Acceptance Criteria

- All routes resolve; unknown paths render the 404 page.
- Route bundles are split (separate chunks visible in `vite build` output).
- Layout is usable on small/low-resolution screens (sidebar drawer toggles).
