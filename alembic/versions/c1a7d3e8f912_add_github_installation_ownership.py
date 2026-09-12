"""add GitHub installation ownership

Revision ID: c1a7d3e8f912
Revises: d8e8c7358b2b
Create Date: 2026-09-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "c1a7d3e8f912"
down_revision = "d8e8c7358b2b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "github_installations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("installation_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("github_account_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user_details.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("installation_id", name="uq_github_installations_installation_id"),
    )
    op.create_index(
        "ix_github_installations_installation_id",
        "github_installations",
        ["installation_id"],
        unique=False,
    )
    op.create_index(
        "ix_github_installations_user_id",
        "github_installations",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_github_installations_user_id", table_name="github_installations")
    op.drop_index("ix_github_installations_installation_id", table_name="github_installations")
    op.drop_table("github_installations")
