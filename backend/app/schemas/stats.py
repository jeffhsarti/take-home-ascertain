from pydantic import BaseModel


class AgeGroupBucket(BaseModel):
    label: str
    count: int


class ConditionCount(BaseModel):
    condition: str
    count: int


class PatientStats(BaseModel):
    """Dashboard aggregates, computed in SQL so the client never downloads the
    full dataset just to chart it."""

    total: int
    by_status: dict[str, int]
    by_blood_type: dict[str, int]
    by_age_group: list[AgeGroupBucket]
    top_conditions: list[ConditionCount]
