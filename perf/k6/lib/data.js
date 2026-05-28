// Request parameters, grouped so each scenario can tag requests by variant. The
// summary then breaks latency down by tag, isolating which query shape degrades.

export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function toQuery(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

// Search terms by kind, all >= search_min_length (task-20 rejects shorter terms with
// 422, so probing the old sub-trigram path would just break the failure threshold).
// `prefix` = 3-char surname prefixes: index-served but broad; `full` = full surnames.
export const SEARCH_TERMS = {
  prefix: ['smi', 'joh', 'wil', 'bro'],
  full: ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis'],
  email: ['example.com', '@example'], // every seeded email matches → broad result set
  nomatch: ['zzzqx', 'qwxzv'],
};
export const TERM_KINDS = Object.keys(SEARCH_TERMS);

// 10k patients / page_size 20 = 500 pages. Deep pages force a large OFFSET scan.
export const PAGES = {
  shallow: [1, 2, 3],
  deep: [250, 400, 499],
};

// indexed: backed by ix_patients_last_name btree.
// unindexed: no supporting index → ORDER BY sorts the filtered set.
export const SORTS = {
  indexed: [
    ['last_name', 'asc'],
    ['last_name', 'desc'],
  ],
  unindexed: [
    ['first_name', 'asc'],
    ['last_visit', 'desc'],
    ['created_at', 'desc'],
  ],
};
