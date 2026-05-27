"""add indexes and unique email

Revision ID: b2c3d4e5f6a7
Revises: 93a45de7fa87
Create Date: 2026-05-27 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = '93a45de7fa87'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Email is a natural patient identifier -> enforce uniqueness.
    op.create_index("ix_patients_email", "patients", ["email"], unique=True)
    # Btree indexes backing the default sort (last_name) and the status filter.
    op.create_index("ix_patients_last_name", "patients", ["last_name"])
    op.create_index("ix_patients_status", "patients", ["status"])
    # Trigram GIN indexes so the substring ILIKE search stays index-backed at scale
    # (a leading-wildcard LIKE cannot use a btree).
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX ix_patients_first_name_trgm ON patients "
        "USING gin (first_name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_patients_last_name_trgm ON patients "
        "USING gin (last_name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_patients_email_trgm ON patients USING gin (email gin_trgm_ops)"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS ix_patients_email_trgm")
    op.execute("DROP INDEX IF EXISTS ix_patients_last_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_patients_first_name_trgm")
    op.drop_index("ix_patients_status", table_name="patients")
    op.drop_index("ix_patients_last_name", table_name="patients")
    op.drop_index("ix_patients_email", table_name="patients")
