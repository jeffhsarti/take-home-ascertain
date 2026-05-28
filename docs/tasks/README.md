# Tasks

Implementation broken into ordered, reviewable units. Each file is self-contained:
objective, file deliverables, implementation notes, and acceptance criteria.

See [`../plan.md`](../plan.md) for the overall architecture and decisions.

| # | Task | Assignment | Depends on |
|---|---|---|---|
| 00 | [Infra bootstrap (DB provisioning)](./task-00-infra-bootstrap.md) | Part 1 / Part 5 foundation | — |
| 01 | [Backend scaffold & tooling](./task-01-backend-scaffold.md) | Part 1 | — |
| 02 | [Frontend scaffold & tooling](./task-02-frontend-scaffold.md) | Part 1 | — |
| 03 | [DB models & Alembic migrations](./task-03-database-models-migrations.md) | Part 1 + stretch | 00, 01 |
| 04 | [Seed data](./task-04-seed-data.md) | Part 1 | 03 |
| 05 | [Patient CRUD + list endpoint](./task-05-patient-crud-api.md) | Part 2 + stretch | 03 |
| 06 | [Notes & summary endpoints](./task-06-notes-summary-api.md) | Part 3 | 05 |
| 07 | [Frontend layout, routing & lazy loading](./task-07-frontend-layout-routing.md) | Part 2 + perf | 02 |
| 08 | [Patient list UI](./task-08-patient-list-ui.md) | Part 2 + perf | 05, 07 |
| 09 | [Patient detail: notes & summary UI](./task-09-patient-detail-notes-summary-ui.md) | Part 3 | 06, 07 |
| 10 | [Patient create/edit form](./task-10-patient-form.md) | Part 4 | 05, 07 |
| 11 | [Testing](./task-11-testing.md) | stretch | 05, 06, 08, 10 |
| 12 | [Containerization](./task-12-containerization.md) | Part 5 | 00, 05, 06, 10 |
| 13 | [README & developer docs](./task-13-readme.md) | Part 5 | all |
| 14 | [Patient stats aggregation endpoint](./task-14-patient-stats-endpoint.md) | UI/UX viz + Advanced Backend | 05 |
| 15 | [Theme overhaul, dark mode & polish](./task-15-theme-overhaul-dark-mode.md) | Advanced UI/UX | 07 |
| 16 | [Dashboard data visualization](./task-16-dashboard-data-visualization.md) | Advanced UI/UX | 14, 15 |
| 17 | [k6 performance & stress tests](./task-17-k6-performance-tests.md) | Performance (stretch) | 05, 14 |
| 18 | [Backend concurrency & pool capacity](./task-18-backend-concurrency-capacity.md) | Perf follow-up · **P1** | 12, 17 |
| 19 | [Cache `/patients/stats`](./task-19-cache-patient-stats.md) | Perf follow-up · P2 | 14, 17 |
| 20 | [Search min-length guard](./task-20-search-min-length-guard.md) | Perf follow-up · P2 | 05, 08, 17 |
| 21 | [Indexes for sortable columns](./task-21-sortable-column-indexes.md) | Perf follow-up · P2 | 03, 05, 17 |
| 22 | [Keyset pagination & count strategy](./task-22-keyset-pagination-count-strategy.md) | Perf follow-up · P3 | 05, 08, 21, 17 |
| 23 | [k6 write-path smoke tests](./task-23-k6-write-smoke-tests.md) | Perf follow-up · P3 | 05, 06, 17, 21 |

**Suggested execution order:** 00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13.
Task 00 stands up Postgres first so the backend can be developed against a real database
from the start. Backend (01,03,04,05,06) and frontend (02,07,08,09,10) tracks can largely
proceed in parallel once their scaffolds exist. Task 12 **extends** the compose file from
task 00 with the backend and frontend services.

Tasks 14–16 are a post-MVP polish/visualization pass: 14 (backend stats) and 15 (theme)
are independent and can run in parallel; 16 (charts) depends on both. Order: 14 + 15 → 16.

Task 17 (k6 perf/stress suite) is an independent stretch item; it only *measures* the
read paths (list, search, stats) and needs the stack running with the 10k seed.

Tasks 18–23 are **optimization & coverage follow-ups proposed from the task-17 findings**
(the stress run collapsed uniformly → capacity, not query shape, is the first-order
ceiling).

- **18–21: ✅ implemented & verified** (branch `perf/tasks-18-21`). Re-measuring with
  task-17: `http_req_failed` 60% → 0.01%, dashboard p95 ~5s → 178ms; all SLOs pass at
  realistic `load`. See each task's Outcome and task-17's Findings.
- **22 (keyset pagination): deferred** by request — the remaining list/search ceiling under
  extreme `stress` lives here, but it's not needed at realistic traffic.
- **23 (write-path smoke): proposed** — adds a regression canary for `POST/PUT/DELETE`
  paths (especially relevant after task-21 added write-amplifying indexes). Smoke-only:
  full load/stress on writes is deliberately deferred until a volumetria target exists,
  since arbitrary write SLOs would be invented and open-model arrival rate would pollute
  the read dataset. Rationale documented in the task body.
