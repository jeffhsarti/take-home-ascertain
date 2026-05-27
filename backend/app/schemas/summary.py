from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class PatientSummary(BaseModel):
    patient_id: UUID
    name: str
    age: int
    blood_type: str
    conditions: list[str]
    allergies: list[str]
    narrative: str
    source: Literal["template", "llm"]
