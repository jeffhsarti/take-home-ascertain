from uuid import UUID

from sqlalchemy import case, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BloodType, Patient, PatientStatus
from app.schemas.patient import PatientCreate, PatientUpdate
from app.schemas.stats import AgeGroupBucket, ConditionCount, PatientStats

# Whitelist of sortable columns; anything else falls back to last_name.
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

    column = SORTABLE.get(sort_by, Patient.last_name)
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
    return patient


async def update_patient(session: AsyncSession, patient: Patient, data: PatientUpdate) -> Patient:
    for field, value in data.model_dump().items():
        setattr(patient, field, value)
    await session.commit()
    await session.refresh(patient)
    return patient


async def delete_patient(session: AsyncSession, patient: Patient) -> None:
    await session.delete(patient)
    await session.commit()


async def get_patient_stats(session: AsyncSession) -> PatientStats:
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
