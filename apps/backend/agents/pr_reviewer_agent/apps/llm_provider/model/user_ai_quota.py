from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from apps.backend.bot.application.core.database import Base


class UserAIQuota(Base):
    """
    Tracks monthly PR review quotas and credit balances per user.
    """
    __tablename__ = "user_ai_quotas"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_ai_quotas_user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_details.id", ondelete="CASCADE"), nullable=False
    )
    tier: Mapped[str] = mapped_column(String(32), nullable=False, default="free")  # 'free' | 'paid' | 'enterprise'
    monthly_pr_quota: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    prs_reviewed_this_month: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    credit_balance: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
