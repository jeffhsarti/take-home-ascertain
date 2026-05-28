# Task 23 — k6 write-path smoke tests (create / update / delete)

- **Assignment:** Performance follow-up — extend task-17 to cover writes
- **Priority:** P3 (defensive coverage; no known regression — scope intentionally small)
- **Depends on:** task-05 (patient CRUD), task-06 (notes endpoint), task-17 (k6 suite),
  task-21 (sortable column indexes — relevant: see *Why* below)
- **Status:** Not started

## Why

Task-17 deliberately scoped its k6 suite to **read paths only** (list, search, stats) —
those are the entry points users hit on every navigation and the ones we had a clear SLO
intuition for. Writes were called out as a follow-up at the bottom of task-17.

Two things changed that make a small write-path check worth adding **now**:

1. **task-21 added btree indexes on `first_name`, `last_visit`, `created_at`.** Extra
   indexes are paid on every `INSERT`/`UPDATE` of a patient row. We have no measurement of
   what that cost looks like under any concurrency — the read suite can't see it.
2. **The write endpoints are committed code with no perf signal at all.** A trivial
   regression (e.g. an N+1 introduced in a future schema change, a missing index on a FK,
   a `SELECT` before write that scales with table size) would today land in `main`
   undetected because the existing suite doesn't exercise these paths.

A smoke-level run catches both: it confirms the post-task-21 write latency is sane *today*
and leaves an artifact future changes can be compared against.

## Why **not** load/stress

Stress/load testing **without a target volumetria is noise, not signal.** Concretely:

- **No threshold to calibrate against.** task-17's SLOs (`stats` p95 < 800ms,
  `browse_list` < 300ms) were chosen relative to the read-baseline + the dashboard SLA we
  inferred from the UX. There is no equivalent for writes — the take-home brief doesn't
  specify a target write throughput, expected concurrent editors, or a sustained ingestion
  rate. Any pass/fail bar would be invented.
- **Open-model arrival rate on writes pollutes the dataset.** task-17's `stress` profile
  ramps to ~1200 rps. Pointing that at `POST /patients` would create hundreds of thousands
  of fake rows per run, skewing every subsequent read measurement (page counts, search
  hits, stats aggregations) until the DB is reseeded. Read tests are naturally idempotent
  — write tests are not.
- **The first-order ceiling is already mapped.** task-17's stress findings showed that
  saturation lives in worker/pool capacity, not query shape. Re-discovering the same
  ceiling via writes adds no new information; it just costs more cleanup.

Smoke (1 VU, sequential, low iteration count) sidesteps all three: a few writes per
endpoint produce a clean per-request baseline, leave the DB roughly as they found it
(create → delete the same row), and don't require a fabricated SLO.

