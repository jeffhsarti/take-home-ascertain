from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NoteCreate(BaseModel):
    content: str = Field(min_length=1)
    # Optional client-provided timestamp; defaults to now() server-side.
    timestamp: datetime | None = None


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    content: str
    created_at: datetime
