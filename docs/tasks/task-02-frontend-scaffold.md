# Task 02 — Frontend Scaffold & Tooling

- **Assignment:** Part 1 (Frontend, items 1–3)
- **Depends on:** —
- **Status:** Not started

## Objective

Initialize the Vite + React + TypeScript app and wire up the core dependencies (MUI,
TanStack Query, Zustand, React Router) and dev tooling (ESLint, Prettier, strict
TypeScript) so feature work has a clean base.

## Deliverables

- `frontend/` Vite scaffold (`react-ts` template).
- Dependencies installed: `@mui/material @mui/icons-material @mui/x-data-grid
  @emotion/react @emotion/styled`, `@tanstack/react-query`, `zustand`,
  `react-router-dom`, `react-hook-form zod @hookform/resolvers`, `axios`.
  Dev: `eslint prettier eslint-config-prettier @typescript-eslint/*`, `vitest
  @testing-library/react @testing-library/jest-dom jsdom msw`.
- `frontend/src/main.tsx` — wrap app in `QueryClientProvider`, MUI `ThemeProvider` +
  `CssBaseline`, and `RouterProvider` (router defined in task-07).
- `frontend/src/api/client.ts` — axios instance with `baseURL = '/api'` and a response
  interceptor normalizing errors.
- `frontend/src/theme/index.ts` — MUI theme (palette, typography, default spacing).
- `frontend/src/store/uiStore.ts` — Zustand store skeleton (search, status filter, sort).
- Config: `tsconfig` with `strict: true`, `.eslintrc`/flat config, `.prettierrc`,
  `vitest.config.ts` (jsdom env, setup file with jest-dom).

## Implementation Notes

- `QueryClient` defaults: `staleTime` ~30s, `refetchOnWindowFocus: false`,
  `placeholderData: keepPreviousData` for list queries (set per-query).
- Keep `baseURL = '/api'` so the same build works in Docker (nginx proxy) and in dev
  (Vite proxy `/api → localhost:8000`, configured in `vite.config.ts`).

## Acceptance Criteria

- `npm run dev` serves the app; a placeholder route renders with MUI styling.
- `npm run lint` and `npm run build` (`tsc` + vite build) pass with strict TS.
- `npm test` runs Vitest (even with zero/one trivial test).
- Vite dev proxy forwards `/api` to the backend.
