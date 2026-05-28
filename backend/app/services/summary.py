import asyncio
import logging

from app.core.config import settings
from app.core.dates import compute_age
from app.models import Note, Patient
from app.schemas.summary import PatientSummary

logger = logging.getLogger("app.summary")


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
        # Hard ceiling on the LLM round-trip — Haiku with 400 tokens usually responds in
        # 1-3s, so 5s leaves ~2x headroom while keeping the worst-case user wait bounded.
        # Without this the request would block on a hung Anthropic call and tie up a
        # connection-pool slot indefinitely under any concurrency.
        message = await asyncio.wait_for(
            client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=400,
                system=[
                    {
                        "type": "text",
                        "text": (
                            "You are a clinical assistant. Write a concise, coherent "
                            "narrative summary of the patient from their profile and notes, "
                            "in a professional tone and at most two short paragraphs. "
                            "Respond in plain prose only: no Markdown, no headings, no "
                            "bullet points, no bold or other special formatting — output "
                            "should match a plain-text template."
                        ),
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[{"role": "user", "content": user}],
            ),
            timeout=5.0,
        )
        text = "".join(block.text for block in message.content if block.type == "text")
        return text.strip() or None
    except TimeoutError:
        # Expected degradation under upstream slowness — log at WARNING (not ERROR) so
        # it doesn't pollute alerting, but is still visible when diagnosing latency.
        logger.warning("LLM summary timed out after 5s; falling back to template")
        return None
    except Exception:
        # A key was configured (guarded above) yet the call failed — surface this at
        # error level so a misconfiguration isn't masked by the silent template fallback.
        logger.exception("LLM summary generation failed; falling back to template")
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