**When this calculus changes:** the moment a real volumetria target exists (e.g. "we
expect 50 concurrent clinicians editing notes during morning rounds"), promote this task
to a proper `load`-profile suite with cleanup tooling — see *Future work* below.

## Endpoints under test

| Endpoint | Why include it |
|---|---|
| `POST /patients` | Most-indexed write path (after task-21); insert cost is the closest thing to a regression canary for new indexes. |
| `PUT /patients/{id}` | Common edit operation; touches the same indexes plus the `updated_at` trigger/column. |
| `DELETE /patients/{id}` | Used at the end of each iteration to clean up the created row; doubles as coverage. |
| `POST /notes` | Different table, different concern — note creation is the only write users perform that *isn't* on `patients`. Sanity check that the FK + insert path is healthy. |

`DELETE /notes/{id}` is exercised transitively if a created note is cleaned up; not a
required separate scenario.

## Deliverables

Extend the existing `perf/k6/` suite — **do not** spin up a parallel directory:

```
perf/k6/
├── lib/
│   └── data.js          # add: PATIENT_FACTORY (function → fresh payload),
│                        #      NOTE_FACTORY, plus a small set of realistic field values
└── scenarios/
    └── writes.js        # new: exec functions for createPatient, updatePatient,
                         #      deletePatient, createNote — each tagged
                         #      `scenario:writes`, `op:<create|update|delete|note>`
```

### `scenarios/writes.js`

One `exec` per operation, each:
- builds a payload from `PATIENT_FACTORY` / `NOTE_FACTORY` (Faker-style: unique email,
  realistic name/dob, valid enum values for status/blood-type),
- issues the request with `tags: { scenario: 'writes', op: '<name>' }`,
- `check`s status (`201` / `200` / `204`) and that the response body has the expected
  shape (`id` on create, updated field echoed on update),
- for `createPatient`: **stashes the returned id and chains a `DELETE` at iteration end**
  so the run is net-zero rows. Same pattern for `createNote`.

### `lib/config.js`

Add a **`writes-smoke` profile** (do not modify the existing four):

```js
'writes-smoke': {
  scenarios: {
    writes: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 20,           // 5 of each op, sequential
      exec: 'writesScenario',   // dispatches by iteration index, or split into 4 scenarios
    },
  },
  thresholds: {
    'http_req_failed{scenario:writes}': ['rate<0.01'],
    'http_req_duration{scenario:writes,op:create}': ['p(95)<200'],
    'http_req_duration{scenario:writes,op:update}': ['p(95)<200'],
    'http_req_duration{scenario:writes,op:delete}': ['p(95)<150'],
    'http_req_duration{scenario:writes,op:note}':   ['p(95)<200'],
  },
}
```

Numbers are starting placeholders — **calibrate against the first run**, same protocol
task-17 used for reads. The point of a smoke threshold isn't "is this fast enough" but
"has this gotten meaningfully slower than last run."

### `perf/README.md`

Add a short section: how to run the new profile, the cleanup guarantee (creates are
paired with deletes), and the explicit note that **this is a regression canary, not a
capacity test** — load/stress on writes is out of scope until volumetria exists.

## Implementation Notes

- **Don't reuse seeded patient ids for `PUT`/`DELETE` targets** — that mutates the dataset
  the read suite depends on. Each smoke iteration should: create → update the just-created
  row → delete it. Self-contained.
- **Email uniqueness:** `patients.email` has a unique constraint. Use a per-iteration
  suffix (`__VU`/`__ITER`/timestamp) in the factory to guarantee no collisions across runs.
- **Don't add a teardown that wipes the DB.** Cleanup must be inline so a partial run
  (Ctrl-C, threshold abort) still leaves things mostly tidy. A stray row from a crashed
  smoke is acceptable; a `TRUNCATE` from a teardown hook is not.
- **Keep the read suite's assumptions intact.** After a clean `writes-smoke` run, row
  counts and search hits should be unchanged. The acceptance criteria below verify this.

## Acceptance Criteria

- `PROFILE=writes-smoke` runs against the stack and passes all thresholds.
- Summary JSON is written to `perf/k6/out/` with per-`op` p95 breakdown.
- Row count of `patients` (and `notes`) is **identical before and after** the run
  (`SELECT COUNT(*)` check, manually or in the README's "verify" snippet).
- `perf/README.md` documents the new profile, the cleanup contract, and the explicit
  scope decision (smoke-only until volumetria targets exist).
- task-17's existing four profiles (`smoke` / `load` / `stress` / `spike`) continue to
  pass unchanged — the new scenario must be opt-in via `PROFILE=writes-smoke`, not
  bundled into the existing read profiles.

## Future work (not in this task)

The moment a write-side SLO or volumetria target exists, add a `writes-load` profile
with:
- a dedicated test database (compose service or schema) so creates don't pollute the
  read dataset,
- a deterministic teardown (or per-run schema reset) replacing the inline create/delete
  pairing,
- realistic mix ratios (most apps are read-heavy; e.g. 90/10 read:write across all
  scenarios) instead of pure-write isolation,
- thresholds calibrated against the actual target throughput, not the smoke baseline.

Mention this explicitly in `perf/README.md` so the scope boundary is visible to whoever
picks it up next.