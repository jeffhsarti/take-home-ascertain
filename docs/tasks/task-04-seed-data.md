# Task 04 — Seed Data

- **Assignment:** Part 1 (Backend, item 3)
- **Depends on:** task-03
- **Status:** Not started

## Objective

Populate the database with realistic sample patients (and a few notes) on startup, so a
freshly launched stack is immediately usable and the "handle 100+ patients" requirement
is genuinely exercised.

## Deliverables

- `backend/app/seed.py` — idempotent seeding routine runnable as `python -m app.seed`
  and callable from the app `lifespan`.

## Implementation Notes

- Use **Faker** to generate ~120 patients (assignment minimum is 15–20; we exceed it to
  test pagination/virtualization). Realistic names, emails, phones, addresses; random
  but sensible `date_of_birth` (ages ~1–95), `blood_type`, `status`, 0–3 allergies and
  0–3 conditions drawn from curated medical word lists, and a `last_visit` within the
  past ~2 years.
- Seed 0–5 notes per patient with timestamps spread over recent months, so summaries
  have material to work with.
- **Idempotent:** check `SELECT COUNT(*) FROM patients`; if non-empty, skip seeding and
  log "already seeded". Use a fixed Faker seed for reproducibility.
- Invoked from `entrypoint.sh` (task-12) after `alembic upgrade head`, and also wired
  into the app `lifespan` for non-Docker local runs (guarded by the idempotency check).

## Acceptance Criteria

- On a fresh DB, running the seed creates ≥100 patients with associated notes.
- Running it a second time is a no-op (no duplicates, no errors).
- `GET /patients` returns the seeded data with realistic field values.
