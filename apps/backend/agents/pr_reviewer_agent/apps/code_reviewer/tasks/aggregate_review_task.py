import logging
from collections import Counter
from decimal import Decimal
from typing import Any

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.core.celery import (
    celery_app,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_job import (
    ReviewJobStatusEnum,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.review_schema import (
    FileReviewResult,
    FinalReviewResult,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.service.github_review_service import (
    parse_diff_lines,
    submit_pr_review,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks.task_helpers import (
    _error_code,
    _repository,
    _run_async,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.schema.telemetry_schemas import (
    JobTelemetryRollupDTO,
)

logger = logging.getLogger(__name__)


def _deliver_github_pr_review(
    *,
    repository: Any,
    review_job_id: int,
    parsed_reviews: list[FileReviewResult],
    final_review: FinalReviewResult,
) -> None:
    context = repository.get_review_job_context(review_job_id)
    if not context:
        logger.warning(
            "Review job context not found; skipping GitHub review delivery",
            extra={"review_job_id": review_job_id},
        )
        repository.mark_review_job_delivery_failed(
            review_job_id, "Review job context not found"
        )
        return

    installation_id = context.get("installation_id")
    owner = context.get("owner")
    repo = context.get("repo")
    pull_number = context.get("pull_number")
    commit_sha = context.get("head_sha")
    pr_id = context.get("pull_request_id")

    if not (installation_id and owner and repo and pull_number and commit_sha and pr_id):
        error_msg = "Incomplete PR context for GitHub review delivery"
        logger.warning(
            error_msg,
            extra={
                "review_job_id": review_job_id,
                "installation_id": installation_id,
                "owner": owner,
                "repo": repo,
                "pull_number": pull_number,
                "commit_sha": commit_sha,
            },
        )
        repository.mark_review_job_delivery_failed(review_job_id, error_msg)
        return

    # Check for duplicate review for this PR commit
    posted_review = repository.get_posted_review_for_commit(pr_id, commit_sha)
    if posted_review is not None:
        if posted_review.id == review_job_id:
            logger.info(
                "Review for commit was already delivered by this job. Leaving delivered job unchanged.",
                extra={
                    "review_job_id": review_job_id,
                    "pr_id": pr_id,
                    "commit_sha": commit_sha,
                    "existing_review_id": posted_review.github_review_id,
                },
            )
            return

        logger.info(
            "Review for commit has already been delivered to GitHub. Skipping duplicate review submission.",
            extra={
                "review_job_id": review_job_id,
                "pr_id": pr_id,
                "commit_sha": commit_sha,
                "existing_review_id": posted_review.github_review_id,
            },
        )
        repository.mark_review_job_skipped_duplicate(
            review_job_id,
            commit_sha=commit_sha,
            existing_github_review_id=posted_review.github_review_id,
        )
        return

    # Extract file patches and diff lines from parsed_reviews metadata
    file_patches: dict[str, str | None] = {}
    valid_diff_lines_map: dict[str, set[int]] = {}
    for fr in parsed_reviews:
        patch = fr.metadata.get("patch")
        file_patches[fr.filename] = patch
        if "valid_diff_lines" in fr.metadata and fr.metadata["valid_diff_lines"] is not None:
            valid_diff_lines_map[fr.filename] = set(fr.metadata["valid_diff_lines"])
        elif patch:
            valid_diff_lines_map[fr.filename] = parse_diff_lines(patch)

    try:
        review_result = _run_async(
            submit_pr_review(
                installation_id=installation_id,
                owner=owner,
                repo=repo,
                pull_number=pull_number,
                commit_sha=commit_sha,
                findings=parsed_reviews,
                files_reviewed_count=final_review.reviewed_files,
                files_skipped_count=final_review.skipped_files,
                skipped_files=[fr for fr in parsed_reviews if fr.skipped],
                file_patches=file_patches,
                valid_diff_lines_map=valid_diff_lines_map,
            )
        )
        github_review_id = review_result.get("id")
        repository.mark_review_job_delivered(
            review_job_id=review_job_id,
            github_review_id=github_review_id,
            commit_sha=commit_sha,
        )
        logger.info(
            "GitHub review delivery succeeded",
            extra={
                "review_job_id": review_job_id,
                "github_review_id": github_review_id,
                "commit_sha": commit_sha,
                "repository": f"{owner}/{repo}",
                "pull_number": pull_number,
            },
        )
    except Exception as exc:
        error_msg = str(exc)
        repository.mark_review_job_delivery_failed(
            review_job_id=review_job_id,
            error_message=error_msg,
        )
        logger.exception(
            "GitHub review delivery failed",
            extra={
                "review_job_id": review_job_id,
                "error": error_msg,
                "commit_sha": commit_sha,
                "repository": f"{owner}/{repo}",
                "pull_number": pull_number,
            },
        )


@celery_app.task(bind=True, name="aggregate_review")
def aggregate_review(
    self, file_reviews: list[dict[str, Any] | FileReviewResult], review_job_id: int
) -> dict[str, Any]:
    repository = _repository()
    try:
        parsed_reviews = [
            fr if isinstance(fr, FileReviewResult) else FileReviewResult.model_validate(fr)
            for fr in file_reviews
        ]
        severity_counts: Counter[str] = Counter()
        for file_review in parsed_reviews:
            severity_counts.update(finding.severity for finding in file_review.findings)

        total_findings = sum(len(file_review.findings) for file_review in parsed_reviews)
        skipped_files = sum(1 for file_review in parsed_reviews if file_review.skipped)
        failed_files = sum(1 for file_review in parsed_reviews if getattr(file_review.metadata, "status", None) == "failed")
        reviewed_files = max(0, len(parsed_reviews) - skipped_files - failed_files)

        # Roll up runtime telemetry across all reviewed files
        total_prompt_tokens = sum(fr.metadata.prompt_tokens for fr in parsed_reviews)
        total_completion_tokens = sum(fr.metadata.completion_tokens for fr in parsed_reviews)
        total_tokens = total_prompt_tokens + total_completion_tokens
        total_latency_ms = sum(fr.metadata.latency_ms for fr in parsed_reviews)

        fallback_used = any(fr.metadata.fallback_used for fr in parsed_reviews)
        raw_fallback_reason = next(
            (fr.metadata.fallback_reason for fr in parsed_reviews if fr.metadata.fallback_reason),
            None,
        )
        fallback_reason = raw_fallback_reason[:255] if raw_fallback_reason else None

        primary_provider = next(
            (
                fr.metadata.provider_used or fr.metadata.provider
                for fr in parsed_reviews
                if (fr.metadata.provider_used or fr.metadata.provider)
            ),
            None,
        )
        model_name = next(
            (
                fr.metadata.model_used or fr.metadata.model
                for fr in parsed_reviews
                if (fr.metadata.model_used or fr.metadata.model)
            ),
            None,
        )

        # Determine overall job status
        if failed_files > 0 and reviewed_files > 0:
            target_status = ReviewJobStatusEnum.PARTIALLY_SUCCEEDED
        elif failed_files > 0 and reviewed_files == 0:
            target_status = ReviewJobStatusEnum.FAILED
        else:
            target_status = ReviewJobStatusEnum.SUCCEEDED

        # Record quota and deduct credits atomically, obtaining verified actual deduction
        actual_deducted = repository.record_quota_usage_for_job(
            review_job_id=review_job_id,
            credits_to_deduct=Decimal("0.1000"),
        ) or Decimal("0.0000")

        final_review = FinalReviewResult(
            review_job_id=review_job_id,
            total_files=len(parsed_reviews),
            reviewed_files=reviewed_files,
            skipped_files=skipped_files,
            total_findings=total_findings,
            findings_by_severity=dict(severity_counts),
            summary=(
                f"Reviewed {reviewed_files} files, skipped {skipped_files}, "
                f"failed {failed_files}, found {total_findings} findings."
            ),
            files=parsed_reviews,
        )

        telemetry = JobTelemetryRollupDTO(
            primary_provider=primary_provider,
            model_name=model_name,
            fallback_used=fallback_used,
            fallback_reason=fallback_reason,
            total_prompt_tokens=total_prompt_tokens,
            total_completion_tokens=total_completion_tokens,
            total_tokens=total_tokens,
            total_latency_ms=total_latency_ms,
            credits_deducted=actual_deducted,
        )

        final_review_dict = final_review.model_dump(mode="json")

        repository.mark_review_job_succeeded(
            review_job_id,
            final_review_dict,
            status=target_status,
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

        logger.info(
            "ReviewJob completed with status %s",
            target_status.value,
            extra={
                "review_job_id": review_job_id,
                "status": target_status.value,
                "total_files": len(parsed_reviews),
                "reviewed_files": reviewed_files,
                "failed_files": failed_files,
                "total_findings": total_findings,
                "total_tokens": total_tokens,
                "total_latency_ms": total_latency_ms,
                "fallback_used": fallback_used,
                "credits_deducted": str(actual_deducted),
            },
        )
    except Exception as exc:
        repository.mark_review_job_failed(review_job_id, _error_code(exc))
        logger.exception(
            "ReviewJob failed during aggregation",
            extra={"review_job_id": review_job_id, "error_code": _error_code(exc)},
        )
        raise

    # Deliver completed review to GitHub PR only if at least some files succeeded
    if target_status in (ReviewJobStatusEnum.SUCCEEDED, ReviewJobStatusEnum.PARTIALLY_SUCCEEDED):
        try:
            _deliver_github_pr_review(
                repository=repository,
                review_job_id=review_job_id,
                parsed_reviews=parsed_reviews,
                final_review=final_review,
            )
        except Exception as exc:
            repository.mark_review_job_delivery_failed(review_job_id, str(exc))
            logger.exception(
                "Unexpected error in _deliver_github_pr_review wrapper",
                extra={"review_job_id": review_job_id, "error": str(exc)},
            )
            raise

    return final_review_dict
