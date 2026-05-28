# Task 15 — Theme overhaul, dark/light toggle & UI polish

- **Assignment:** Advanced UI/UX (dark/light theme switching) + overall visual polish
- **Depends on:** task-07
- **Status:** Not started

## Objective

Replace the near-default MUI theme with a cohesive, healthcare-appropriate design system,
add a persisted dark/light toggle, and polish the shell and key surfaces so the app reads
as a finished product rather than a scaffold.

## Deliverables

- `frontend/src/theme/index.ts` → `createAppTheme(mode: 'light' | 'dark')` factory:
  - **Palette:** tuned primary/secondary plus calm neutral background/paper and divider for
    both modes; status colors aligned with `StatusChip` (success/grey/warning).
  - **Typography:** Inter (via `@fontsource/inter`); refined h1–h6 weights/sizes,
    `button.textTransform: 'none'`.
  - **Shape:** `borderRadius` ~10–12.
  - **Component defaults:** `MuiAppBar` (elevation 0 + bottom border, surface color not
    primary blue), `MuiCard`/`MuiPaper` (subtle border + soft shadow), `MuiButton`
    (`disableElevation`), `MuiDrawer` (border instead of shadow).
- `frontend/src/store/uiStore.ts` — add `themeMode` + `toggleThemeMode`, persisted to
  `localStorage`; initial value seeded from `prefers-color-scheme`.
- `frontend/src/main.tsx` — subscribe to `themeMode` and feed `createAppTheme(mode)` into
  `ThemeProvider`; keep `CssBaseline`.
- `frontend/src/components/layout/AppShell.tsx`:
  - AppBar: brand mark/icon + title, a dark/light toggle `IconButton` (sun/moon), optional
    avatar placeholder on the right.
  - Drawer: active nav item rendered as a rounded "pill" highlight; tightened spacing.
- `frontend/src/components/common/` — small reusables: a `PageHeader` (title + optional
  action) and a `StatCard` (icon + accent + label + value) used by the dashboard.
- Loading polish: replace bare `CircularProgress` with MUI `Skeleton` placeholders on the
  dashboard, patient detail, and list-empty states; add tidy empty states for notes and an
  empty patient list.

## Implementation Notes

- A single theme **factory** keyed by mode keeps light/dark in sync and avoids duplicated
  config; charts (task-16) then inherit palette/dark mode for free.
- Persisting via the existing Zustand store (with `persist` middleware) avoids a flash:
  read `localStorage`/`prefers-color-scheme` before first paint.
- Keep changes additive — existing pages keep working; this task is styling + shell, not
  behavior. Status color semantics must stay identical to `StatusChip` so charts match.

## Acceptance Criteria

- Toggling theme switches the whole app and the choice survives reload.
- AppBar, drawer, cards, and inputs reflect the new theme in both modes (no leftover
  default-blue AppBar / flat cards).
- Dashboard and detail show skeletons (not bare spinners) while loading; empty states read
  cleanly.
- `npm run lint`, `npm run build`, and existing tests pass.
