from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker

from sqlalchemy import BigInteger

# Setup SQLite compatibility for JSONB and BigInteger in tests
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(BigInteger, "sqlite")
def compile_bigint_sqlite(type_, compiler, **kw):
    return "INTEGER"

import apps.backend.bot.application.model.chat_history  # noqa: F401
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.pull_request import (
    PullRequest,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.repository import (
    Repository,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_job import (
    ReviewJob,
    ReviewJobStatusEnum,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.repository.git_repository import (
    CodeReviewRepository,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task import (
    aggregate_review,
)
from apps.backend.bot.application.core.database import Base


@pytest.fixture
def test_db_session_factory():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    yield session_factory
    Base.metadata.drop_all(engine)


def _seed_test_pr_and_job(
    session_factory,
    *,
    head_sha: str = "commit_sha_111",
    installation_id: int = 12345,
    repo_name: str = "nero-org/nero-repo",
    pr_number: int = 42,
) -> tuple[int, int, int]:
    session = session_factory()
    try:
        repo = Repository(
            repo_id=999,
            installation_id=installation_id,
            full_name=repo_name,
            owner=repo_name.split("/")[0],
            default_branch="main",
            is_active=True,
        )
        session.add(repo)
        session.flush()

        pr = PullRequest(
            repo_id=repo.id,
            pr_number=pr_number,
            commit_sha=head_sha,
            author="nero_dev",
            title="Add Payment Gateway",
            source_branch="feature/payment",
            target_branch="main",
            url=f"https://github.com/{repo_name}/pull/{pr_number}",
        )
        session.add(pr)
        session.flush()

        job = ReviewJob(
            pr_id=pr.id,
            status=ReviewJobStatusEnum.RUNNING,
            head_sha=head_sha,
            base_sha="base_sha_000",
            total_files=1,
            processed_files=1,
            queued_at=datetime.now(UTC),
            started_at=datetime.now(UTC),
        )
        session.add(job)
        session.commit()
        return repo.id, pr.id, job.id
    finally:
        session.close()


def test_successful_review_delivery(test_db_session_factory) -> None:
    repository = CodeReviewRepository(test_db_session_factory)
    _, pr_id, job_id = _seed_test_pr_and_job(
        test_db_session_factory, head_sha="commit_sha_111"
    )

    file_reviews = [
        {
            "filename": "src/payment.py",
            "findings": [
                {
                    "file": "src/payment.py",
                    "line": 15,
                    "side": "RIGHT",
                    "severity": "critical",
                    "title": "Auth Bypass",
                    "message": "Payment ownership not checked.",
                    "suggestion": "Add org check.",
                }
            ],
            "summary": "Reviewed payment.py",
            "skipped": False,
            "metadata": {
                "patch": "@@ -10,10 +10,10 @@\n+line15\n",
                "valid_diff_lines": [10, 11, 12, 13, 14, 15],
            },
        }
    ]

    mock_review_response = {
        "id": 99999,
        "commit_id": "commit_sha_111",
        "state": "COMMENTED",
        "body": "## 🤖 NeroAI Code Review",
    }

    with patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task._repository",
        return_value=repository,
    ), patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task.submit_pr_review",
        new_callable=AsyncMock,
    ) as mock_submit:
        mock_submit.return_value = mock_review_response

        # Execute aggregate_review task
        result = aggregate_review(file_reviews, job_id)

        assert result["total_findings"] == 1
        assert mock_submit.called
        submit_args = mock_submit.call_args[1]
        assert submit_args["commit_sha"] == "commit_sha_111"
        assert submit_args["installation_id"] == 12345
        assert submit_args["owner"] == "nero-org"
        assert submit_args["repo"] == "nero-repo"
        assert submit_args["pull_number"] == 42

    # Verify DB persistence
    updated_job = repository.get_review_job_by_id(job_id)
    assert updated_job is not None
    assert updated_job.status == ReviewJobStatusEnum.SUCCEEDED
    assert updated_job.review_status == "REVIEW_POSTED"
    assert updated_job.github_review_id == 99999
    assert updated_job.reviewed_commit_sha == "commit_sha_111"
    assert updated_job.delivery_error is None


def test_review_delivery_passes_skipped_files_and_count(test_db_session_factory) -> None:
    repository = CodeReviewRepository(test_db_session_factory)
    _, pr_id, job_id = _seed_test_pr_and_job(
        test_db_session_factory, head_sha="commit_sha_skipped"
    )

    file_reviews = [
        {
            "filename": "src/reviewed.py",
            "findings": [],
            "summary": "Clean",
            "skipped": False,
            "metadata": {"patch": "@@ -1,2 +1,2 @@\n+ok\n"},
        },
        {
            "filename": "docs/logo.png",
            "findings": [],
            "summary": "Skipped because GitHub did not provide a text patch.",
            "skipped": True,
            "metadata": {"reason": "missing_patch_or_binary"},
        },
    ]

    mock_review_response = {"id": 77777, "commit_id": "commit_sha_skipped"}

    with patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task._repository",
        return_value=repository,
    ), patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task.submit_pr_review",
        new_callable=AsyncMock,
    ) as mock_submit:
        mock_submit.return_value = mock_review_response

        aggregate_review(file_reviews, job_id)

        assert mock_submit.called
        submit_args = mock_submit.call_args[1]
        assert submit_args["files_reviewed_count"] == 1
        assert submit_args["files_skipped_count"] == 1
        assert len(submit_args["skipped_files"]) == 1
        assert submit_args["skipped_files"][0].filename == "docs/logo.png"
        assert submit_args["skipped_files"][0].summary == "Skipped because GitHub did not provide a text patch."


