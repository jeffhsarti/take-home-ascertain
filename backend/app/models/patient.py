import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.note import Note


class BloodType(enum.StrEnum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"


class PatientStatus(enum.StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCHARGED = "discharged"


def _enum_values(enum_cls: type[enum.Enum]) -> list[str]:
    return [member.value for member in enum_cls]


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100), index=True)
    date_of_birth: Mapped[date] = mapped_column(Date)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    phone: Mapped[str] = mapped_column(String(50))
    address_street: Mapped[str] = mapped_column(String(255))
    address_city: Mapped[str] = mapped_column(String(120))
    address_state: Mapped[str] = mapped_column(String(120))
    address_zip: Mapped[str] = mapped_column(String(20))
    blood_type: Mapped[BloodType] = mapped_column(
        Enum(BloodType, name="blood_type", values_callable=_enum_values)
    )
    status: Mapped[PatientStatus] = mapped_column(
        Enum(PatientStatus, name="patient_status", values_callable=_enum_values),
        default=PatientStatus.ACTIVE,
        index=True,
    )
    allergies: Mapped[list[str]] = mapped_column(JSONB, default=list)
    conditions: Mapped[list[str]] = mapped_column(JSONB, default=list)
    last_visit: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    notes: Mapped[list["Note"]] = relationship(
        back_populates="patient",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Note.created_at.desc()",
    )
