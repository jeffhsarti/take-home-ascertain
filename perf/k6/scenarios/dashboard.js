// Dashboard landing → GET /patients/stats.
// The heaviest read: 5 aggregations per call (status/blood-type GROUP BY, AGE() age
// bucketing, JSONB lateral unnest of conditions), recomputed every request, uncached.

import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL } from '../lib/config.js';
import { latency } from '../lib/metrics.js';

export function dashboard() {
  group('dashboard', () => {
    const res = http.get(`${BASE_URL}/patients/stats`, { tags: { endpoint: 'stats' } });
    latency.dashboard.add(res.timings.duration);
    // Guard the JSON parse: under saturation the body is null (timeout/conn error),
    // and r.json() would throw instead of recording a clean failed check.
    const body = res.status === 200 && res.body ? res.json() : null;
    check(res, {
      'status 200': (r) => r.status === 200,
      'has total': () => body !== null && body.total !== undefined,
      'has by_status': () => body !== null && body.by_status != null,
      'top_conditions is array': () => body !== null && Array.isArray(body.top_conditions),
    });
  });
}
