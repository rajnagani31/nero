from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from apps.backend.bot.application.core.database import Base


class AICallLog(Base):
    """
    Granular audit and telemetry log for every single LLM API attempt.
    Tracks status code, latency, token consumption, and failovers.
    """
    __tablename__ = "ai_call_logs"
    __table_args__ = (
        Index("ix_ai_call_logs_job_id", "job_id"),
        Index("ix_ai_call_logs_key_alias", "key_alias", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("review_jobs.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # 'groq' | 'openai'
    key_alias: Mapped[str] = mapped_column(String(32), nullable=False)  # 'groq_primary' | 'groq_fallback' | 'openai_paid'
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    attempt_number: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)  # 200, 429, 500, etc.
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
