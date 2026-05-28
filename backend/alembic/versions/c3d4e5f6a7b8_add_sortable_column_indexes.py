"""add indexes for sortable columns

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-28 02:10:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Btree indexes backing the remaining columns in the `sort_by` whitelist
    # (first_name, last_visit, created_at). last_name and status are already indexed.
    # Lets the planner satisfy ORDER BY ... LIMIT from an index instead of sorting the
    # filtered set; negligible write overhead on this read-heavy table.
    op.create_index("ix_patients_first_name", "patients", ["first_name"])
    op.create_index("ix_patients_last_visit", "patients", ["last_visit"])
    op.create_index("ix_patients_created_at", "patients", ["created_at"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_patients_created_at", table_name="patients")
    op.drop_index("ix_patients_last_visit", table_name="patients")
    op.drop_index("ix_patients_first_name", table_name="patients")
