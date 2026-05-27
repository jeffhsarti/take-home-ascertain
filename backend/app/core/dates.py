from datetime import date


def compute_age(dob: date) -> int:
    """Whole years between ``dob`` and today (accounts for whether the birthday
    has occurred yet this year). Shared by the patient schema and the summary."""
    today = date.today()
    had_birthday = (today.month, today.day) >= (dob.month, dob.day)
    return today.year - dob.year - (0 if had_birthday else 1)
