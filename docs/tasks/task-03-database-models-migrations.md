# Task 03 — Database Models & Alembic Migrations

- **Assignment:** Part 1 (Backend, item 2) + stretch (Alembic)
- **Depends on:** task-00 (running Postgres + `DATABASE_URL`), task-01
- **Status:** Not started

## Objective

Define the SQLAlchemy models for `Patient` and `Note`, the async DB session machinery,
and an Alembic setup that lets any developer recreate the schema reproducibly.

## Deliverables

- `backend/app/db/base.py` — `DeclarativeBase` subclass.
- `backend/app/db/session.py` — `create_async_engine`, `async_sessionmaker`, and a
  `get_db()` FastAPI dependency yielding an `AsyncSession`.
- `backend/app/models/patient.py` — `Patient` (see schema below) + `BloodType`,
  `PatientStatus` enums.
- `backend/app/models/note.py` — `Note` with FK to patients (`ON DELETE CASCADE`).
- `backend/alembic.ini` + `backend/alembic/env.py` (async-aware) + initial migration in
  `backend/alembic/versions/`.

## Data Model

**Patient**: `id` UUID pk, `first_name`, `last_name`, `date_of_birth` (Date),
`email`, `phone`, `address_street`, `address_city`, `address_state`, `address_zip`,
`blood_type` (enum), `status` (enum: active/inactive/discharged), `allergies` (JSONB
`list[str]`), `conditions` (JSONB `list[str]`), `last_visit` (Date, nullable),
`created_at`, `updated_at` (server defaults).

**Note**: `id` UUID pk, `patient_id` FK→patients(id) ON DELETE CASCADE, `content` Text,
`created_at` timestamp (default now).

## Implementation Notes

- `age` is **not** stored — it is derived from `date_of_birth` in the response schema.
- Use `mapped_column` / `Mapped[...]` (SQLAlchemy 2.0 typed style).
- Alembic `env.py` must run migrations through the async engine (use
  `connection.run_sync`); import `Base.metadata` as `target_metadata`.
- Configure `alembic.ini`/`env.py` to read `DATABASE_URL` from settings (not hardcoded).

## Acceptance Criteria

- `alembic upgrade head` creates `patients` and `notes` tables (+ enum types) on an
  empty database.
- `alembic downgrade base` cleanly reverses.
- App imports models without circular-import errors.
