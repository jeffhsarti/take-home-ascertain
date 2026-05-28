# Performance & stress tests (k6)

Load/stress tests for the read paths behind the **dashboard**, **patient list**, and
**search** — the pages that take traffic first and depend on the heaviest queries — plus
a **write-path smoke** that exercises create/update/delete as a regression canary. The
suite only _measures_; it changes no application code.

It runs against the backend **directly** (`http://localhost:8000`) to isolate FastAPI +
Postgres cost from the nginx proxy. Point it elsewhere with `BASE_URL`.

## Prerequisites

The stack must be up with the full 10k-patient seed:

```bash
docker compose up --build           # from the repo root
curl -s localhost:8000/health        # expect {"status":"ok"}
```

No local k6 install needed — we run the official `grafana/k6` image.

## Running

From the **repo root**. `-w /scripts` makes the JSON summary land in `perf/k6/out/`, and
`--user "$(id -u):$(id -g)"` lets the container (which runs as a non-root user) write that
file as you — drop the summary-write step and you can omit it:

```bash
# Smoke — 1 VU, scenarios run sequentially. Uncontended baseline; run this FIRST.
docker run --rm --network host -w /scripts --user "$(id -u):$(id -g)" \
  -e PROFILE=smoke -v "$PWD/perf/k6:/scripts" grafana/k6 run main.js

# Load — sustained, concurrent traffic at an expected level.
docker run --rm --network host -w /scripts --user "$(id -u):$(id -g)" \
  -e PROFILE=load -v "$PWD/perf/k6:/scripts" grafana/k6 run main.js

# Stress — arrival rate climbs past the knee to find the breaking point.
docker run --rm --network host -w /scripts --user "$(id -u):$(id -g)" \
  -e PROFILE=stress -v "$PWD/perf/k6:/scripts" grafana/k6 run main.js

# Spike — sudden surge then drop; observe recovery.
docker run --rm --network host -w /scripts --user "$(id -u):$(id -g)" \
  -e PROFILE=spike -v "$PWD/perf/k6:/scripts" grafana/k6 run main.js

# Writes-smoke — 1 VU, sequential POST/PUT/DELETE chain. Regression canary only.
docker run --rm --network host -w /scripts --user "$(id -u):$(id -g)" \
  -e PROFILE=writes-smoke -v "$PWD/perf/k6:/scripts" grafana/k6 run main.js
```

Override the target (e.g. through the nginx proxy):

```bash
docker run --rm --network host -w /scripts --user "$(id -u):$(id -g)" \
  -e PROFILE=load -e BASE_URL=http://localhost:8080/api \
  -v "$PWD/perf/k6:/scripts" grafana/k6 run main.js
```

> `--network host` lets the container reach `localhost:8000` on Linux/WSL2. On Docker
> Desktop (macOS/Windows) drop it and use `-e BASE_URL=http://host.docker.internal:8000`.

Each run prints a summary and writes `perf/k6/out/summary-<profile>-<timestamp>.json`
(gitignored).

## Profiles

| Profile        | Executor                              | Shape                             | Answers                                      |
| -------------- | ------------------------------------- | --------------------------------- | -------------------------------------------- |
| `smoke`        | `constant-vus` (1), sequential        | one endpoint at a time, 20s each  | baseline latency per endpoint, no contention |
| `load`         | `ramping-vus`                         | ramp → hold 2m, all concurrent    | does it hold at expected traffic?            |
| `stress`       | `ramping-arrival-rate`                | climb rate in stages (open model) | **where does it break?**                     |
| `spike`        | `ramping-arrival-rate`                | low → surge → low                 | how does it recover from a burst?            |
| `writes-smoke` | `per-vu-iterations` (1 VU, 10 chains) | sequential POST→PUT→note→delete   | has any write path regressed since last run? |

`stress`/`spike` use an **open model** (arrival rate, not VU count): k6 keeps offering the
target request rate even as the server slows, so saturation shows up as rising latency and
dropped iterations — the "knee" — instead of VUs quietly self-throttling.

## Thresholds (pass/fail)

Defined in `k6/lib/config.js`:

- `http_req_failed: rate < 1%`, `checks: rate > 99%`
- `p95` per endpoint: dashboard `< 800ms`, list `< 300ms`, search `< 500ms`

These are **starting** budgets — calibrate them against your `smoke` baseline; absolute numbers depend on the host running Postgres.

## Reading the output — confirming the suspected bottlenecks

