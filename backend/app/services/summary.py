import logging
from datetime import date

from app.core.config import settings
from app.models import Note, Patient
from app.schemas.summary import PatientSummary

logger = logging.getLogger("app.summary")


def compute_age(dob: date) -> int:
    today = date.today()
    had_birthday = (today.month, today.day) >= (dob.month, dob.day)
    return today.year - dob.year - (0 if had_birthday else 1)


def _join(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " and " + items[-1]


def build_template_narrative(patient: Patient, notes: list[Note], name: str, age: int) -> str:
    parts = [f"{name} is a {age}-year-old patient with blood type {patient.blood_type.value}."]

    if patient.conditions:
        parts.append(f"Known conditions include {_join(patient.conditions)}.")
    else:
        parts.append("No chronic conditions are on record.")

    if patient.allergies:
        parts.append(f"Documented allergies: {_join(patient.allergies)}.")
    else:
        parts.append("No known allergies.")

    if notes:
        chron = sorted(notes, key=lambda note: note.created_at)
        parts.append(f"There are {len(notes)} clinical notes on file.")
        entries = [f"On {note.created_at.strftime('%b %d, %Y')}, {note.content}" for note in chron]
        parts.append("Clinical history: " + " ".join(entries))
    else:
        parts.append("No clinical notes have been recorded yet.")

    return " ".join(parts)


async def _llm_narrative(patient: Patient, notes: list[Note], name: str, age: int) -> str | None:
    """Generate a richer narrative via Claude, or None if unavailable/failed."""
    if not settings.anthropic_api_key:
        return None
    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        chron = sorted(notes, key=lambda note: note.created_at)
        notes_text = (
            "\n".join(f"- {note.created_at.strftime('%Y-%m-%d')}: {note.content}" for note in chron)
            or "(no notes)"
        )
        user = (
            f"Patient: {name}\nAge: {age}\nBlood type: {patient.blood_type.value}\n"
            f"Conditions: {', '.join(patient.conditions) or 'none'}\n"
            f"Allergies: {', '.join(patient.allergies) or 'none'}\n"
            f"Notes (chronological):\n{notes_text}"
        )
        message = await client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=400,
            system=[
                {
                    "type": "text",
                    "text": (
                        "You are a clinical assistant. Write a concise, coherent narrative "
                        "summary of the patient from their profile and notes, in a professional "
                        "tone and at most two short paragraphs."
                    ),
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user}],
        )
        text = "".join(block.text for block in message.content if block.type == "text")
        return text.strip() or None
    except Exception:
        logger.warning("LLM summary generation failed; falling back to template", exc_info=True)
        return None


async def generate_patient_summary(patient: Patient, notes: list[Note]) -> PatientSummary:
    name = f"{patient.first_name} {patient.last_name}"
    age = compute_age(patient.date_of_birth)

    narrative = await _llm_narrative(patient, notes, name, age)
    source: str = "llm" if narrative else "template"
    if not narrative:
        narrative = build_template_narrative(patient, notes, name, age)

    return PatientSummary(
        patient_id=patient.id,
        name=name,
        age=age,
        blood_type=patient.blood_type.value,
        conditions=list(patient.conditions),
        allergies=list(patient.allergies),
        narrative=narrative,
        source=source,  # type: ignore[arg-type]
    )
