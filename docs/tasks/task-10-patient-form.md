# Task 10 — Patient Create/Edit Form

- **Assignment:** Part 4 (items 1–3)
- **Depends on:** task-05, task-07
- **Status:** Not started

## Objective

Build a single reusable form for creating and editing patients, with client-side and
server-side validation, meaningful error messages, and robust error handling.

## Deliverables

- `frontend/src/components/patients/PatientForm.tsx` (or under `pages/`) — controlled
  form covering:
  - **Personal:** first/last name, date of birth, email, phone, address
    (street/city/state/zip).
  - **Medical:** allergies (multi-entry), conditions (multi-entry), blood type (select),
    status (select).
- `frontend/src/hooks/` — `useCreatePatient` / `useUpdatePatient` mutations with cache
  invalidation of the list + detail queries.
- A shared `zod` schema for the form, mirroring the server's validation rules.

## Implementation Notes

- react-hook-form + `zodResolver`; MUI fields wired via `Controller`. Inline field-level
  error messages.
- **Edit mode** pre-populates from `usePatient`; **create mode** starts empty. Same
  component, mode inferred from route/props.
- **Server validation mapping:** on a 422 response, map FastAPI's error locations to the
  corresponding form fields via `setError`; show a form-level message for non-field
  errors.
- **Network failures:** catch mutation errors and surface a snackbar/toast ("Could not
  save — try again"); keep the form populated so input isn't lost.
- Disable submit while pending; navigate to the detail view on success.

## Acceptance Criteria

- Create and edit both work end-to-end and persist via the API.
- Submitting invalid data shows client-side errors before any request; server-side
  validation errors (e.g., duplicate email if enforced, bad email) map to fields.
- A simulated network failure shows a clear, non-destructive error message.