def test_duplicate_review_prevention(test_db_session_factory) -> None:
    repository = CodeReviewRepository(test_db_session_factory)
    _, pr_id, job_id_1 = _seed_test_pr_and_job(
        test_db_session_factory, head_sha="commit_sha_duplicate"
    )

    file_reviews = [
        {
            "filename": "src/app.py",
            "findings": [
                {
                    "file": "src/app.py",
                    "line": 5,
                    "severity": "medium",
                    "title": "Style",
                    "message": "Use type hints",
                }
            ],
            "summary": "Reviewed app.py",
            "skipped": False,
            "metadata": {"patch": "@@ -1,10 +1,10 @@\n+line5\n"},
        }
    ]

    mock_review_response = {"id": 123456, "commit_id": "commit_sha_duplicate"}

    with patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task._repository",
        return_value=repository,
    ), patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task.submit_pr_review",
        new_callable=AsyncMock,
    ) as mock_submit:
        mock_submit.return_value = mock_review_response

        # 1. First execution -> succeeds and posts review
        aggregate_review(file_reviews, job_id_1)
        assert mock_submit.call_count == 1

        first_job = repository.get_review_job_by_id(job_id_1)
        assert first_job.review_status == "REVIEW_POSTED"
        assert first_job.github_review_id == 123456

        # 2. Celery retry or duplicate task run for the SAME commit
        # Create a second job record for the same PR and commit
        session = test_db_session_factory()
        job_2 = ReviewJob(
            pr_id=pr_id,
            status=ReviewJobStatusEnum.RUNNING,
            head_sha="commit_sha_duplicate",
            total_files=1,
            processed_files=1,
            queued_at=datetime.now(UTC),
        )
        session.add(job_2)
        session.commit()
        job_id_2 = job_2.id
        session.close()

        # Run aggregate_review again for the second job
        aggregate_review(file_reviews, job_id_2)

        # CRITICAL: Verify submit_pr_review was NOT called a second time!
        assert mock_submit.call_count == 1

        # Verify second job is marked as SKIPPED_DUPLICATE and retains the existing review id
        second_job = repository.get_review_job_by_id(job_id_2)
        assert second_job.review_status == "SKIPPED_DUPLICATE"
        assert second_job.github_review_id == 123456
        assert second_job.reviewed_commit_sha == "commit_sha_duplicate"


def test_replay_delivered_job_leaves_review_status_unchanged(test_db_session_factory) -> None:
    """Verifies that replaying an already-delivered job leaves its REVIEW_POSTED status intact,

    and subsequent replays or new jobs for the commit do not resubmit to GitHub.
    """
    repository = CodeReviewRepository(test_db_session_factory)
    _, pr_id, job_id_1 = _seed_test_pr_and_job(
        test_db_session_factory, head_sha="commit_sha_replay"
    )

    file_reviews = [
        {
            "filename": "src/app.py",
            "findings": [],
            "summary": "Reviewed app.py",
            "skipped": False,
            "metadata": {"patch": ""},
        }
    ]

    mock_review_response = {"id": 88888, "commit_id": "commit_sha_replay"}

    with patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task._repository",
        return_value=repository,
    ), patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task.submit_pr_review",
        new_callable=AsyncMock,
    ) as mock_submit:
        mock_submit.return_value = mock_review_response

        # 1. Initial run delivers review
        aggregate_review(file_reviews, job_id_1)
        assert mock_submit.call_count == 1

        job_1 = repository.get_review_job_by_id(job_id_1)
        assert job_1.review_status == "REVIEW_POSTED"
        assert job_1.github_review_id == 88888

        # 2. Replay the same delivered job
        aggregate_review(file_reviews, job_id_1)
        assert mock_submit.call_count == 1

        # Delivered job must remain REVIEW_POSTED (not overwritten with SKIPPED_DUPLICATE)
        job_1_after_replay = repository.get_review_job_by_id(job_id_1)
        assert job_1_after_replay.review_status == "REVIEW_POSTED"
        assert job_1_after_replay.github_review_id == 88888

        # 3. Another replay or new job for same commit still respects the delivered review
        session = test_db_session_factory()
        job_2 = ReviewJob(
            pr_id=pr_id,
            status=ReviewJobStatusEnum.RUNNING,
            head_sha="commit_sha_replay",
            total_files=1,
            processed_files=1,
            queued_at=datetime.now(UTC),
        )
        session.add(job_2)
        session.commit()
        job_id_2 = job_2.id
        session.close()

        aggregate_review(file_reviews, job_id_2)
        assert mock_submit.call_count == 1

        job_2_record = repository.get_review_job_by_id(job_id_2)
        assert job_2_record.review_status == "SKIPPED_DUPLICATE"
        assert job_2_record.github_review_id == 88888

        # Verify job 1 is STILL REVIEW_POSTED
        job_1_final = repository.get_review_job_by_id(job_id_1)
        assert job_1_final.review_status == "REVIEW_POSTED"


