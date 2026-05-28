import asyncio
import time
from uuid import UUID

from sqlalchemy import case, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import BloodType, Patient, PatientStatus
from app.schemas.patient import PatientCreate, PatientUpdate
from app.schemas.stats import AgeGroupBucket, ConditionCount, PatientStats

# Whitelist of sortable columns. The route validates `sort_by` against a
# matching `Literal[...]` and 422s anything else, so this dict is also the
# canonical source for that enumeration.
SORTABLE = {
    "first_name": Patient.first_name,
    "last_name": Patient.last_name,
    "last_visit": Patient.last_visit,
    "status": Patient.status,
    "created_at": Patient.created_at,
}

# Fixed clinical age buckets, in display order. Upper bound is exclusive.
AGE_BUCKETS: list[tuple[str, int | None]] = [
    ("0-17", 18),
    ("18-34", 35),
    ("35-49", 50),
    ("50-64", 65),
    ("65+", None),
]
TOP_CONDITIONS_LIMIT = 8


async def list_patients(
    session: AsyncSession,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    status: PatientStatus | None = None,
    sort_by: str = "last_name",
    sort_order: str = "asc",
) -> tuple[list[Patient], int]:
    stmt = select(Patient)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Patient.first_name.ilike(like),
                Patient.last_name.ilike(like),
                Patient.email.ilike(like),
            )
        )
    if status is not None:
        stmt = stmt.where(Patient.status == status)

    total = await session.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    column = SORTABLE[sort_by]
    ordering = column.desc() if sort_order == "desc" else column.asc()
    stmt = stmt.order_by(ordering).offset((page - 1) * page_size).limit(page_size)

    result = await session.scalars(stmt)
    return list(result), total


async def get_patient(session: AsyncSession, patient_id: UUID) -> Patient | None:
    return await session.get(Patient, patient_id)


async def create_patient(session: AsyncSession, data: PatientCreate) -> Patient:
    patient = Patient(**data.model_dump())
    session.add(patient)
    await session.commit()
    await session.refresh(patient)
    reset_stats_cache()
    return patient


async def update_patient(session: AsyncSession, patient: Patient, data: PatientUpdate) -> Patient:
    for field, value in data.model_dump().items():
        setattr(patient, field, value)
    await session.commit()
    await session.refresh(patient)
    reset_stats_cache()
    return patient


async def delete_patient(session: AsyncSession, patient: Patient) -> None:
    await session.delete(patient)
    await session.commit()
    reset_stats_cache()


# Short-lived, per-process cache for the dashboard aggregates (task-19). The stats
# query is the heaviest read (five aggregations incl. a JSONB unnest over every row);
# the dashboard is the landing page, so it gets hit on every session open.
_stats_cache: PatientStats | None = None
_stats_cached_at: float = 0.0
_stats_lock = asyncio.Lock()


def reset_stats_cache() -> None:
    """Drop the cached stats. Called from tests and from every patient mutation
    so the writer's next dashboard request reflects their change. Only busts
    the local worker's cache — other workers still serve stale data until their
    own TTL elapses (acceptable: a stats panel can lag by ``ttl`` across workers,
    but should never lag for the user who just made the change)."""
    global _stats_cache, _stats_cached_at
    _stats_cache = None
    _stats_cached_at = 0.0


async def get_patient_stats(session: AsyncSession) -> PatientStats:
    """Return dashboard aggregates, served from a short-lived in-process cache.

    The cache is per uvicorn worker, so a value can be up to `stats_cache_ttl_seconds`
    stale and workers may briefly disagree — acceptable for a stats dashboard. Set the
    TTL to 0 to always recompute."""
    ttl = settings.stats_cache_ttl_seconds
    if ttl <= 0:
        return await _compute_patient_stats(session)

    global _stats_cache, _stats_cached_at
    if _stats_cache is not None and (time.monotonic() - _stats_cached_at) < ttl:
        return _stats_cache

    async with _stats_lock:
        # Another coroutine may have refreshed it while we waited for the lock.
        if _stats_cache is None or (time.monotonic() - _stats_cached_at) >= ttl:
            _stats_cache = await _compute_patient_stats(session)
            _stats_cached_at = time.monotonic()
        return _stats_cache


async def _compute_patient_stats(session: AsyncSession) -> PatientStats:
    """Aggregate counts for the dashboard charts in a handful of GROUP BY queries.

    Every category is zero-filled so the frontend always receives the full set of
    statuses, blood types, and age buckets even when a group is empty."""
    total = await session.scalar(select(func.count()).select_from(Patient)) or 0

    by_status = {s.value: 0 for s in PatientStatus}
    for status, count in await session.execute(
        select(Patient.status, func.count()).group_by(Patient.status)
    ):
        by_status[status.value] = count

    by_blood_type = {b.value: 0 for b in BloodType}
    for blood_type, count in await session.execute(
        select(Patient.blood_type, func.count()).group_by(Patient.blood_type)
    ):
        by_blood_type[blood_type.value] = count

    # Derive whole-year age in SQL and bucket it; mirrors core.dates.compute_age.
    age_years = func.extract("year", func.age(Patient.date_of_birth))
    bucket = case(
        *[(age_years < upper, label) for label, upper in AGE_BUCKETS if upper is not None],
        else_=AGE_BUCKETS[-1][0],
    )
    age_counts = {label: 0 for label, _ in AGE_BUCKETS}
    for label, count in await session.execute(
        select(bucket.label("bucket"), func.count()).group_by(bucket)
    ):
        age_counts[label] = count
    by_age_group = [
        AgeGroupBucket(label=label, count=age_counts[label]) for label, _ in AGE_BUCKETS
    ]

    # conditions is JSONB; unnest it (lateral) to count occurrences across patients.
    condition = func.jsonb_array_elements_text(Patient.conditions).table_valued("value")
    top_conditions = [
        ConditionCount(condition=value, count=count)
        for value, count in await session.execute(
            select(condition.c.value, func.count())
            .select_from(Patient)
            .join(condition, true())
            .group_by(condition.c.value)
            .order_by(func.count().desc())
            .limit(TOP_CONDITIONS_LIMIT)
        )
    ]

    return PatientStats(
        total=total,
        by_status=by_status,
        by_blood_type=by_blood_type,
        by_age_group=by_age_group,
        top_conditions=top_conditions,
    )
