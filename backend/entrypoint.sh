#!/bin/sh
set -e

# Apply schema migrations.
alembic upgrade head

# Seed once, before forking workers, so N workers don't race the idempotent seed
# (deterministic emails would collide on the unique constraint). The lifespan seed in
# app.main stays as a safety net for single-process local dev (`uvicorn --reload`),
# where it's a no-op once rows exist.
python -m app.seed

# Serve with WEB_CONCURRENCY worker processes; each is its own event loop + DB pool.
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${WEB_CONCURRENCY:-2}"