def test_commit_specific_behavior(test_db_session_factory) -> None:
    """Verifies that when a new commit SHA is pushed to the PR, a new review is posted."""
    repository = CodeReviewRepository(test_db_session_factory)
    _, pr_id, job_id_A = _seed_test_pr_and_job(
        test_db_session_factory, head_sha="commit_A"
    )

    file_reviews_A = [
        {
            "filename": "src/a.py",
            "findings": [],
            "summary": "Clean",
            "skipped": False,
            "metadata": {"patch": ""},
        }
    ]

    with patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task._repository",
        return_value=repository,
    ), patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task.submit_pr_review",
        new_callable=AsyncMock,
    ) as mock_submit:
        mock_submit.return_value = {"id": 111, "commit_id": "commit_A"}
        aggregate_review(file_reviews_A, job_id_A)
        assert mock_submit.call_count == 1

    # Now PR gets a new commit B (synchronize event)
    session = test_db_session_factory()
    job_B = ReviewJob(
        pr_id=pr_id,
        status=ReviewJobStatusEnum.RUNNING,
        head_sha="commit_B",
        base_sha="commit_A",
        total_files=1,
        processed_files=1,
        queued_at=datetime.now(UTC),
    )
    session.add(job_B)
    session.commit()
    job_id_B = job_B.id
    session.close()

    file_reviews_B = [
        {
            "filename": "src/b.py",
            "findings": [
                {
                    "file": "src/b.py",
                    "line": 2,
                    "severity": "low",
                    "title": "Formatting",
                    "message": "Trailing space",
                }
            ],
            "summary": "Reviewed b.py",
            "skipped": False,
            "metadata": {"patch": "@@ -1,5 +1,5 @@\n+line2\n"},
        }
    ]

    with patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task._repository",
        return_value=repository,
    ), patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task.submit_pr_review",
        new_callable=AsyncMock,
    ) as mock_submit:
        mock_submit.return_value = {"id": 222, "commit_id": "commit_B"}
        aggregate_review(file_reviews_B, job_id_B)

        # Must have submitted a new review for Commit B!
        assert mock_submit.call_count == 1
        assert mock_submit.call_args[1]["commit_sha"] == "commit_B"

    job_B_record = repository.get_review_job_by_id(job_id_B)
    assert job_B_record.review_status == "REVIEW_POSTED"
    assert job_B_record.github_review_id == 222
    assert job_B_record.reviewed_commit_sha == "commit_B"


def test_github_api_failure_keeps_review_succeeded(test_db_session_factory) -> None:
    """If GitHub submission fails (403, 500, timeout, etc.),

    the LLM review job must NOT be marked as failed.
    The database should record review_status="DELIVERY_FAILED".
    """
    repository = CodeReviewRepository(test_db_session_factory)
    _, pr_id, job_id = _seed_test_pr_and_job(
        test_db_session_factory, head_sha="commit_sha_fail"
    )

    file_reviews = [
        {
            "filename": "src/main.py",
            "findings": [],
            "summary": "Reviewed main.py",
            "skipped": False,
            "metadata": {"patch": ""},
        }
    ]

    with patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task._repository",
        return_value=repository,
    ), patch(
        "apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task.submit_pr_review",
        new_callable=AsyncMock,
    ) as mock_submit:
        mock_submit.side_effect = RuntimeError("403 Forbidden: Insufficient repository permissions")

        # The task must return cleanly without raising
        result = aggregate_review(file_reviews, job_id)
        assert result["total_findings"] == 0

    # Job status must be SUCCEEDED, delivery status must be DELIVERY_FAILED
    updated_job = repository.get_review_job_by_id(job_id)
    assert updated_job.status == ReviewJobStatusEnum.SUCCEEDED
    assert updated_job.review_status == "DELIVERY_FAILED"
    assert "403 Forbidden" in updated_job.delivery_error
    assert updated_job.github_review_id is None
