# Task 13 — README & Developer Docs

- **Assignment:** Part 5 / Submission requirements (comprehensive yet succinct README)
- **Depends on:** all
- **Status:** Not started

## Objective

Write the top-level `README.md` so a reviewer can run the project and understand the
decisions quickly.

## Deliverables

- Root `README.md` covering:
  - **Overview** — what the app is, one screenshot/GIF if time allows.
  - **Quick start (Docker)** — `cp .env.example .env && docker compose up --build`;
    URLs (`localhost:8080` app, `localhost:8000/docs` Swagger).
  - **Local dev (no Docker)** — backend (`venv`, install, `alembic upgrade head`,
    `uvicorn`) and frontend (`npm install`, `npm run dev`) steps; note the Vite `/api`
    proxy.
  - **Environment variables** — table referencing `.env.example`, calling out that
    `ANTHROPIC_API_KEY` is optional (summary falls back to a template).
  - **Architecture & decisions** — the stack table and the *why* (link to
    `docs/plan.md`).
  - **API reference** — endpoint table (or link to `/docs`).
  - **Testing** — how to run `pytest` and `npm test`.
  - **Project structure** — short tree.
  - **Notes / trade-offs / what I'd do next** — honest scope notes given the time box.

## Acceptance Criteria

- A reader who has never seen the repo can launch it from the README alone.
- README is accurate against the final code (endpoints, ports, commands, env vars).
- Succinct — skimmable headings, no walls of text.
