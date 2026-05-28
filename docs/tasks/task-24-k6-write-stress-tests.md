# Task 24 — k6 write-path stress tests (ramp-to-knee, isolated DB)

- **Assignment:** Performance follow-up — write-side equivalent of task-17's `stress`
- **Priority:** P3 (exploratory; no SLO to defend, no production deadline)
- **Depends on:** task-12 (compose), task-17 (k6 suite + read scenarios), task-23 (write
  smoke + factories), task-18 (capacity tuning — gives us a backend that doesn't collapse
  on the first VU)
- **Status:** Not started

## Why

task-23 added a write-path **smoke** as a regression canary, and explicitly deferred
load/stress because (a) we have no volumetria target and (b) writing through the shared
DB would pollute the read suite's 10k-row dataset.

Both objections still hold for a load test with a stated SLO — but **neither blocks an
exploratory ramp-to-knee** that asks "*where does the write path break?*" rather than
"*does it meet X RPS?*". The reads got that answer from task-17's `stress` profile; the
writes never did. This task closes that gap and produces a baseline to compare future
optimizations against (more workers, async commit tuning, connection pool sizing, etc.).

This **replaces** the "Future work" section of task-23. That section assumed a volumetria
target would arrive first; we're proceeding without one and adjusting the contract
accordingly (see *Acceptance Criteria* below).

## Decisions locked with the user

1. **No SLO.** All thresholds are reporting-only (`[]`) — the test produces evidence,
   not pass/fail. Promote to pass/fail once a real volumetria target exists.
2. **Isolated DB.** A second Postgres service (`postgres-perf`) in `docker-compose.yml`
   behind a compose profile, with its own volume. Backend is pointed at it via a
   `DATABASE_URL` override for the duration of the run. The main 10k-seed DB is never
   touched.
3. **Two sub-profiles**:
   - `writes-stress-pure` — only write ops (create/update/delete/note), configurable
     ratio. Isolates raw write cost.
   - `writes-stress-mixed` — 90/10 read/write blend, reusing the existing
     `dashboard`/`browseList`/`search` scenarios alongside writes. Catches
     contention between read and write paths (connection pool exhaustion under
     write load, lock waits, etc.) that pure-write can't see.
4. **Ramp-to-knee**, not steady-state. Open model (`ramping-arrival-rate`) climbing
   in stages past the expected collapse — same pattern task-17's stress uses for reads.

## Deliverables

### 1. Compose profile + isolated stack

Add to `docker-compose.yml`:

```yaml
services:
  postgres-perf:
    profiles: [perf]
    image: postgres:16
    # Different host port so it doesn't clash with the main db service.
    ports: ['55433:5432']
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: healthcare_perf
    volumes:
      - postgres-perf-data:/var/lib/postgresql/data
  backend-perf:
    profiles: [perf]
    # Reuse the backend image build; only the DATABASE_URL and the port differ.
    extends:
      service: backend
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres-perf:5432/healthcare_perf
      # Match the production-ish concurrency from task-18 so the test reflects real config.
    ports: ['8001:8000']
    depends_on: [postgres-perf]
volumes:
  postgres-perf-data:
```

Bring up only with `docker compose --profile perf up`. The main backend stays on `:8000`
serving the 10k-seed DB; the perf backend runs on `:8001` against the perf DB.

### 2. Seed the perf DB

A `writes-stress-mixed` run needs *some* rows for reads to hit (search index probes,
paginated lists, stats aggregation). Two acceptable options:

- **(Preferred) Reduced seed** — extend `backend/scripts/seed_patients.py` with a
  `--count` flag and seed `postgres-perf` with ~1000 patients + a couple of notes each.
  Enough for trigram + sort indexes to be index-served; small enough that a `docker
  compose down -v` between runs reseeds in seconds.
- **Copy from main** — `pg_dump` the main DB and restore into `postgres-perf`. Simpler
  reuse, but couples the perf run to the state of the main DB (a contaminated seed
  silently propagates).

Document the chosen flow in `perf/README.md` and provide a one-liner.

### 3. Two new profiles in `perf/k6/lib/config.js`

