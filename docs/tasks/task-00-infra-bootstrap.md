# Task 00 — Infrastructure Bootstrap (Database Provisioning)

- **Assignment:** Part 1 (PostgreSQL setup) + foundation for Part 5
- **Depends on:** —
- **Status:** Not started

## Objective

Provision PostgreSQL via docker-compose **from the very start**, so all backend work
(migrations, seed, CRUD) runs against a real database, and establish the environment-
variable contract and the docker-compose skeleton that the rest of the build extends.

This removes the implicit "containerization comes last" dependency: backend tasks no
longer wait on task-12 to have a database to run against.

## Deliverables

- `docker-compose.yml` with a **`db` service** only (postgres:16-alpine, named volume,
  `healthcheck` via `pg_isready`, host port 5432). Backend/frontend services are appended
  later in task-12.
- `.env.example` (and a local `.env`) seeding the env contract:
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - `DATABASE_URL` — async URL. Host-side dev points at `localhost:5432`
    (`postgresql+asyncpg://USER:PASS@localhost:5432/DB`); the in-compose backend (task-12)
    overrides the host to the service name `db`.
- A one-liner in the docs: bring up just the database with `docker compose up -d db`.

## Implementation Notes

- **Host vs container DB host:** during local development you run `uvicorn` on the host
  against the dockerized Postgres (`localhost:5432`). When the backend itself runs in
  Compose (task-12), `DATABASE_URL` is overridden via the service `environment` to use
  host `db`. Document both clearly so there's no confusion.
- Named volume → data persists across restarts.
- Healthcheck → task-12's backend can `depends_on: db: condition: service_healthy`.
- Note the intent to use a **separate test database** for task-11 (same server, different
  DB name) and document creating it.

## Acceptance Criteria

- `docker compose up -d db` starts Postgres and the healthcheck reports healthy.
- From the host, the app/`psql` connects using `DATABASE_URL`.
- `alembic upgrade head` (task-03) succeeds against this database.
- Data survives `docker compose restart db` (volume works).
