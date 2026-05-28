# Task 14 — Patient stats aggregation endpoint

- **Assignment:** Advanced UI/UX (data visualization) backing + Advanced Backend overlap
- **Depends on:** task-05
- **Status:** Not started

## Objective

Expose a single `GET /patients/stats` endpoint that returns dashboard aggregates computed
in SQL, so the frontend can render charts without downloading the full dataset. This
replaces the current four-call `useDashboardStats` pattern and scales to 10k+ patients.

## Deliverables

- `backend/app/schemas/stats.py` — `PatientStats` Pydantic model:
  - `total: int`
  - `by_status: dict[str, int]` — keyed by status value (`active`/`inactive`/`discharged`)
  - `by_blood_type: dict[str, int]` — keyed by the 8 blood-type values
  - `by_age_group: list[AgeGroupBucket]` — `{label: str, count: int}`, fixed clinical
    buckets `0-17`, `18-34`, `35-49`, `50-64`, `65+` (always present, zero-filled)
  - `top_conditions: list[ConditionCount]` — `{condition: str, count: int}`, top 8 by count
- `backend/app/services/patients.py` — `get_patient_stats(session) -> PatientStats`.
- `backend/app/api/patients.py` — `GET /patients/stats` route. **Declare it before**
  `GET /patients/{patient_id}` so `stats` is not captured as a UUID path param.
- `backend/tests/` — test asserting the shape, zero-filled groups, and that counts sum to
  `total`.

## Implementation Notes

- **Status / blood type:** `select(col, func.count()).group_by(col)`; both columns are
  enum-typed and `status` is already indexed. Zero-fill missing keys from the enum members
  so the frontend always receives every category.
- **Age groups:** derive age in SQL from `date_of_birth` via
  `EXTRACT(YEAR FROM AGE(date_of_birth))`, bucket with a `CASE` expression, `GROUP BY` the
  bucket label. Return all five buckets in fixed order even when empty.
- **Top conditions:** `conditions` is `JSONB`. Unnest with a lateral
  `func.jsonb_array_elements_text(Patient.conditions)` table-valued function, `GROUP BY`
  the value, `ORDER BY count DESC`, `LIMIT 8`. (Same pattern is available for allergies if
  we extend later.)
- Run the four aggregations as separate awaited queries (small result sets); no need to
  combine into one statement. Keep the service pure (returns the schema, no I/O beyond the
  session).

## Acceptance Criteria

- `GET /patients/stats` returns `200` with all four aggregates populated against seed data.
- `sum(by_status.values()) == total`; every status, blood type, and age bucket is present
  (zero when empty).
- `top_conditions` is ordered by descending count and capped at 8.
- Route resolves correctly and is not shadowed by `/patients/{patient_id}`.
