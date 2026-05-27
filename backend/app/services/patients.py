from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Patient, PatientStatus
from app.schemas.patient import PatientCreate, PatientUpdate

# Whitelist of sortable columns; anything else falls back to last_name.
SORTABLE = {
    "first_name": Patient.first_name,
    "last_name": Patient.last_name,
    "last_visit": Patient.last_visit,
    "status": Patient.status,
    "created_at": Patient.created_at,
}


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
