"""Idempotent database seeding.

Run standalone with ``python -m app.seed`` or via the app lifespan. Seeding only
runs when the patients table is empty, so it is safe to invoke on every startup.
"""

import asyncio
import logging
import random
from datetime import UTC, datetime, timedelta

from faker import Faker
from sqlalchemy import func, select

from app.db.session import AsyncSessionLocal
from app.models import BloodType, Note, Patient, PatientStatus

logger = logging.getLogger("app.seed")

NUM_PATIENTS = 10000
SEED = 42

CONDITIONS = [
    "Hypertension",
    "Type 2 Diabetes",
    "Asthma",
    "Hyperlipidemia",
    "Osteoarthritis",
    "Depression",
    "Anxiety",
    "GERD",
    "Hypothyroidism",
    "Migraine",
    "Coronary Artery Disease",
    "COPD",
    "Chronic Kidney Disease",
    "Atrial Fibrillation",
    "Obesity",
]

ALLERGIES = [
    "Penicillin",
    "Peanuts",
    "Latex",
    "Shellfish",
    "Aspirin",
    "Sulfa drugs",
    "Ibuprofen",
    "Eggs",
    "Pollen",
    "Bee stings",
    "Dairy",
    "Tree nuts",
]

NOTE_SNIPPETS = [
    "Routine check-up. Vitals within normal limits.",
    "Patient reports improved energy levels since last visit.",
    "Adjusted medication dosage; will follow up in four weeks.",
    "Complains of intermittent headaches; advised hydration and rest.",
    "Blood pressure slightly elevated; recommended dietary changes.",
    "Lab results reviewed; cholesterol trending down.",
    "Discussed lifestyle modifications and an exercise plan.",
    "Reported mild discomfort; prescribed a short course of medication.",
    "Follow-up on chronic condition; stable and well-managed.",
    "Patient missed the previous appointment; reschedule recommended.",
    "Wound healing well; sutures removed without complication.",
    "Referred to specialist for further evaluation.",
]

STATUSES = [PatientStatus.ACTIVE, PatientStatus.INACTIVE, PatientStatus.DISCHARGED]
STATUS_WEIGHTS = [0.7, 0.2, 0.1]


def _build_patient(fake: Faker, rng: random.Random, index: int) -> Patient:
    first = fake.first_name()
    last = fake.last_name()
    # Suffix with the sequential index so the unique email constraint holds
    # regardless of first/last name collisions (Faker's name pool is finite).
    return Patient(
        first_name=first,
        last_name=last,
        date_of_birth=fake.date_of_birth(minimum_age=1, maximum_age=95),
        email=f"{first.lower()}.{last.lower()}.{index}@example.com",
        phone=fake.phone_number()[:50],
        address_street=fake.street_address(),
        address_city=fake.city(),
        address_state=fake.state_abbr(),
        address_zip=fake.postcode(),
        blood_type=rng.choice(list(BloodType)),
        status=rng.choices(STATUSES, weights=STATUS_WEIGHTS)[0],
        allergies=rng.sample(ALLERGIES, k=rng.randint(0, 3)),
        conditions=rng.sample(CONDITIONS, k=rng.randint(0, 3)),
        last_visit=fake.date_between(start_date="-2y", end_date="today"),
    )


def _build_notes(rng: random.Random) -> list[Note]:
    notes: list[Note] = []
    for _ in range(rng.randint(0, 5)):
        days_ago = rng.randint(1, 365)
        created = datetime.now(UTC) - timedelta(days=days_ago, hours=rng.randint(0, 23))
        notes.append(Note(content=rng.choice(NOTE_SNIPPETS), created_at=created))
    return notes


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count()).select_from(Patient))
        if count:
            logger.info("Database already seeded (%s patients); skipping.", count)
            return

        fake = Faker()
        Faker.seed(SEED)
        rng = random.Random(SEED)

        patients: list[Patient] = []
        for i in range(NUM_PATIENTS):
            patient = _build_patient(fake, rng, i)
            patient.notes = _build_notes(rng)
            patients.append(patient)

        session.add_all(patients)
        await session.commit()
        logger.info("Seeded %s patients.", len(patients))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    asyncio.run(seed())
