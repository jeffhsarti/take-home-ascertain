# Task 17 — k6 performance & stress tests (dashboard + list + search)

- **Assignment:** Performance (stretch) — load testing the read-heavy entry paths
- **Depends on:** task-05 (list/search endpoint), task-14 (`/patients/stats`), stack running with the 10k seed
- **Status:** Implemented — suite lives in `perf/k6/`; `smoke` validated (passes, writes summary artifact)

## Objective

Add a self-contained [k6](https://k6.io) suite that load- and stress-tests the three
endpoints behind the app's **initial pages** and **search**, then surfaces where they
degrade. The suite must (a) prove the paths hold up under realistic concurrency via
pass/fail thresholds, and (b) isolate *which query shape* breaks first so we have evidence
for any future optimization.

**Decisions locked with the user:**
- **Target:** backend **directly** at `http://localhost:8000` (isolates FastAPI + Postgres
  query cost; excludes the nginx proxy). Overridable via `BASE_URL`.
- **Runner:** dockerized `grafana/k6` with `--network host` — zero install.

## Endpoints under test

| Page | Request | Why it's a load concern |
|---|---|---|
| Dashboard (landing) | `GET /patients/stats` | 5 aggregations per call: status/blood-type `GROUP BY`, `EXTRACT(YEAR FROM AGE())` bucketing, and a **JSONB lateral unnest** over 10k rows. No caching — recomputed every request. |
| Patient list (initial) | `GET /patients?page=1&page_size=20&sort_by=last_name&sort_order=asc` | `COUNT(*)` over the filtered subquery **plus** `ORDER BY … OFFSET … LIMIT` on every call. |
| Search | `GET /patients?search=<term>&…` | `OR` of three `ILIKE '%term%'` (first/last/email), backed by trigram GIN — **except terms < 3 chars**, which trigrams can't serve → seq scan. |

## Suspected bottlenecks (hypotheses the suite must confirm or refute)

Each hypothesis is mapped to a tagged scenario variant so the per-tag p95 in the summary
isolates it.

1. **`/patients/stats` is the heaviest request.** Full re-aggregation + JSONB unnest +
   non-sargable `AGE()` per row, no caching. Expect its p95 to climb fastest under stress.
   *Confirms via:* `dashboard` scenario p95 vs the others at equal arrival rate.
   *Likely fixes:* short-TTL cache / materialized counters / precomputed rollup table.
2. **Short search terms defeat the trigram index.** Terms < 3 chars (`"a"`, `"jo"`) fall to
   a sequential scan + triple `ILIKE`. *Confirms via:* `search{term_kind:short}` p95 ≫
   `search{term_kind:full}`. *Likely fix:* min-length guard, or a different match strategy.
3. **Deep pagination is O(offset).** Page 499 (`OFFSET 9960`) scans and discards ~10k rows;
   `COUNT(*)` re-runs the filter every call. *Confirms via:* `browse_list{depth:deep}` p95 ≫
   `{depth:shallow}`. *Likely fixes:* keyset pagination; cache/approximate the total.
4. **Unindexed sort columns.** Only `last_name`, `status`, `email` are indexed; sorting by
   `first_name` / `last_visit` / `created_at` forces a sort of the filtered set.
   *Confirms via:* `browse_list{sort:unindexed}` vs `{sort:last_name}`.
   *Likely fix:* btree indexes on the remaining sortable columns.

## Deliverables

A committed `perf/` directory (not gitignored — this is real project code, unlike the
`docs/` planning artifacts):

```
perf/
├── README.md                 # how to run, profiles, thresholds, reading the output
└── k6/
    ├── main.js               # entry: re-exports scenario fns, builds options from PROFILE
    ├── lib/
    │   ├── config.js         # BASE_URL, PROFILES (executors/stages/rate), thresholds
    │   ├── data.js           # search terms, page depths, sort variants + pickers
    │   └── metrics.js        # custom Trends per endpoint, handleSummary writer
    └── scenarios/
        ├── dashboard.js      # GET /patients/stats
        ├── browseList.js     # GET /patients — shallow+deep pages, indexed+unindexed sorts
        └── search.js         # GET /patients?search — short / full-name / no-match terms
```

### `lib/config.js`
- `BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'`.
- `buildOptions(env)` reads `PROFILE` and returns the k6 `options` object (scenarios +
  thresholds). Four profiles:

  | Profile | Executor | Shape | Purpose |
  |---|---|---|---|
  | `smoke` | `per-vu-iterations` / `constant-vus` (1 VU) | scenarios run **sequentially** (`startTime`) | uncontended baseline latency per endpoint |
  | `load` | `ramping-vus` | ramp to a sustainable level (e.g. 30 VUs), hold ~2 min, all scenarios concurrent | does it hold at expected traffic |
  | `stress` | `ramping-arrival-rate` (open model) | climb rate in stages past the knee (e.g. 20→400 rps) | **find the breaking point** — open model keeps offering load even as the server slows, exposing queue buildup |
  | `spike` | `ramping-arrival-rate` | sudden jump then drop | recovery behavior |

  Open-model (`*-arrival-rate`) executors are deliberate for `stress`/`spike`: they decouple
  offered load from response time, so a slowing server shows as rising latency + dropped
  iterations rather than self-throttling VUs.

- **Thresholds** (pass/fail SLOs, per-scenario via tags):
  ```
  http_req_failed:                          ['rate<0.01']
  checks:                                   ['rate>0.99']
  http_req_duration{scenario:dashboard}:    ['p(95)<800']   // aggregation: looser
  http_req_duration{scenario:browse_list}:  ['p(95)<300']
  http_req_duration{scenario:search}:       ['p(95)<500']
  ```
  (Numbers are starting SLOs to calibrate against the `smoke` baseline, not hard truths.)

### `lib/data.js`
- `SEARCH_TERMS` grouped by kind, each request tagged `term_kind`:
  - `short` — `["a", "jo", "li", "an"]` (< 3 chars → defeats trigram, hypothesis #2)
  - `full` — common seeded last names (`["Smith","Johnson","Williams","Brown","Garcia"]`,
    Faker `en_US`) → trigram-backed, should be fast
  - `nomatch` — `["zzzqx", "qwxzv"]` → exercises the empty-result path
  - `email` — `["example.com", "@example"]` → matches the email column
- `PAGES` → `shallow: [1,2,3]`, `deep: [250, 400, 499]` (10k/20 = 500 pages), tag `depth`.
- `SORTS` → `indexed: last_name/status`, `unindexed: first_name/last_visit/created_at`,
  each with `asc`/`desc`, tag `sort`.
- Pure pickers (`randomItem`) so each iteration varies its parameters.

### `scenarios/*.js`
Each exports one `exec` function that issues its request inside a `group`, records a custom
`Trend`, attaches the variant tags above, and `check`s:
- status `200`,
- list/search: body has `items` (array) and numeric `total`,
- dashboard: body has `total`, `by_status`, `by_age_group`, `top_conditions`.

### `lib/metrics.js`
- Custom `Trend`s: `dashboard_latency`, `list_latency`, `search_latency` (clear summary rows).
- `handleSummary(data)` → writes `perf/k6/out/summary-<profile>-<timestamp>.json` and prints
  the default text summary, so each run leaves an artifact for comparison.

### `perf/README.md`
- One-liners per profile, e.g.:
  ```bash
  docker run --rm --network host \
    -e PROFILE=stress -e BASE_URL=http://localhost:8000 \
    -v "$PWD/perf/k6:/scripts" -v "$PWD/perf/k6/out:/scripts/out" \
    grafana/k6 run /scripts/main.js
  ```
- Prereqs: `docker compose up` running (10k seed loaded), confirm with `curl :8000/health`.
- "Reading the output": which metric/tag confirms each hypothesis above; reminder that the
  DB is a single local container so absolute numbers are relative, the **deltas between
  variants** are the signal.
- Note: keep `perf/k6/out/` gitignored (results are scratch, like other review artifacts).

## Implementation Notes

- `main.js` reads `__ENV.PROFILE` at init time and `export const options = buildOptions(__ENV)`;
  scenario `exec` names must match the re-exported function names.
- Default `PROFILE` to `smoke` so a bare run is safe and fast.
- Run `smoke` first to set realistic threshold numbers from the uncontended baseline before
  trusting `stress` pass/fail.
- This is **read-only** load — no create/update/delete — matching the "initial pages and
  search" scope. (A write-path soak test could be a later task.)
- No backend code changes in this task: it only *measures*. Any fix prompted by the findings
  (caching, indexes, keyset pagination) is a separate follow-up task.

## Acceptance Criteria

- `PROFILE=smoke` run passes all thresholds against the running stack and emits a baseline
  summary JSON.
- `PROFILE=stress` run completes and produces a **per-scenario, per-tag latency breakdown**
  that lets us point at the first endpoint/variant to degrade.
- The breakdown visibly separates: `dashboard` vs list/search; `search{short}` vs `{full}`;
  `browse_list{deep}` vs `{shallow}`; `{sort:unindexed}` vs `{sort:last_name}`.
- `perf/README.md` documents the run commands, the four profiles, the thresholds, and maps
  each suspected bottleneck to the metric that confirms it.

## Findings (first run, local single-container DB)

**Baseline (`smoke`, 1 VU, uncontended)** — p95, ms. The query-shape hypotheses all hold,
in the expected direction:

| Variant | p95 | vs pair |
|---|---|---|
| `term_kind:short` | ~23 | **slower** than `full` ~16, `nomatch` ~4 → hypothesis #2 ✓ |
| `depth:deep` | ~11 | **slower** than `shallow` ~7 → hypothesis #3 ✓ |
| `sort:unindexed` | ~11 | **slower** than `indexed` ~7 → hypothesis #4 ✓ |
| `scenario:dashboard` | ~23 | highest-cost endpoint → hypothesis #1 ✓ |

**Under `stress` (arrival rate climbing toward ~1200 rps combined)** the picture inverts:
~**60% of requests fail**, p95 **~5s**, max ~25s, and **every variant converges to
~4900–4990ms** — the per-query-shape differences vanish entirely.

**Interpretation — the dominant bottleneck under concurrency is upstream of the queries.**
Requests queue and time out uniformly regardless of which query they would run, which is
the signature of a **shared-resource saturation**: a single uvicorn worker + a small
SQLAlchemy/asyncpg connection pool, not the individual query shapes. So:

- The query-shape costs (#2/#3/#4) are real but **second-order** — they dominate only at
  low/moderate load (visible in `smoke`/`load`), not at the saturation point.
- The **first-order** fix for throughput is capacity/headroom: more uvicorn workers, a
  larger/ tuned connection pool, and a reverse-proxy/timeout budget — *then* re-measure to
  see whether the query-shape costs resurface as the next ceiling.

These are follow-up tasks (no app code changed here). Numbers are from a single local
Postgres container — directional, not absolute.

### After tasks 18–21 (capacity + stats cache + search guard + sort indexes)

Re-ran the same suite against the optimized stack:

| | Before (`stress`) | After (`stress`) | After (`load`, ~722 rps) |
|---|---|---|---|
| `http_req_failed` | 60.20% | **0.01%** | **0.00%** |
| checks pass | 51% | 99.99% | 100% |
| `dashboard` p95 | ~5s (collapsed) | **178ms** (cached) | 57ms |
| `browse_list` p95 | ~5s | ~7s ⚠ | **113ms** ✓ |
| `search` p95 | ~5s | ~7s ⚠ | **121ms** ✓ |

- The capacity fix (task-18) eliminated the failure collapse; the stats cache (task-19)
  made the dashboard the *fastest* path.
- At realistic sustained load **all SLOs pass**. The `stress`-profile breach of the list/
  search budgets is the intended "knee": at ~1000 rps combined the per-request `COUNT(*)`
  + offset still saturate the DB — exactly what **task-22 (deferred)** targets.
