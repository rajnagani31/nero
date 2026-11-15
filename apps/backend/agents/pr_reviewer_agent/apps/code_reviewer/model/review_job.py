from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    Numeric,
    SmallInteger,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .mixin import DateTimeMixin

# Import Base from the centralized database module
from apps.backend.bot.application.core.database import Base


class ReviewJobStatusEnum(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


class ReviewJob(Base, DateTimeMixin):
    __tablename__ = "review_jobs"
    __table_args__ = (
        Index("ix_review_jobs_status_queued_at", "status", "queued_at"),
        Index("ix_review_jobs_pr_id_queued_at", "pr_id", "queued_at"),
        Index("ix_review_jobs_pr_reviewed_commit", "pr_id", "reviewed_commit_sha"),
    )
    __metadata__ = MetaData(info={"schema_disc": "Stores one AI review execution/lifecycle for a PR."})
    """
    1. PR webhook received
    2. Create ReviewJob(status="queued")
    3. Worker picks job
    4. Update status="running", started_at=now()
    5. Run AI review
    6. If success: status="succeeded", finished_at=now()
    7. If error: status="failed", error_code="MODEL_TIMEOUT"

    # Example
    {
    "id": 1001,
    "pr_id": 25,
    "status": "queued",
    "attempts": 0,
    "queued_at": "2026-07-19T10:00:00Z"
    }

    # Why this table is useful
        - This table lets you track:
        - which PR review is pending,
        - which review is currently running,
        - retry attempts,
        - failures,
        - when the review started and finished.
    """
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    pr_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[ReviewJobStatusEnum] = mapped_column(
        SQLEnum(ReviewJobStatusEnum, name="review_job_status_enum"),
        nullable=False,
        default=ReviewJobStatusEnum.QUEUED,
    )
    attempts: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    total_files: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processed_files: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    queued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    final_review_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    base_sha: Mapped[str | None] = mapped_column(String(64), nullable=True)
    head_sha: Mapped[str | None] = mapped_column(String(64), nullable=True)
    review_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    github_review_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    reviewed_commit_sha: Mapped[str | None] = mapped_column(String(64), nullable=True)
    delivery_error: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Runtime AI Telemetry & Multi-Provider Tracking (nullable until processed)
    user_tier: Mapped[str] = mapped_column(String(32), nullable=False, default="free", server_default=text("'free'"))
    primary_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    fallback_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    fallback_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    total_completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    total_latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    credits_deducted: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False, default=Decimal("0.0000"), server_default=text("0.0000"))
