// Custom per-endpoint Trends (clear rows in the summary) and the summary writer that
// drops a JSON artifact per run so successive runs can be compared.

import { Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

// `true` = isTime, so these print in ms like the built-in http_req_duration.
export const latency = {
  dashboard: new Trend('dashboard_latency', true),
  browse_list: new Trend('list_latency', true),
  search: new Trend('search_latency', true),
  writes: new Trend('writes_latency', true),
};

export function handleSummary(data) {
  const profile = __ENV.PROFILE || 'smoke';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  // Relative to k6's working dir — run with `-w /scripts` so this lands in perf/k6/out.
  const file = `out/summary-${profile}-${stamp}.json`;
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    [file]: JSON.stringify(data, null, 2),
  };
}
