from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models import PatientStatus
from app.schemas.common import Paginated
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate
from app.schemas.stats import PatientStats
from app.services import patients as service

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=Paginated[PatientRead])
async def list_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    status: PatientStatus | None = Query(None),
    sort_by: Literal["first_name", "last_name", "last_visit", "status", "created_at"] = Query(
        "last_name"
    ),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
) -> Paginated[PatientRead]:
    # A whitespace-only term is "no search"; a non-empty term below the trigram floor
    # is rejected rather than triggering a full-table sequential scan (task-20).
    if search is not None:
        search = search.strip()
        if not search:
            search = None
        elif len(search) < settings.search_min_length:
            raise HTTPException(
                status_code=422,
                detail=f"Search term must be at least {settings.search_min_length} characters.",
            )
    items, total = await service.list_patients(
        db,
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    total_pages = (total + page_size - 1) // page_size if total else 0
    return Paginated[PatientRead](
        items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
    )


# Declared before /{patient_id} so "stats" is matched as a literal, not a UUID path param.
@router.get("/stats", response_model=PatientStats)
async def patient_stats(db: AsyncSession = Depends(get_db)) -> PatientStats:
    return await service.get_patient_stats(db)


@router.get("/{patient_id}", response_model=PatientRead)
async def get_patient(patient_id: UUID, db: AsyncSession = Depends(get_db)) -> PatientRead:
    patient = await service.get_patient(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("", response_model=PatientRead, status_code=201)
async def create_patient(data: PatientCreate, db: AsyncSession = Depends(get_db)) -> PatientRead:
    return await service.create_patient(db, data)


@router.put("/{patient_id}", response_model=PatientRead)
async def update_patient(
    patient_id: UUID, data: PatientUpdate, db: AsyncSession = Depends(get_db)
) -> PatientRead:
    patient = await service.get_patient(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return await service.update_patient(db, patient, data)


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(patient_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    patient = await service.get_patient(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    await service.delete_patient(db, patient)
