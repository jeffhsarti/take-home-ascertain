# Task 09 — Patient Detail: Notes & Summary UI

- **Assignment:** Part 3 (Frontend, items 1–2)
- **Depends on:** task-06, task-07
- **Status:** Not started

## Objective

Build the individual patient view: profile details, a notes section (list / add /
delete), and a generated-summary view.

## Deliverables

- `frontend/src/hooks/usePatient.ts` — `GET /patients/{id}`.
- `frontend/src/hooks/useNotes.ts` — notes query + create/delete mutations with cache
  invalidation (or optimistic update) on the patient's notes key.
- `frontend/src/hooks/useSummary.ts` — `GET /patients/{id}/summary`, fetched on demand.
- `frontend/src/components/notes/NoteList.tsx` — notes with formatted timestamps + delete
  buttons.
- `frontend/src/components/notes/NoteForm.tsx` — add-note form (rhf + zod, content
  required).
- `frontend/src/pages/PatientDetail.tsx` — profile header (name, age, blood type,
  status, contact, allergies/conditions), a Notes section, and a Summary section/tab.

## Implementation Notes

- Profile header surfaces the key clinical fields prominently (allergies/conditions as
  chips, status chip, blood type).
- Notes: newest first; deleting uses an optimistic update with rollback on error.
- Summary: a "Generate / View summary" action triggers the query; show a loading state;
  render the narrative plus a small badge indicating `source` (`template` vs `llm`).
- Handle the not-found case (invalid `:id`) gracefully — show a message / link back.

## Acceptance Criteria

- Detail view shows full profile + clinical info.
- Notes can be added and deleted; the list updates immediately.
- Summary renders coherent text including identifiers, conditions/allergies, and a
  notes-derived narrative.
