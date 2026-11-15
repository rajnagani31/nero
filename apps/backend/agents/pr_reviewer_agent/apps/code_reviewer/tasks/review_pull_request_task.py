import logging
from typing import Any

import httpx
from celery import chord

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.core.celery import (
    celery_app,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.service.github_pull_request_service import (
    GitHubPullRequestService,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.aggregate_review_task import (
    aggregate_review,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.review_file_task import (
    review_file,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.task_helpers import (
    NonRetryableReviewError,
    _error_code,
    _is_retryable,
    _repository,
    _run_async,
)

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="review_pull_request",
    autoretry_for=(httpx.TimeoutException, httpx.NetworkError),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def review_pull_request(self, review_job_id: int) -> dict[str, Any]:
    repository = _repository()
    logger.info("[ReviewJob started]", extra={"review_job_id": review_job_id})
    repository.mark_review_job_running(review_job_id)

    try:
        context = repository.get_review_job_context(review_job_id)
        if context is None:
            raise NonRetryableReviewError("review job context not found")
        if context.get("installation_id") is None:
            raise NonRetryableReviewError("repository has no installation_id")

        owner = context["owner"]
        repo = context["repo"]
        pull_number = context["pull_number"]
        installation_id = context["installation_id"]
        base_sha = context.get("base_sha")
        head_sha = context.get("head_sha")

        github_service = GitHubPullRequestService()
        if base_sha and head_sha:
            files = _run_async(
                github_service.get_changed_files_between_commits(
                    owner=owner,
                    repo=repo,
                    before_sha=base_sha,
                    after_sha=head_sha,
                    installation_id=installation_id,
                )
            )
        else:
            files = _run_async(
                github_service.get_pull_request_files(
                    owner=owner,
                    repo=repo,
                    pull_number=pull_number,
                    installation_id=installation_id,
                )
            )
        file_payloads = [file.model_dump(mode="json") for file in files]
        repository.set_review_job_total_files(review_job_id, len(file_payloads))
        logger.info(
            "Fetched files",
            extra={"review_job_id": review_job_id, "total_files": len(file_payloads)},
        )

        if not file_payloads:
            aggregate_review.delay([], review_job_id)
            return {"review_job_id": review_job_id, "total_files": 0}

        logger.info(
            "Dispatching review tasks",
            extra={"review_job_id": review_job_id, "total_files": len(file_payloads)},
        )
        # Fan-Out/Scatter: Create a subtask for every changed file
        header = [review_file.s(review_job_id, file_data) for file_data in file_payloads]
        
        # Fan-In/Gether: aggregate_review is the callback waiting for all header subtasks
        async_result = chord(header)(aggregate_review.s(review_job_id))
        return {
            "review_job_id": review_job_id,
            "total_files": len(file_payloads),
            "chord_id": async_result.id,
        }
    except Exception as exc:
        if _is_retryable(exc) and self.request.retries < 3:
            raise self.retry(exc=exc, countdown=30)
        repository.mark_review_job_failed(review_job_id, _error_code(exc))
        logger.exception(
            "ReviewJob failed",
            extra={"review_job_id": review_job_id, "error_code": _error_code(exc)},
        )
        raise
