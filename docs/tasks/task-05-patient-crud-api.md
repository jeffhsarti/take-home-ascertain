# Task 05 — Patient CRUD + List Endpoint

- **Assignment:** Part 2 (item 1) + stretch (sort/filter query params)
- **Depends on:** task-03
- **Status:** Not started

## Objective

Implement the full patient CRUD surface, with a list endpoint that supports pagination,
search, status filtering, and sorting — all server-side — plus proper validation and
HTTP status codes.

## Deliverables

- `backend/app/schemas/patient.py` — `PatientCreate`, `PatientUpdate`, `PatientRead`
  (with derived `age`), and a generic `Paginated[T]` (`items`, `total`, `page`,
  `page_size`, `total_pages`).
- `backend/app/services/patients.py` — query builder: filtering, sorting, pagination,
  and CRUD helpers operating on `AsyncSession`.
- `backend/app/api/patients.py` — router:
  - `GET /patients` — query params `page` (default 1), `page_size` (default 20, max 100),
    `search` (name/email, case-insensitive `ILIKE`), `status`, `sort_by`
    (whitelist: last_name, last_visit, status, created_at), `sort_order` (asc/desc).
  - `GET /patients/{id}` — 404 if missing.
  - `POST /patients` — 201 + created resource.
  - `PUT /patients/{id}` — full update; 404 if missing.
  - `DELETE /patients/{id}` — 204.

## Implementation Notes

- Validation in schemas: valid email, non-future `date_of_birth`, enum membership for
  `blood_type`/`status`, `allergies`/`conditions` as `list[str]`. Invalid input → 422
  (FastAPI default) with field-level detail.
- `sort_by` must be validated against a whitelist (avoid arbitrary column injection);
  unknown values → 400 or fall back to default sort.
- `age` derived in `PatientRead` via a computed/validator from `date_of_birth`.
- Count query for `total` runs alongside the paged query.

## Acceptance Criteria

- All five endpoints behave per the table; correct status codes (200/201/204/404/422).
- `GET /patients?search=...&status=...&sort_by=...&sort_order=...&page=...&page_size=...`
  returns correctly filtered/sorted/paged results with accurate `total`/`total_pages`.
- Creating/updating with invalid data returns 422 with useful messages.
