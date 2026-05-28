# Task 06 — Notes & Summary Endpoints

- **Assignment:** Part 3 (Backend, items 1–2)
- **Depends on:** task-05
- **Status:** Not started

## Objective

Add clinical notes to patients and a human-readable summary endpoint that synthesizes
the patient's profile and notes.

## Deliverables

- `backend/app/schemas/note.py` — `NoteCreate` (`content`, optional `timestamp`),
  `NoteRead`.
- `backend/app/schemas/summary.py` — `PatientSummary` (identifiers, narrative, key
  clinical info, and a `source` field: `"template"` or `"llm"`).
- `backend/app/services/summary.py` — summary generation (see below).
- `backend/app/api/notes.py` — router:
  - `POST /patients/{id}/notes` — 201; validates patient exists (404 otherwise).
  - `GET /patients/{id}/notes` — list ordered by `created_at` desc.
  - `DELETE /patients/{id}/notes/{note_id}` — 204; 404 if note/patient missing.
  - `GET /patients/{id}/summary` — returns `PatientSummary`.

## Summary Generation

The summary must include: basic identifiers (name, age, blood type), a coherent
narrative built from the notes (chronological), and key clinical info (conditions,
allergies).

- **Default (deterministic template):** pure-Python assembly — greeting line with
  name/age/blood type, a sentence listing conditions and allergies, then a narrative
  paragraph stitched from notes in chronological order with date framing. Fully offline,
  reproducible.
- **Optional LLM:** if `ANTHROPIC_API_KEY` is set, call Claude (`claude-haiku-4-5`) with
  the profile + notes to produce more natural prose. Use prompt caching for the system
  prompt. **Any failure or missing key falls back to the template** — the endpoint never
  errors due to LLM unavailability. Set `source` accordingly.

## Acceptance Criteria

- Notes can be created (with and without a client timestamp), listed (desc), and deleted.
- Deleting a patient cascades and removes their notes (verified via task-03 FK).
- `GET /patients/{id}/summary` returns a coherent summary including identifiers,
  conditions, allergies, and a notes-derived narrative — **with no API key configured**.
- With a valid `ANTHROPIC_API_KEY`, `source` is `"llm"`; on simulated failure it falls
  back to `"template"` without a 5xx.
