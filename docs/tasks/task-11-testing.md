# Task 11 — Testing

- **Assignment:** Stretch goal (Testing & Quality)
- **Depends on:** task-05, task-06, task-08, task-10
- **Status:** Not started

## Objective

Add automated tests proving the core API and critical UI behave correctly.

## Backend (pytest + pytest-asyncio + httpx)

- `backend/tests/conftest.py` — fixtures: a dedicated **Postgres test database**, an
  async session, and an `AsyncClient` (httpx `ASGITransport`) against the app with the
  `get_db` dependency overridden to a transactional session that **rolls back per test**.
- `test_health.py` — `/health`.
- `test_patients.py` — CRUD happy paths; 404s; 422 on invalid input; list
  pagination/search/status filter/sort correctness.
- `test_notes.py` — create/list/delete; cascade on patient delete.
- `test_summary.py` — template summary contains identifiers + conditions/allergies +
  notes narrative **with no API key** (LLM path not exercised in CI).

## Frontend (Vitest + React Testing Library + MSW)

- `frontend/src/tests/setup.ts` — jest-dom + MSW server lifecycle.
- Handlers in MSW mocking the patient/notes endpoints.
- `PatientList` test — renders rows; typing in search triggers a (debounced) refetch.
- `PatientForm` test — client validation blocks submit on bad input; a mocked 422 maps to
  field errors.
- Notes flow test — add and delete update the list.

## Implementation Notes

- Keep tests deterministic and offline (no real Anthropic calls — rely on the template
  path or mock the client).
- Provide a `DATABASE_URL` for the test DB (separate from dev) via env / compose `test`
  profile; document the command in the README.

## Acceptance Criteria

- `cd backend && pytest` passes.
- `cd frontend && npm test` passes.
- Tests run without network access and without an `ANTHROPIC_API_KEY`.
