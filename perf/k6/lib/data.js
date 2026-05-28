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

// --- write-path factories (task-23) -----------------------------------------------
// Smoke-only: each iteration creates rows and deletes them at the end, so the
// dataset the read suite depends on stays untouched.

// Enum values exactly as the backend StrEnums serialize them.
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const STATUSES = ['active', 'inactive', 'discharged'];
const FIRST_NAMES = ['Avery', 'Casey', 'Drew', 'Jamie', 'Logan', 'Morgan', 'Riley', 'Quinn'];
const LAST_NAMES = ['Ng', 'Ito', 'Khan', 'Park', 'Reyes', 'Silva', 'Tan', 'Vega'];
const STATES = ['NY', 'CA', 'TX', 'FL', 'WA'];
const ALLERGIES = ['penicillin', 'peanuts', 'latex', 'shellfish'];
const CONDITIONS = ['hypertension', 'asthma', 'diabetes-t2', 'migraine'];

// Email needs to be unique across the runs *and* across concurrent VUs. Use
// VU + ITER + a high-resolution timestamp so even back-to-back smoke runs don't
// collide against rows a previous crashed run left behind.
function uniqueEmail() {
  const vu = __VU || 0;
  const it = __ITER || 0;
  return `k6-write-${vu}-${it}-${Date.now()}@example.com`;
}

function isoDate(yearOffset) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearOffset);
  return d.toISOString().slice(0, 10);
}

export function patientPayload() {
  return {
    first_name: randomItem(FIRST_NAMES),
    last_name: randomItem(LAST_NAMES),
    date_of_birth: isoDate(-30 - Math.floor(Math.random() * 40)), // 30-70 yrs ago
    email: uniqueEmail(),
    phone: '+1-555-010-0123',
    address_street: '100 Test Ave',
    address_city: 'Springfield',
    address_state: randomItem(STATES),
    address_zip: '01234',
    blood_type: randomItem(BLOOD_TYPES),
    status: randomItem(STATUSES),
    allergies: [randomItem(ALLERGIES)],
    conditions: [randomItem(CONDITIONS)],
    last_visit: isoDate(0),
  };
}

// PUT is a full-resource replace (PatientUpdate requires every field), so the
// update payload is a fresh full body, not a partial. Vary a couple of fields
// so the request isn't a no-op the optimizer could collapse.
export function patientUpdatePayload(base) {
  return {
    ...base,
    first_name: randomItem(FIRST_NAMES),
    status: randomItem(STATUSES),
    last_visit: isoDate(0),
  };
}

export function notePayload() {
  return { content: `k6 smoke note ${__VU}-${__ITER}-${Date.now()}` };
}
