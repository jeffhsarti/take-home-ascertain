// k6 entry point. Select intensity with `-e PROFILE=smoke|load|stress|spike`
// (default smoke) and target with `-e BASE_URL=...` (default http://localhost:8000).
//
//   docker run --rm --network host -w /scripts \
//     -e PROFILE=stress -v "$PWD/perf/k6:/scripts" grafana/k6 run main.js
//
// See ../README.md for the full run matrix and how to read the output.

import { buildOptions } from './lib/config.js';
import { dashboard } from './scenarios/dashboard.js';
import { browseList } from './scenarios/browseList.js';
import { search } from './scenarios/search.js';

export const options = buildOptions(__ENV);

// Scenario `exec` names in config.js must match these exported function names.
export { dashboard, browseList, search };
export { handleSummary } from './lib/metrics.js';