The DB is a single local container, so treat the **deltas between tagged variants** (not the absolute ms) as the signal. The summary lists `http_req_duration` sub-metrics per tag:

| Hypothesis                                                                            | Compare these tags                         | Bottleneck if…                                               |
| ------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| **#1 `/patients/stats` is heaviest** — full re-aggregation + JSONB unnest, no cache   | `{scenario:dashboard}` vs list/search p95  | dashboard p95 climbs fastest under `stress`                  |
| **#2 Short search defeats the trigram index** — now guarded (min-length 422, task-20) | `{term_kind:prefix}` vs `{term_kind:full}` | both index-served; sub-floor terms are rejected, not scanned |
| **#3 Deep pagination is O(offset)**                                                   | `{depth:deep}` vs `{depth:shallow}`        | `deep` p95 ≫ `shallow` p95                                   |
| **#4 Unindexed sort columns**                                                         | `{sort:unindexed}` vs `{sort:indexed}`     | `unindexed` p95 ≫ `indexed` p95                              |

Custom trends `dashboard_latency` / `list_latency` / `search_latency` / `writes_latency`
give a quick per-endpoint readout.

## Write-path smoke (`writes-smoke`)

A small **regression canary**, not a capacity test. Each iteration of the `writes`
scenario chains five requests against the same throwaway row:

```
POST /patients  →  PUT /patients/{id}  →  POST /patients/{id}/notes
                                       →  DELETE /patients/{id}/notes/{note_id}
                                       →  DELETE /patients/{id}
```

The summary breaks p95 down per `op` tag (`create` / `update` / `note` / `note_delete`
/ `delete`). Use it to spot a meaningful slowdown vs the previous baseline — _not_ to
prove a throughput target. Calibrate the placeholder thresholds in `lib/config.js`
against your first clean run.

### Cleanup contract

The chain is **net-zero rows** when it runs to completion: every `POST` is paired with
a `DELETE` of the same id, and patient deletion cascades to any orphan notes left from
a partial iteration. A crashed run (Ctrl-C, threshold abort mid-iteration) may leave a
single row behind — that's acceptable for smoke and is easier to debug than a
`TRUNCATE`-on-teardown hook would be.

Verify zero delta around a run:

```bash
docker exec ascertain-db psql -U postgres -d healthcare \
  -c 'SELECT (SELECT count(*) FROM patients) AS patients, (SELECT count(*) FROM notes) AS notes;'
# … run PROFILE=writes-smoke … then re-run the same query and diff.
```

### Why this is smoke-only

`load`/`stress` profiles are deliberately not provided for the write path:

- **No volumetria target.** The read SLOs were calibrated against a dashboard UX
  budget; we have no equivalent for writes (no stated concurrent-editor target, no
  ingestion rate). A pass/fail bar at high RPS would be invented.
- **Open-model arrival rate pollutes the dataset.** A `stress`-style profile against
  `POST /patients` would create hundreds of thousands of fake rows, skewing the read
  suite's page counts, search hits, and stats aggregations until reseeded.
- **The first-order ceiling is already mapped.** task-17's `stress` collapsed
  uniformly on worker/pool capacity; saturating writes would re-discover the same
  ceiling at the cost of a polluted DB.

Promote to a full `writes-load` profile once a real volumetria target exists — that's
deferred future work, scoped in `docs/tasks/task-23-k6-write-smoke-tests.md`.

## Drilling into a regression

To go from symptom to root cause, run `EXPLAIN (ANALYZE, BUFFERS)` on the offending query:

```bash
docker exec -it ascertain-db psql -U postgres -d healthcare
# e.g. EXPLAIN ANALYZE SELECT * FROM patients WHERE first_name ILIKE '%a%' LIMIT 20;
```

## Layout

```
perf/
├── README.md
└── k6/
    ├── main.js               # entry: builds options from PROFILE, re-exports scenarios
    ├── lib/
    │   ├── config.js         # BASE_URL, profiles, thresholds
    │   ├── data.js           # search terms, page depths, sort variants
    │   └── metrics.js        # custom trends + JSON summary writer
    ├── scenarios/            # dashboard.js, browseList.js, search.js, writes.js
    └── out/                  # run artifacts (gitignored)
```

Fixes prompted by the findings (caching `/patients/stats`, a min-length search guard,
keyset pagination, indexes on the remaining sort columns) belong in separate follow-ups —
this suite stays read-only and measurement-only.
