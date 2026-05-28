// Search → GET /patients?search=<term>.
// Each iteration picks a term kind (short / full / email / nomatch) and tags the
// request with it, so the summary shows whether short terms (which the trigram index
// can't serve) are materially slower than full-surname matches.

import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL } from '../lib/config.js';
import { latency } from '../lib/metrics.js';
import { SEARCH_TERMS, TERM_KINDS, randomItem, toQuery } from '../lib/data.js';

export function search() {
  group('search', () => {
    const kind = randomItem(TERM_KINDS);
    const term = randomItem(SEARCH_TERMS[kind]);

    const qs = toQuery({ search: term, page: 1, page_size: 20 });
    const res = http.get(`${BASE_URL}/patients?${qs}`, {
      tags: { endpoint: 'search', term_kind: kind },
    });

    latency.search.add(res.timings.duration);
    // Guard the JSON parse: under saturation the body is null (timeout/conn error).
    const body = res.status === 200 && res.body ? res.json() : null;
    check(res, {
      'status 200': (r) => r.status === 200,
      'items is array': () => body !== null && Array.isArray(body.items),
      'total is number': () => body !== null && typeof body.total === 'number',
    });
  });
}
