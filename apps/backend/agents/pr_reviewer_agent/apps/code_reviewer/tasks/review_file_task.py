import logging
from typing import Any

import httpx

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.core.celery import (
    celery_app,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.pr_schema import (
    PullRequestFile,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.review_schema import (
    FileReviewResult,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.service.ai_review_service import (
    AIReviewService,
    AIReviewTemporaryError,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.service.github_review_service import (
    parse_diff_lines,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.task_helpers import (
    _error_code,
    _is_retryable,
    _repository,
    _run_async,
)

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="review_file",
    autoretry_for=(AIReviewTemporaryError, httpx.TimeoutException, httpx.NetworkError),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def review_file(self, review_job_id: int, file_data: dict[str, Any]) -> dict[str, Any]:
    repository = _repository()
    file = PullRequestFile.model_validate(file_data)

    try:
        if file.patch is None:
            result = FileReviewResult(
                filename=file.filename,
                summary="Skipped because GitHub did not provide a text patch.",
                skipped=True,
                metadata={"status": file.status, "reason": "missing_patch_or_binary"},
            )
        else:
            result = _run_async(
                AIReviewService().review_file(
                    filename=file.filename,
                    status=file.status,
                    patch=file.patch,
                )
            )

        # Preserve patch and valid diff lines for reliable line mapping
        result.metadata["patch"] = file.patch
        if file.patch:
            valid_lines = parse_diff_lines(file.patch)
            result.metadata["valid_diff_lines"] = sorted(list(valid_lines))
        else:
            result.metadata["valid_diff_lines"] = []

        # Ensure all findings retain file mapping
        for finding in result.findings:
            if not finding.file:
                finding.file = file.filename

        result_dict = result.model_dump(mode="json")
        repository.save_file_review_result(
            review_job_id=review_job_id,
            filename=result.filename,
            status="skipped" if result.skipped else "reviewed",
            findings=result_dict["findings"],
            summary=result.summary,
            metadata=result.metadata,
        )
        repository.increment_processed_files(review_job_id)
        return result_dict
    except Exception as exc:
        if _is_retryable(exc) and self.request.retries < 3:
            raise self.retry(exc=exc, countdown=30)
        repository.mark_review_job_failed(review_job_id, _error_code(exc))
        raise
