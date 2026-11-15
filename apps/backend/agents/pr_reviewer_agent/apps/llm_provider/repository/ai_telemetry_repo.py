import logging
from decimal import Decimal
from typing import Sequence

from sqlalchemy import func, select, update

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.pull_request import (
    PullRequest,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_job import (
    ReviewJob,
    ReviewJobStatusEnum,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.review_schema import (
    FinalReviewResult,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.model.ai_call_log import AICallLog
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.model.user_ai_quota import (
    UserAIQuota,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.schema.telemetry_schemas import (
    AICallLogDTO,
    JobTelemetryRollupDTO,
)
from apps.backend.bot.application.core.database import SessionLocal

logger = logging.getLogger(__name__)


class AITelemetryRepository:
    """Type-safe repository handling audit logs and quota persistence using Pydantic DTOs."""

    def __init__(self, session_factory=SessionLocal) -> None:
        self.session_factory = session_factory

    def save_call_logs(self, logs: Sequence[AICallLogDTO]) -> None:
        """Batch-persists typed call logs into the ai_call_logs table."""
        if not logs:
            return

        session = self.session_factory()
        try:
            for item in logs:
                if not item.job_id:
                    continue
                db_record = AICallLog(
                    job_id=item.job_id,
                    filename=item.filename,
                    provider=item.provider,
                    key_alias=item.key_alias,
                    model_name=item.model_name,
                    status_code=item.status_code,
                    prompt_tokens=item.prompt_tokens,
                    completion_tokens=item.completion_tokens,
                    latency_ms=item.latency_ms,
                    error_message=item.error_message,
                )
                session.add(db_record)
            session.commit()
        except Exception:
            session.rollback()
            logger.exception("Failed to persist AICallLogDTO batch")
        finally:
            session.close()

    def update_job_telemetry(
        self,
        review_job_id: int,
        final_review: FinalReviewResult | dict,
        telemetry: JobTelemetryRollupDTO,
    ) -> None:
        """Updates ReviewJob status to SUCCEEDED and sets all telemetry rollup columns."""
        review_dict = (
            final_review.model_dump(mode="json")
            if isinstance(final_review, FinalReviewResult)
            else final_review
        )

        session = self.session_factory()
        try:
            session.execute(
                update(ReviewJob)
                .where(ReviewJob.id == review_job_id)
                .values(
                    status=ReviewJobStatusEnum.SUCCEEDED,
                    processed_files=ReviewJob.total_files,
                    finished_at=func.now(),
                    error_code=None,
                    final_review_json=review_dict,
                    primary_provider=telemetry.primary_provider,
                    model_name=telemetry.model_name,
                    fallback_used=telemetry.fallback_used,
                    fallback_reason=telemetry.fallback_reason,
                    total_prompt_tokens=telemetry.total_prompt_tokens,
                    total_completion_tokens=telemetry.total_completion_tokens,
                    total_tokens=telemetry.total_tokens,
                    total_latency_ms=telemetry.total_latency_ms,
                    credits_deducted=telemetry.credits_deducted,
                )
            )
            session.commit()
        except Exception:
            session.rollback()
            logger.exception("Failed to update ReviewJob telemetry for job %s", review_job_id)
            raise
        finally:
            session.close()

    def record_quota_usage_for_job(
        self, review_job_id: int, credits_to_deduct: Decimal = Decimal("0.0000")
    ) -> None:
        """Finds user for the review job and deducts credits / increments review count."""
        session = self.session_factory()
        try:
            job = session.execute(
                select(ReviewJob).where(ReviewJob.id == review_job_id)
            ).scalar_one_or_none()
            if not job:
                return

            pr = session.execute(
                select(PullRequest).where(PullRequest.id == job.pr_id)
            ).scalar_one_or_none()
            if not pr or not pr.user_id:
                return

            quota = session.execute(
                select(UserAIQuota).where(UserAIQuota.user_id == pr.user_id)
            ).scalar_one_or_none()

            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)

            if not quota:
                quota = UserAIQuota(
                    user_id=pr.user_id,
                    tier=job.user_tier or "free",
                    monthly_pr_quota=15,
                    prs_reviewed_this_month=1,
                    credit_balance=Decimal("0.00"),
                    period_start=now,
                    period_end=now + timedelta(days=30),
                )
                session.add(quota)
            else:
                quota.prs_reviewed_this_month += 1
                if quota.credit_balance >= credits_to_deduct:
                    quota.credit_balance -= credits_to_deduct

            session.commit()
        except Exception:
            session.rollback()
            logger.warning("Failed to record quota usage for job %s", review_job_id, exc_info=True)
        finally:
            session.close()
