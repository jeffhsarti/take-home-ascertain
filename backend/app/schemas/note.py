from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NoteCreate(BaseModel):
    content: str = Field(min_length=1)
    # Optional client-provided timestamp; defaults to now() server-side.
    timestamp: datetime | None = None

    @field_validator("timestamp")
    @classmethod
    def timestamp_not_in_future(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        # Compare in UTC; treat a naive timestamp as UTC.
        compare = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
        if compare > datetime.now(UTC):
            raise ValueError("timestamp cannot be in the future")
        return value


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    content: str
    created_at: datetime
