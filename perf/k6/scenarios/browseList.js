// Patient list → GET /patients with pagination + sort.
// Each iteration randomizes page depth (shallow vs deep OFFSET) and sort column
// (indexed vs unindexed), tagging the request so the summary separates them.

import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL } from '../lib/config.js';
import { latency } from '../lib/metrics.js';
import { PAGES, SORTS, randomItem, toQuery } from '../lib/data.js';

export function browseList() {
  group('browse_list', () => {
    const depth = randomItem(['shallow', 'deep']);
    const page = randomItem(PAGES[depth]);
    const sortKind = randomItem(['indexed', 'unindexed']);
    const [sortBy, sortOrder] = randomItem(SORTS[sortKind]);

    const qs = toQuery({
      page,
      page_size: 20,
      sort_by: sortBy,
      sort_order: sortOrder,
    });
    const res = http.get(`${BASE_URL}/patients?${qs}`, {
      tags: { endpoint: 'list', depth, sort: sortKind },
    });

    latency.browse_list.add(res.timings.duration);
    // Guard the JSON parse: under saturation the body is null (timeout/conn error).
    const body = res.status === 200 && res.body ? res.json() : null;
    check(res, {
      'status 200': (r) => r.status === 200,
      'items is array': () => body !== null && Array.isArray(body.items),
      'total is number': () => body !== null && typeof body.total === 'number',
    });
  });
}
