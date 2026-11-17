from decimal import Decimal

from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.repository.ai_telemetry_repo import (
    AITelemetryRepository,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.schema import (
    AICallLogDTO,
    FileReviewMetadata,
    FileReviewResult,
    JobTelemetryRollupDTO,
    ReviewFindingDTO,
    UserQuotaDTO,
)


def test_file_review_metadata_dual_access() -> None:
    meta = FileReviewMetadata(
        provider="groq",
        key_alias="primary",
        model="openai/gpt-oss-120b",
        prompt_tokens=150,
        latency_ms=800,
    )

    # Attribute access
    assert meta.provider == "groq"
    assert meta.prompt_tokens == 150
    assert meta.latency_ms == 800

    # Dict-like access
    assert meta.get("provider") == "groq"
    assert meta.get("non_existent", "fallback") == "fallback"
    assert meta["model"] == "openai/gpt-oss-120b"


def test_ai_call_log_dto_validation() -> None:
    log = AICallLogDTO(
        job_id=42,
        filename="auth.py",
        provider="groq",
        key_alias="primary",
        model_name="openai/gpt-oss-120b",
        status_code=200,
        prompt_tokens=500,
        completion_tokens=100,
        total_tokens=600,
        latency_ms=1200,
    )

    assert log.job_id == 42
    assert log.total_tokens == 600
    dumped = log.model_dump(mode="json")
    assert dumped["status_code"] == 200
    assert dumped["latency_ms"] == 1200


def test_job_telemetry_rollup_dto() -> None:
    rollup = JobTelemetryRollupDTO(
        primary_provider="openai",
        model_name="gpt-4o",
        fallback_used=True,
        fallback_reason="HTTP 429",
        total_prompt_tokens=1000,
        total_completion_tokens=300,
        total_tokens=1300,
        total_latency_ms=2500,
        credits_deducted=Decimal("0.1000"),
    )

    assert rollup.primary_provider == "openai"
    assert rollup.fallback_used is True
    assert rollup.credits_deducted == Decimal("0.1000")


def test_user_quota_dto() -> None:
    quota = UserQuotaDTO(
        user_id=1,
        tier="free",
        monthly_pr_reviews_limit=50,
        monthly_pr_reviews_count=5,
        credits_balance=Decimal("9.5000"),
        credits_used=Decimal("0.5000"),
    )

    assert quota.user_id == 1
    assert quota.credits_balance == Decimal("9.5000")


def test_file_review_result_with_typed_metadata() -> None:
    result = FileReviewResult(
        filename="api.py",
        findings=[
            ReviewFindingDTO(
                severity="medium",
                category="performance",
                title="Slow query",
                summary="Unindexed query detected",
                line_start=15,
            )
        ],
        summary="Found 1 performance issue",
        metadata={
            "provider": "groq",
            "model": "openai/gpt-oss-120b",
            "prompt_tokens": 200,
        },
    )

    assert isinstance(result.metadata, FileReviewMetadata)
    assert result.metadata.provider == "groq"
    assert result.metadata.prompt_tokens == 200