```js
// Open model, climbing through stages. The point is to find the rate at which
// http_req_failed climbs and latency dispatches — not to hold a target.
'writes-stress-pure': {
  writes: arrivalRate('writes', 200, 200),  // peak ~200 rps writes
},
'writes-stress-mixed': {
  // ~90/10 read:write blend by RPS targeting. K6 weighs scenarios by their own
  // arrival rate, so set each one's peak proportionally.
  dashboard:   arrivalRate('dashboard', 180, 200),    // 30% of reads = ~30% of 600 rps
  browse_list: arrivalRate('browseList', 240, 300),   // 40% of reads
  search:      arrivalRate('search', 180, 200),       // 30% of reads
  writes:      arrivalRate('writes', 80, 100),        // 10% of total
},
```

Numbers above are starting points; the peak rates need calibration on the host. The
**ratio matters more than the absolute peak** — start with ~600 rps combined target,
adjust based on where the knee shows up.

`BASE_URL` defaults to `http://localhost:8001` (the perf backend) when these profiles
run, or is set explicitly via `-e BASE_URL=…` in the run command.

### 4. Reporting-only thresholds

Add per-op write reporting entries (no pass/fail bar):

```js
'http_req_duration{scenario:writes,op:create}':      [],  // reporting only
'http_req_duration{scenario:writes,op:update}':      [],
'http_req_duration{scenario:writes,op:delete}':      [],
'http_req_duration{scenario:writes,op:note}':        [],
'http_req_duration{scenario:writes,op:note_delete}': [],
'http_req_failed{scenario:writes}':                  [],  // reporting only
```

The existing read thresholds (`{scenario:dashboard}`, etc.) are kept as pass/fail in the
mixed profile — they're already calibrated and a write-induced read regression *should*
trip them. That's a useful signal: it means write contention is hurting read latency.

### 5. `perf/README.md` — new section "Write-path stress (`writes-stress-*`)"

Document:
- **Bring-up**: `docker compose --profile perf up` + seed command + `BASE_URL=http://localhost:8001`.
- **Teardown**: `docker compose --profile perf down -v` between runs to reset the DB.
  (Cheaper than per-iteration cleanup once the DB is disposable.)
- **Two profiles** and which question each answers.
- **Reading the output** — how to spot the knee:
  - `http_req_failed{scenario:writes}` rate climbs above ~5% → write path saturated.
  - Per-op p95 starts diverging (e.g. `create` p95 ≫ `delete` p95) → likely lock or
    pool contention on inserts specifically.
  - In `mixed`: read SLOs trip *while* `http_req_failed` is still low → reads are being
    crowded out of the pool by writes (capacity rebalancing needed, not a write fix).
- **Explicit non-SLO disclaimer**: this profile reports, it does not gate. Promote to
  pass/fail when a target arrives.

## Implementation Notes

- **Don't refactor `scenarios/writes.js`.** The existing chain (create→update→note→
  note_delete→delete per iteration) is the right shape for stress too: each VU
  iteration is self-contained and any in-flight crash leaves a bounded mess that the
  per-run DB reset wipes.
- **K6 has no native "weighted mix" knob.** The approach above — one scenario per
  endpoint with proportional `arrival-rate` — is the idiomatic k6 way. Avoid the
  alternative of a single `exec` that internally branches on `Math.random()`; it
  collapses the per-scenario tags and ruins the per-endpoint breakdown.
- **Ratio drift under saturation.** When the server slows, all arrival rates slip in
  proportion together, so the 90/10 ratio holds even past the knee. That's a feature
  of open-model executors and the reason we're not using VU-based mixing.
- **First-class teardown**: `docker compose --profile perf down -v` is the cleanup
  contract. The k6 script does not need any DB-aware cleanup — the disposable DB
  removes the constraint that made `writes-smoke` use in-iteration delete pairing.
- **Don't merge `writes-stress-*` profiles into the main `stress` profile.** Keeping
  them separate means a normal `PROFILE=stress` run still works against the 10k-seed
  DB and stays idempotent; the write-stress is opt-in and requires the perf stack.
- **Backend tuning parity.** The perf backend service must inherit the task-18
  worker/pool tuning. Otherwise the "knee" we find is the smoke-config knee, not the
  shipped-config knee — useless data.

## Acceptance Criteria

- `docker compose --profile perf up` brings up `postgres-perf` + `backend-perf` on
  `:8001`, seeded with a documented number of patients (~1000 unless we measure that
  we need more).
- `PROFILE=writes-stress-pure` (against `BASE_URL=http://localhost:8001`) runs to
  completion and writes a summary JSON with per-op p95 across the ramp stages.
