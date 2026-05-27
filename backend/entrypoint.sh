#!/bin/sh
set -e

# Apply schema migrations, then serve. Data seeding runs in the app lifespan
# (idempotent), so it happens on startup for both Docker and local `uvicorn`.
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
