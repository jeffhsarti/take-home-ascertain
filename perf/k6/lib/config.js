// Central knobs for the k6 suite: target, load profiles, and thresholds.
//
// One script, four profiles selected with `-e PROFILE=...`. The three scenarios
// (dashboard / browse_list / search) run in every profile; only the executor and
// intensity change. Scenario KEYS are named to match the `scenario` system tag the
// thresholds below filter on, so do not rename them casually.

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// SLOs. Calibrate these against a `smoke` run (uncontended baseline) before trusting
// the stress pass/fail — the absolute numbers depend on the host running Postgres.
const THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],

  // Pass/fail latency budgets per endpoint. `/patients/stats` gets a looser budget
  // because it re-aggregates the whole table on every call.
  'http_req_duration{scenario:dashboard}': ['p(95)<800'],
  'http_req_duration{scenario:browse_list}': ['p(95)<300'],
  'http_req_duration{scenario:search}': ['p(95)<500'],

  // Reporting-only sub-metrics (empty array = no pass/fail, but k6 still computes and
  // prints them). This is what surfaces each suspected bottleneck in the summary:
  // compare the p95 of the paired tags.
  'http_req_duration{term_kind:prefix}': [], // 3-char prefix: broad but index-served
  'http_req_duration{term_kind:full}': [], //    full-surname match
  'http_req_duration{term_kind:email}': [],
  'http_req_duration{term_kind:nomatch}': [],
  'http_req_duration{depth:deep}': [], // hypothesis #3: OFFSET is O(offset)
  'http_req_duration{depth:shallow}': [],
  'http_req_duration{sort:unindexed}': [], // hypothesis #4: unindexed ORDER BY
  'http_req_duration{sort:indexed}': [],

  // task-23 write-path smoke. Calibrated at ~5x the first clean-run p95 (which
  // came in at 4-8ms locally), so the budget catches a real regression without
  // tripping on single-iteration noise. Re-baseline if the host hardware changes.
  'http_req_duration{scenario:writes,op:create}': ['p(95)<50'],
  'http_req_duration{scenario:writes,op:update}': ['p(95)<50'],
  'http_req_duration{scenario:writes,op:delete}': ['p(95)<30'],
  'http_req_duration{scenario:writes,op:note}': ['p(95)<50'],
  'http_req_duration{scenario:writes,op:note_delete}': ['p(95)<30'],
};

// --- executor factories -----------------------------------------------------------

// Closed model: a fixed VU pool, sequential, for an uncontended baseline.
const smokeVus = (exec, startTime) => ({
  executor: 'constant-vus',
  vus: 1,
  duration: '20s',
  startTime,
  exec,
});

// Closed model: ramp a VU pool up and hold. Aggressive (no think-time sleep), so a
// modest VU count already represents heavy traffic.
const rampVus = (exec, peak) => ({
  executor: 'ramping-vus',
  exec,
  startVUs: 0,
  stages: [
    { duration: '30s', target: peak },
    { duration: '2m', target: peak },
    { duration: '30s', target: 0 },
  ],
});

// Open model: hold a target arrival RATE regardless of how slow the server gets, so a
// saturating server shows up as rising latency + dropped iterations (the "knee"),
// instead of VUs self-throttling. This is the one that actually finds the breaking point.
const arrivalRate = (exec, peakRate, maxVUs) => ({
  executor: 'ramping-arrival-rate',
  exec,
  startRate: 5,
  timeUnit: '1s',
  preAllocatedVUs: Math.min(50, maxVUs),
  maxVUs,
  stages: [
    { duration: '30s', target: Math.round(peakRate * 0.1) },
    { duration: '1m', target: Math.round(peakRate * 0.25) },
    { duration: '1m', target: Math.round(peakRate * 0.5) },
    { duration: '1m', target: peakRate },
    { duration: '30s', target: 0 },
  ],
});

// Open model: sit low, jump hard, then drop — observe recovery.
const spike = (exec, peakRate, maxVUs) => ({
  executor: 'ramping-arrival-rate',
  exec,
  startRate: 10,
  timeUnit: '1s',
  preAllocatedVUs: Math.min(50, maxVUs),
  maxVUs,
  stages: [
    { duration: '10s', target: 10 },
    { duration: '10s', target: peakRate },
    { duration: '30s', target: peakRate },
    { duration: '10s', target: 10 },
    { duration: '30s', target: 10 },
  ],
});

// --- profiles ----------------------------------------------------------------------

const PROFILES = {
  smoke: {
    dashboard: smokeVus('dashboard', '0s'),
    browse_list: smokeVus('browseList', '20s'),
    search: smokeVus('search', '40s'),
  },
  load: {
    dashboard: rampVus('dashboard', 10),
    browse_list: rampVus('browseList', 20),
    search: rampVus('search', 20),
  },
  stress: {
    // dashboard ceiling is lower: each request is far more expensive.
    dashboard: arrivalRate('dashboard', 200, 300),
    browse_list: arrivalRate('browseList', 500, 500),
    search: arrivalRate('search', 500, 500),
  },
  spike: {
    dashboard: spike('dashboard', 150, 300),
    browse_list: spike('browseList', 400, 500),
    search: spike('search', 400, 500),
  },
  // task-23: write-path smoke. 1 VU, sequential, low iteration count. Each
  // iteration of `writes` chains POST → PUT → POST note → DELETE note → DELETE
  // patient, so 10 iterations ≈ 50 requests — enough sample for p95 without
  // creating a pile of rows if cleanup misfires. Deliberately not part of any
  // existing profile: the read profiles must stay opt-in idempotent.
  'writes-smoke': {
    writes: {
      executor: 'per-vu-iterations',
      exec: 'writes',
      vus: 1,
      iterations: 10,
      maxDuration: '1m',
    },
  },
};

export function buildOptions(env) {
  const profile = env.PROFILE || 'smoke';
  const scenarios = PROFILES[profile];
  if (!scenarios) {
    throw new Error(
      `Unknown PROFILE "${profile}". Use one of: ${Object.keys(PROFILES).join(', ')}.`
    );
  }
  return {
    scenarios,
    thresholds: THRESHOLDS,
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  };
}
