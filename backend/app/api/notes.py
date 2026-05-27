from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Note, Patient
from app.schemas.note import NoteCreate, NoteRead
from app.schemas.summary import PatientSummary
from app.services.summary import generate_patient_summary

router = APIRouter(prefix="/patients/{patient_id}", tags=["notes"])


async def _get_patient_or_404(db: AsyncSession, patient_id: UUID) -> Patient:
    patient = await db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/notes", response_model=NoteRead, status_code=201)
async def add_note(
    patient_id: UUID, data: NoteCreate, db: AsyncSession = Depends(get_db)
) -> NoteRead:
    await _get_patient_or_404(db, patient_id)
    note = Note(patient_id=patient_id, content=data.content)
    if data.timestamp is not None:
        note.created_at = data.timestamp
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.get("/notes", response_model=list[NoteRead])
async def list_notes(patient_id: UUID, db: AsyncSession = Depends(get_db)) -> list[NoteRead]:
    await _get_patient_or_404(db, patient_id)
    result = await db.scalars(
        select(Note).where(Note.patient_id == patient_id).order_by(Note.created_at.desc())
    )
    return list(result)


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(patient_id: UUID, note_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    note = await db.get(Note, note_id)
    if note is None or note.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()


@router.get("/summary", response_model=PatientSummary)
async def patient_summary(patient_id: UUID, db: AsyncSession = Depends(get_db)) -> PatientSummary:
    patient = await _get_patient_or_404(db, patient_id)
    notes = list(
        await db.scalars(
            select(Note).where(Note.patient_id == patient_id).order_by(Note.created_at.asc())
        )
    )
    return await generate_patient_summary(patient, notes)
