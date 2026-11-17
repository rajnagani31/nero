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
    FileReviewMetadata,
    FileReviewResult,
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
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.service.ai_review_service import (
    AIReviewService,
)

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="review_file",
    autoretry_for=(httpx.TimeoutException, httpx.NetworkError),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def review_file(self, review_job_id: int, file_data: PullRequestFile | dict[str, Any]) -> dict[str, Any]:
    repository = _repository()
    file = file_data if isinstance(file_data, PullRequestFile) else PullRequestFile.model_validate(file_data)

    try:
        # Mark file as processing by worker
        repository.mark_file_review_processing(review_job_id, file.filename)

        # Retrieve job context to load configured user_tier
        job_context = repository.get_review_job_context(review_job_id) or {}
        user_tier = job_context.get("user_tier", "free")

        if file.patch is None:
            result = FileReviewResult(
                filename=file.filename,
                summary="Skipped because GitHub did not provide a text patch.",
                skipped=True,
                metadata=FileReviewMetadata(status=file.status, reason="missing_patch_or_binary"),
            )
        else:
            result = _run_async(
                AIReviewService().review_file(
                    filename=file.filename,
                    status=file.status,
                    patch=file.patch,
                    job_id=review_job_id,
                    user_tier=user_tier,
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
        meta = result.metadata

        # Formalize status: skipped, failed, or reviewed
        if result.skipped:
            file_status = "skipped"
        elif meta.status == "failed":
            file_status = "failed"
        else:
            file_status = "reviewed"

        provider_used = None if file_status == "failed" else (meta.provider_used or meta.provider)
        model_used = None if file_status == "failed" else (meta.model_used or meta.model)

        repository.save_file_review_result(
            review_job_id=review_job_id,
            filename=result.filename,
            status=file_status,
            findings=result_dict["findings"],
            summary=result.summary,
            metadata=meta.model_dump(mode="json"),
            provider_used=provider_used,
            model_used=model_used,
            prompt_tokens=meta.prompt_tokens,
            completion_tokens=meta.completion_tokens,
            latency_ms=meta.latency_ms,
        )
        repository.increment_processed_files(review_job_id)
        return result_dict
    except Exception as exc:
        if _is_retryable(exc) and self.request.retries < 3:
            raise self.retry(exc=exc, countdown=30)
        repository.mark_review_job_failed(review_job_id, _error_code(exc))
        raise
