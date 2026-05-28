// Write-path smoke (task-23) → POST/PUT/DELETE patient + POST/DELETE note.
//
// Each iteration is self-contained: it creates a patient, updates it, attaches
// and removes a note, and finally deletes the patient. A clean run is net-zero
// rows, so the read suite's dataset (and seeded row counts) stays untouched.
// A crashed iteration may leave one row behind — acceptable for smoke; do NOT
// add a teardown that wipes the table (that would mask real failures).
//
// Tags: every request carries `scenario:writes` + `op:<name>`. The summary
// surfaces per-op p95 via the reporting-only thresholds in lib/config.js.

import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL } from '../lib/config.js';
import { latency } from '../lib/metrics.js';
import { patientPayload, patientUpdatePayload, notePayload } from '../lib/data.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function writes() {
  group('writes', () => {
    // --- create -----------------------------------------------------------------
    const createBody = patientPayload();
    const createRes = http.post(`${BASE_URL}/patients`, JSON.stringify(createBody), {
      headers: JSON_HEADERS,
      tags: { scenario: 'writes', op: 'create' },
    });
    latency.writes.add(createRes.timings.duration);
    const created = createRes.status === 201 && createRes.body ? createRes.json() : null;
    const ok = check(createRes, {
      'create 201': (r) => r.status === 201,
      'create has id': () => created !== null && typeof created.id === 'string',
    });
    // Without an id there's nothing to clean up; bail out of the iteration so we
    // don't fall through to update/delete with a null path param.
    if (!ok || !created) return;
    const patientId = created.id;

    // --- update (full-replace PUT) ---------------------------------------------
    const updateBody = patientUpdatePayload(createBody);
    const updateRes = http.put(
      `${BASE_URL}/patients/${patientId}`,
      JSON.stringify(updateBody),
      { headers: JSON_HEADERS, tags: { scenario: 'writes', op: 'update' } }
    );
    latency.writes.add(updateRes.timings.duration);
    const updated = updateRes.status === 200 && updateRes.body ? updateRes.json() : null;
    check(updateRes, {
      'update 200': (r) => r.status === 200,
      'update echoes first_name': () =>
        updated !== null && updated.first_name === updateBody.first_name,
    });

    // --- note: create + delete -------------------------------------------------
    const noteRes = http.post(
      `${BASE_URL}/patients/${patientId}/notes`,
      JSON.stringify(notePayload()),
      { headers: JSON_HEADERS, tags: { scenario: 'writes', op: 'note' } }
    );
    latency.writes.add(noteRes.timings.duration);
    const note = noteRes.status === 201 && noteRes.body ? noteRes.json() : null;
    check(noteRes, {
      'note 201': (r) => r.status === 201,
      'note has id': () => note !== null && typeof note.id === 'string',
    });
    if (note) {
      const noteDelRes = http.del(
        `${BASE_URL}/patients/${patientId}/notes/${note.id}`,
        null,
        { tags: { scenario: 'writes', op: 'note_delete' } }
      );
      latency.writes.add(noteDelRes.timings.duration);
      check(noteDelRes, { 'note delete 204': (r) => r.status === 204 });
    }

    // --- delete (cleanup) ------------------------------------------------------
    // ON DELETE CASCADE on notes.patient_id covers any note we failed to remove
    // above, so this is the row-count guarantee even if note_delete failed.
    const delRes = http.del(`${BASE_URL}/patients/${patientId}`, null, {
      tags: { scenario: 'writes', op: 'delete' },
    });
    latency.writes.add(delRes.timings.duration);
    check(delRes, { 'delete 204': (r) => r.status === 204 });
  });
}
