import re
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator

from app.core.dates import compute_age
from app.models.patient import BloodType, PatientStatus


class PatientBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    date_of_birth: date
    email: EmailStr
    phone: str = Field(min_length=1, max_length=50)
    address_street: str = Field(min_length=1, max_length=255)
    address_city: str = Field(min_length=1, max_length=120)
    address_state: str = Field(min_length=1, max_length=120)
    address_zip: str = Field(min_length=1, max_length=20)
    blood_type: BloodType
    # NOTE: no defaults here. PatientCreate adds them; PatientUpdate (PUT) must stay
    # strict so an omitted field raises 422 instead of silently resetting stored data.
    status: PatientStatus
    allergies: list[str]
    conditions: list[str]
    last_visit: date | None

    @field_validator("date_of_birth")
    @classmethod
    def dob_not_in_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("date_of_birth cannot be in the future")
        return value

    @field_validator("last_visit")
    @classmethod
    def last_visit_not_in_future(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("last_visit cannot be in the future")
        return value

    @field_validator("phone")
    @classmethod
    def phone_has_enough_digits(cls, value: str) -> str:
        if len(re.sub(r"\D", "", value)) < 7:
            raise ValueError("phone must contain at least 7 digits")
        return value


class PatientCreate(PatientBase):
    """Create payload — sensible defaults for the optional medical fields."""

    status: PatientStatus = PatientStatus.ACTIVE
    allergies: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    last_visit: date | None = None


class PatientUpdate(PatientBase):
    """Full-resource replace (PUT) — every field is required, so omitting one
    returns 422 rather than silently wiping the stored value."""


class PatientRead(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def age(self) -> int:
        return compute_age(self.date_of_birth)
