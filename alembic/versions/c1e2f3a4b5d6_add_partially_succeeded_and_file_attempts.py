"""add_partially_succeeded_and_file_attempts

Revision ID: c1e2f3a4b5d6
Revises: fbee6d4431b4
Create Date: 2026-11-16 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1e2f3a4b5d6'
down_revision: Union[str, Sequence[str], None] = 'fbee6d4431b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add partially_succeeded value to review_job_status_enum
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE review_job_status_enum ADD VALUE IF NOT EXISTS 'partially_succeeded'")

    # 2. Add attempts column to review_file_results
    op.add_column(
        'review_file_results',
        sa.Column('attempts', sa.SmallInteger(), nullable=False, server_default=sa.text('1'))
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('review_file_results', 'attempts')
