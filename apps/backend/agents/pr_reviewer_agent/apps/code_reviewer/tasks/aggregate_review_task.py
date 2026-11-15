import logging
from collections import Counter
from typing import Any

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.core.celery import (
    celery_app,
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
    self, file_reviews: list[dict[str, Any]], review_job_id: int
) -> dict[str, Any]:
    repository = _repository()
    try:
        parsed_reviews = [
            FileReviewResult.model_validate(file_review)
            for file_review in file_reviews
        ]
        severity_counts: Counter[str] = Counter()
        for file_review in parsed_reviews:
            severity_counts.update(finding.severity for finding in file_review.findings)

        total_findings = sum(len(file_review.findings) for file_review in parsed_reviews)
        skipped_files = sum(1 for file_review in parsed_reviews if file_review.skipped)
        final_review = FinalReviewResult(
            review_job_id=review_job_id,
            total_files=len(parsed_reviews),
            reviewed_files=len(parsed_reviews) - skipped_files,
            skipped_files=skipped_files,
            total_findings=total_findings,
            findings_by_severity=dict(severity_counts),
            summary=(
                f"Reviewed {len(parsed_reviews) - skipped_files} files, skipped "
                f"{skipped_files}, found {total_findings} findings."
            ),
            files=parsed_reviews,
        )
        final_review_dict = final_review.model_dump(mode="json")
        repository.mark_review_job_succeeded(review_job_id, final_review_dict)
        logger.info(
            "ReviewJob succeeded",
            extra={
                "review_job_id": review_job_id,
                "total_files": len(parsed_reviews),
                "total_findings": total_findings,
            },
        )
    except Exception as exc:
        repository.mark_review_job_failed(review_job_id, _error_code(exc))
        logger.exception(
            "ReviewJob failed during aggregation",
            extra={"review_job_id": review_job_id, "error_code": _error_code(exc)},
        )
        raise

    # Deliver completed review to GitHub PR
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

    return final_review_dict
