from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.pull_request import (
    PullRequest,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.repository import (
    Repository,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_file_result import (
    ReviewFileResult,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_job import (
    ReviewJob,
    ReviewJobStatusEnum,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.repository.git_repository import (
    CodeReviewRepository,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.review_schema import (
    FileReviewMetadata,
    FileReviewResult,
    FinalReviewResult,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.graph.nodes import (
    audit_log_node,
    preprocess_diff_node,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.model.user_ai_quota import (
    UserAIQuota,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.schema.telemetry_schemas import (
    AICallLogDTO,
)
from apps.backend.bot.application.core.database import Base


@pytest.fixture
def sqlite_repo():
    """Create in-memory SQLite database and test repository."""
    engine = create_engine("sqlite:///:memory:")
    # Only create tables needed for quota and review job tests (avoids JSONB in unrelated vector tables)
    Base.metadata.create_all(
        engine,
        tables=[PullRequest.__table__, ReviewJob.__table__, UserAIQuota.__table__],
    )
    session_factory = sessionmaker(bind=engine)
    repo = CodeReviewRepository(session_factory=session_factory)
    return repo, session_factory


def test_partially_succeeded_status_enum():
    assert ReviewJobStatusEnum.PARTIALLY_SUCCEEDED.value == "partially_succeeded"
    assert ReviewJobStatusEnum.SUCCEEDED.value == "succeeded"
    assert ReviewJobStatusEnum.FAILED.value == "failed"


def test_minified_file_skipping():
    state = {
        "filename": "dist/bundle.min.js",
        "status": "modified",
        "patch": "var x=1;",
    }
    output = preprocess_diff_node(state)
    assert output.get("result") is not None
    assert output["result"].skipped is True
    assert output["result"].metadata.reason == "minified_asset"


def test_cumulative_latency_in_audit_log():
    call_logs = [
        AICallLogDTO(filename="app.py", latency_ms=4500, status_code=429, attempt_number=1),
        AICallLogDTO(filename="app.py", latency_ms=350, status_code=200, attempt_number=2),
    ]
    state = {
        "filename": "app.py",
        "call_logs": call_logs,
        "result": FileReviewResult(
            filename="app.py",
            findings=[],
            summary="Clean",
            metadata=FileReviewMetadata(),
        ),
    }
    output = audit_log_node(state)
    assert output.result.metadata.latency_ms == 4850


def test_quota_period_reset_and_deduction(sqlite_repo):
    repo, session_factory = sqlite_repo
    session = session_factory()

    # Create user, PR, and ReviewJob
    pr = PullRequest(
        id=1,
        repo_id=1,
        user_id=42,
        pr_number=10,
        commit_sha="abc1234",
        source_branch="feat",
        target_branch="main",
        author="tester",
        url="https://github.com/org/repo/pull/10",
        state="open",
        title="Test PR",
    )
    session.add(pr)
    session.flush()

    job = ReviewJob(
        id=101,
        pr_id=pr.id,
        status=ReviewJobStatusEnum.QUEUED,
        user_tier="pro",
        total_files=2,
    )
    session.add(job)
    session.flush()

    # Create expired quota record (period_end in the past)
    past_time = datetime.now(timezone.utc) - timedelta(days=5)
    quota = UserAIQuota(
        id=1,
        user_id=42,
        tier="pro",
        monthly_pr_quota=50,
        prs_reviewed_this_month=15,
        credit_balance=Decimal("5.00"),
        period_start=past_time - timedelta(days=30),
        period_end=past_time,
    )
    session.add(quota)
    session.commit()

    # Execute quota deduction
    deducted = repo.record_quota_usage_for_job(job.id, credits_to_deduct=Decimal("0.1000"))
    assert deducted == Decimal("0.1000")

    # Verify period reset
    session = session_factory()
    updated_quota = session.execute(
        select(UserAIQuota).where(UserAIQuota.user_id == 42)
    ).scalar_one()

    # Review count should be reset to 0, then incremented to 1
    assert updated_quota.prs_reviewed_this_month == 1
    assert updated_quota.credit_balance == Decimal("4.90")
    period_end = updated_quota.period_end
    if period_end.tzinfo is None:
        period_end = period_end.replace(tzinfo=timezone.utc)
    assert period_end > datetime.now(timezone.utc)