- `PROFILE=writes-stress-mixed` runs to completion, summary includes both read scenario
  tags (`scenario:dashboard|browse_list|search`) and write op tags, plus
  `http_req_failed` per scenario.
- The main backend (`:8000`) and main DB are visibly unaffected during and after a perf
  run (row counts unchanged; can be checked manually).
- `perf/README.md` documents bring-up, teardown, both profiles, and how to read the
  knee in the output — including the explicit "reporting only, no SLO" disclaimer.
- The new profiles do **not** affect any existing profile's behavior: `smoke` / `load` /
  `stress` / `spike` / `writes-smoke` runs against `:8000` remain unchanged.

## Findings (first runs, local single-container perf stack)

### `writes-stress-pure` — pure ramp-to-knee on writes

Configured peak: 200 iter/s (~1000 rps of writes). Backend = task-18 defaults
(`WEB_CONCURRENCY=2`, `DB_POOL_SIZE=10`, `DB_MAX_OVERFLOW=20`).

| Signal | Value | Interpretation |
|---|---|---|
| `dropped_iterations` | 1163 / 4m | Open model couldn't sustain target peak → knee found |
| Achieved iter/s (avg) | ~82 (~411 rps writes) | Sustainable throughput ~80-100 iter/s ≈ 400-500 rps |
| `http_req_failed{scenario:writes}` | 0.00% | Backend queues under saturation, doesn't 5xx |
| Per-op p95 at knee | create 459ms · update 393ms · note 359ms · delete 712ms · note_delete 889ms | Latency exploded ~100x vs smoke baseline (~5ms) |
| p99 at knee | 1.3-1.9s across ops | Tail dispersion is huge — queue depth, not query cost |

**Interpretation:** the path absorbs ~400 rps cleanly; past that it queues
indefinitely (no 5xx, but tail latency goes to seconds). `delete` p95 was the
worst — counter-intuitive, since DELETEs are cheaper than INSERTs — but tracks
with the cascade work on `notes.patient_id` once concurrency makes lock waits
matter. The 0% failure rate confirms task-17's "first-order ceiling is upstream
of the queries" finding: the limit is worker/pool capacity, not the write SQL.

### `writes-stress-mixed` — 90/10 read:write contention

Same backend config; peak combined ~600 rps reads + ~60 rps writes (12 iter/s
of the writes chain).

| Signal | Value | SLO | Verdict |
|---|---|---|---|
| `dashboard{scenario:dashboard}` p95 | 1.5s | <800ms | ✗ **read SLO tripped** |
| `browse_list{scenario:browse_list}` p95 | 477ms | <300ms | ✗ **read SLO tripped** |
| `search{scenario:search}` p95 | 475ms | <500ms | ✓ (narrow) |
| writes per-op p95 | 215-340ms | (reporting only) | 2x better than pure |
| `http_req_failed` (overall) | 0.00% | <1% | ✓ |
| `dropped_iterations` | 300 | — | ~4x less than pure |

**Interpretation — this is the contention story the mixed profile exists to
tell.** Writes are only 10% of the load and are individually *faster* than in
the pure run (less queue depth), yet they **starve the read paths**:
`dashboard` (the most pool-hungry endpoint) doubles past its budget, and
`browse_list` ($COUNT(*)$ + sort) trips too. Pure-write can't surface this:
without read traffic in the picture, the pool contention is invisible.

**Implications:** at this host config (`WEB_CONCURRENCY=2` + 30 connections
per worker), a sustained ~60 rps of writes mixed with ~600 rps of reads is
already enough to push dashboard latency to 1.5s. The fix is *not* on the
write path — it's pool/worker capacity rebalancing, which is exactly what
task-18 tuned for the read-only case but never re-validated under write load.

These numbers are from a single local container — directional, not absolute.
The *delta* between pure and mixed (pure writes p95 ≈ 6× mixed writes p95;
reads break in mixed but not pure) is what matters.

## Future work (still not in scope)

When a real write volumetria target lands:
- Convert the reporting-only write thresholds into pass/fail budgets calibrated to
  the target (mirroring how task-17's read SLOs were calibrated from the smoke
  baseline).
- Add a sustained `writes-load` profile (closed model, hold the target rate for ~2min)
  alongside the existing `writes-stress`, like the read suite has both `load` and
  `stress`.
- Decide whether the perf DB seed needs to scale with the target — at high write RPS,
  a 1000-row table may become unrealistically small for the read paths in the mixed
  profile.
