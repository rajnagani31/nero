import asyncio
from collections import Counter
import logging
import re
from typing import Any, Sequence

import httpx

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.review_schema import (
    FileReviewResult,
    FinalReviewResult,
    ReviewFindingDTO,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.service.github_pull_request_service import (
    GitHubInstallationTokenService,
)

logger = logging.getLogger(__name__)

HUNK_HEADER_RE = re.compile(r"^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@")

SEVERITY_EMOJI = {
    "critical": "🔴",
    "high": "🟠",
    "medium": "🟡",
    "low": "🔵",
    "info": "ℹ️",
}


class GitHubReviewSubmissionError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        response_body: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response_body = response_body


def parse_diff_lines(patch: str | None) -> set[int]:
    """Extract valid line numbers on the RIGHT (new) side of a unified diff patch.

    Lines starting with '+' or ' ' (context) in each hunk are eligible for inline
    review comments. Deleted lines ('-') do not advance the new line counter.
    """
    if not patch:
        return set()

    valid_lines: set[int] = set()
    current_line: int | None = None

    for line in patch.splitlines():
        match = HUNK_HEADER_RE.match(line)
        if match:
            current_line = int(match.group(1))
            continue

        if current_line is None:
            continue

        if line.startswith("+") or line.startswith(" "):
            valid_lines.add(current_line)
            current_line += 1
        elif line.startswith("-"):
            pass
        elif line.startswith("\\"):
            pass

    return valid_lines


def format_inline_comment_body(finding: Any) -> str:
    """Format an inline review comment according to NeroAI conventions."""
    severity = getattr(finding, "severity", None)
    if severity is None and isinstance(finding, dict):
        severity = finding.get("severity")
    severity_str = str(severity or "info").lower()
    emoji = SEVERITY_EMOJI.get(severity_str, "🔵")
    severity_display = severity_str.capitalize()

    title = getattr(finding, "title", None)
    if title is None and isinstance(finding, dict):
        title = finding.get("title")

    message = (
        getattr(finding, "message", None)
        or getattr(finding, "summary", None)
        or (finding.get("message") or finding.get("summary") if isinstance(finding, dict) else None)
        or title
        or ""
    )

    suggestion = (
        getattr(finding, "suggestion", None)
        or getattr(finding, "recommendation", None)
        or (finding.get("suggestion") or finding.get("recommendation") if isinstance(finding, dict) else None)
    )

    header = f"{emoji} **{severity_display} issue**"
    if title and title.strip() and title.strip() != message.strip():
        body = f"{header}: {title.strip()}\n\n{message.strip()}"
    else:
        body = f"{header}\n\n{message.strip()}"

    if suggestion and str(suggestion).strip():
        body += f"\n\n> **Suggestion:** {str(suggestion).strip()}"

    return body


def _extract_skipped_file_info(sf: Any) -> tuple[str | None, str]:
    if isinstance(sf, FileReviewResult):
        filename = sf.filename
        reason = (
            sf.summary
            or (sf.metadata.get("reason") if isinstance(sf.metadata, dict) else None)
            or "Skipped because GitHub did not provide a text patch."
        )
        return filename, reason
    if isinstance(sf, dict):
        filename = sf.get("filename") or sf.get("file")
        metadata = sf.get("metadata")
        meta_reason = metadata.get("reason") if isinstance(metadata, dict) else None
        reason = (
            sf.get("reason")
            or sf.get("summary")
            or meta_reason
            or "Skipped because GitHub did not provide a text patch."
        )
        return filename, reason
    if isinstance(sf, (list, tuple)) and len(sf) >= 2:
        return str(sf[0]), str(sf[1])
    if isinstance(sf, (list, tuple)) and len(sf) == 1:
        return str(sf[0]), "Skipped because GitHub did not provide a text patch."
    if isinstance(sf, str):
        return sf, "Skipped because GitHub did not provide a text patch."
    return None, str(sf)


def generate_review_summary(
    *,
    findings: Sequence[Any],
    unmapped_findings: Sequence[Any] | None = None,
    files_reviewed: int = 0,
    files_skipped: int = 0,
    skipped_files: Sequence[Any] | None = None,
    overall_status: str | None = None,
) -> str:
    """Generate a clean, deterministic Markdown summary for the GitHub PR review."""
    severity_counts: Counter[str] = Counter()
    for finding in findings:
        sev = getattr(finding, "severity", None)
        if sev is None and isinstance(finding, dict):
            sev = finding.get("severity")
        severity_counts[str(sev or "info").lower()] += 1

    critical_count = severity_counts.get("critical", 0)
    high_count = severity_counts.get("high", 0)
    medium_count = severity_counts.get("medium", 0)
    low_count = severity_counts.get("low", 0)
    info_count = severity_counts.get("info", 0)

    # Determine files skipped count if skipped_files provided
    if files_skipped == 0 and skipped_files:
        files_skipped = len(skipped_files)

    # Determine PR-level review outcome
    if overall_status:
        summary_title = overall_status
        summary_desc = ""
    elif critical_count > 0 or high_count > 0:
        summary_title = "❌ **Changes requested**"
        summary_desc = "NeroAI found issues that should be addressed before merging."
    elif medium_count > 0 or low_count > 0:
        summary_title = "⚠️ **Warnings found**"
        summary_desc = "NeroAI found suggestions or potential issues to review."
    elif files_skipped > 0:
        summary_title = "⚠️ **Incomplete review**"
        if files_reviewed == 0:
            summary_desc = (
                "Review incomplete: all files were skipped because GitHub supplied no text patch. "
                "Please review changes manually."
            )
        else:
            summary_desc = (
                "Review incomplete: some files were skipped because GitHub supplied no text patch. "
                "Please review unread changes manually."
            )
    else:
        summary_title = "✅ **All clear**"
        summary_desc = "NeroAI found no issues. Everything looks good!"

    lines = [
        "## 🤖 NeroAI Code Review",
        "",
        "### Summary",
        "",
        summary_title,
    ]
    if summary_desc:
        lines.extend(["", summary_desc])

    lines.extend([
        "",
        "### Findings",
        "",
        f"🔴 Critical: {critical_count}  ",
        f"🟠 High: {high_count}  ",
        f"🟡 Medium: {medium_count}  ",
        f"🔵 Low: {low_count}  ",
    ])
    if info_count > 0:
        lines.append(f"ℹ️ Info: {info_count}  ")

    lines.extend([
        "",
        "### Files reviewed",
        "",
        str(files_reviewed),
    ])

    if files_skipped > 0 or skipped_files:
        lines.extend([
            "",
            "### Files skipped",
            "",
            str(files_skipped),
        ])
        if skipped_files:
            lines.append("")
            for sf in skipped_files:
                sf_file, sf_reason = _extract_skipped_file_info(sf)
                if sf_file:
                    lines.append(f"- `{sf_file}`: {sf_reason}")
                else:
                    lines.append(f"- {sf_reason}")

    lines.extend([
        "",
        "### Result",
        "",
        "Please review the inline comments below.",
    ])

    if unmapped_findings:
        lines.extend([
            "",
            "### Additional findings",
            "",
        ])
        for uf in unmapped_findings:
            uf_file = (
                getattr(uf, "file", None)
                or (uf.get("file") if isinstance(uf, dict) else None)
                or (uf.get("path") if isinstance(uf, dict) else None)
            )
            uf_title = (
                getattr(uf, "title", None)
                or (uf.get("title") if isinstance(uf, dict) else None)
            )
            uf_msg = (
                getattr(uf, "message", None)
                or getattr(uf, "summary", None)
                or (uf.get("message") or uf.get("summary") if isinstance(uf, dict) else None)
                or uf_title
                or "General finding"
            )

            if uf_file and uf_file.lower() != "general":
                lines.append(f"- `{uf_file}`: {uf_msg}")
            else:
                lines.append(f"- General: {uf_msg}")

    return "\n".join(lines)


def _normalize_findings_list(
    raw_findings: Any,
) -> tuple[list[ReviewFindingDTO], int, list[dict[str, Any]]]:
    """Normalize various representations of findings into a flat list of ReviewFindingDTOs.

    Returns (findings_list, files_reviewed_count, detected_skipped_files).
    """
    if raw_findings is None:
        return [], 0, []

    if isinstance(raw_findings, FinalReviewResult):
        all_findings: list[ReviewFindingDTO] = []
        skipped_list: list[dict[str, Any]] = []
        for file_res in raw_findings.files:
            if file_res.skipped:
                reason = (
                    file_res.summary
                    or (file_res.metadata.get("reason") if isinstance(file_res.metadata, dict) else None)
                    or "Skipped because GitHub did not provide a text patch."
                )
                skipped_list.append({"filename": file_res.filename, "reason": reason})
            for f in file_res.findings:
                if not f.file:
                    f.file = file_res.filename
                all_findings.append(f)
        return all_findings, raw_findings.reviewed_files, skipped_list

    if isinstance(raw_findings, list):
        # Check if list contains FileReviewResult or dicts with files/findings
        all_findings = []
        files_set: set[str] = set()
        skipped_list = []
        for item in raw_findings:
            if isinstance(item, FileReviewResult):
                if item.skipped:
                    reason = (
                        item.summary
                        or (item.metadata.get("reason") if isinstance(item.metadata, dict) else None)
                        or "Skipped because GitHub did not provide a text patch."
                    )
                    skipped_list.append({"filename": item.filename, "reason": reason})
                else:
                    files_set.add(item.filename)
                    for f in item.findings:
                        if not f.file:
                            f.file = item.filename
                        all_findings.append(f)
            elif isinstance(item, dict) and "findings" in item and isinstance(item["findings"], list):
                filename = item.get("filename")
                if item.get("skipped"):
                    meta = item.get("metadata")
                    meta_reason = meta.get("reason") if isinstance(meta, dict) else None
                    reason = (
                        item.get("summary")
                        or item.get("reason")
                        or meta_reason
                        or "Skipped because GitHub did not provide a text patch."
                    )
                    skipped_list.append({"filename": filename or "unknown", "reason": reason})
                else:
                    if filename:
                        files_set.add(filename)
                    for f_data in item["findings"]:
                        dto = (
                            ReviewFindingDTO.model_validate(f_data)
                            if isinstance(f_data, dict)
                            else f_data
                        )
                        if not dto.file and filename:
                            dto.file = filename
                        all_findings.append(dto)
            elif isinstance(item, ReviewFindingDTO):
                if item.file:
                    files_set.add(item.file)
                all_findings.append(item)
            elif isinstance(item, dict):
                dto = ReviewFindingDTO.model_validate(item)
                if dto.file:
                    files_set.add(dto.file)
                all_findings.append(dto)
        return all_findings, len(files_set), skipped_list

    return [], 0, []


def prepare_review_payload(
    *,
    commit_sha: str,
    findings: Any = None,
    summary: str | None = None,
    event: str = "COMMENT",
    files_reviewed_count: int | None = None,
    files_skipped_count: int | None = None,
    skipped_files: Sequence[Any] | None = None,
    file_patches: dict[str, str | None] | None = None,
    valid_diff_lines_map: dict[str, set[int]] | None = None,
) -> dict[str, Any]:
    """Prepare the complete GitHub Pull Request Review API payload.

    Separates findings into inline comments (mapped to changed lines in the diff)
    and unmapped/file-level findings (appended to the PR summary).
    """
    normalized_findings, detected_files_count, detected_skipped = _normalize_findings_list(findings)
    files_count = (
        files_reviewed_count
        if files_reviewed_count is not None
        else detected_files_count
    )
    final_skipped_files = (
        list(skipped_files)
        if skipped_files is not None
        else detected_skipped
    )
    skipped_count = (
        files_skipped_count
        if files_skipped_count is not None
        else len(final_skipped_files)
    )

    diff_lines_map: dict[str, set[int]] = {}
    if valid_diff_lines_map:
        diff_lines_map.update(valid_diff_lines_map)
    if file_patches:
        for fname, patch in file_patches.items():
            if fname not in diff_lines_map:
                diff_lines_map[fname] = parse_diff_lines(patch)

    inline_comments: list[dict[str, Any]] = []
    unmapped_findings: list[ReviewFindingDTO] = []

    for finding in normalized_findings:
        file_path = finding.file
        line_num = finding.line if finding.line is not None else finding.line_start

        if not file_path or line_num is None or line_num <= 0:
            unmapped_findings.append(finding)
            continue

        # Check diff line mapping if diff information is available for this file
        if file_path in diff_lines_map:
            valid_lines = diff_lines_map[file_path]
            if line_num not in valid_lines:
                unmapped_findings.append(finding)
                continue

        # Valid inline comment candidate
        body = format_inline_comment_body(finding)
        inline_comments.append({
            "path": file_path,
            "line": int(line_num),
            "side": finding.side or "RIGHT",
            "body": body,
        })

    # Generate or format PR summary
    if summary and ("## 🤖 NeroAI Code Review" in summary or summary.strip().startswith("##")):
        review_body = summary
        if unmapped_findings and "### Additional findings" not in review_body:
            add_lines = ["", "### Additional findings", ""]
            for uf in unmapped_findings:
                uf_file = uf.file
                uf_msg = uf.message or uf.summary or uf.title
                if uf_file and uf_file.lower() != "general":
                    add_lines.append(f"- `{uf_file}`: {uf_msg}")
                else:
                    add_lines.append(f"- General: {uf_msg}")
            review_body += "\n" + "\n".join(add_lines)
    else:
        review_body = generate_review_summary(
            findings=normalized_findings,
            unmapped_findings=unmapped_findings,
            files_reviewed=files_count,
            files_skipped=skipped_count,
            skipped_files=final_skipped_files,
            overall_status=summary,
        )

    return {
        "commit_id": commit_sha,
        "body": review_body,
        "event": event,
        "comments": inline_comments,
    }


class GitHubReviewService:
    def __init__(
        self,
        token_service: GitHubInstallationTokenService | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        self.token_service = token_service or GitHubInstallationTokenService()
        self.timeout_seconds = timeout_seconds

    async def submit_pr_review(
        self,
        *,
        installation_id: int,
        owner: str,
        repo: str,
        pull_number: int,
        commit_sha: str,
        summary: str | None = None,
        findings: Any = None,
        event: str = "COMMENT",
        files_reviewed_count: int | None = None,
        files_skipped_count: int | None = None,
        skipped_files: Sequence[Any] | None = None,
        file_patches: dict[str, str | None] | None = None,
        valid_diff_lines_map: dict[str, set[int]] | None = None,
    ) -> dict[str, Any]:
        """Submit a completed PR review with inline comments to GitHub via the Reviews API."""
        repo_slug = f"{owner}/{repo}"

        logger.info(
            "Starting GitHub review submission",
            extra={
                "repository": repo_slug,
                "pull_number": pull_number,
                "commit_sha": commit_sha,
                "installation_id": installation_id,
            },
        )

        payload = prepare_review_payload(
            commit_sha=commit_sha,
            findings=findings,
            summary=summary,
            event=event,
            files_reviewed_count=files_reviewed_count,
            files_skipped_count=files_skipped_count,
            skipped_files=skipped_files,
            file_patches=file_patches,
            valid_diff_lines_map=valid_diff_lines_map,
        )

        inline_count = len(payload.get("comments", []))
        logger.info(
            "PR review payload prepared",
            extra={
                "repository": repo_slug,
                "pull_number": pull_number,
                "commit_sha": commit_sha,
                "installation_id": installation_id,
                "number_of_inline_findings": inline_count,
            },
        )

        token = await self.token_service.create_installation_access_token(
            installation_id
        )

        url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}/reviews"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        logger.info(
            "Submitting review to GitHub",
            extra={
                "repository": repo_slug,
                "pull_number": pull_number,
                "commit_sha": commit_sha,
                "installation_id": installation_id,
            },
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                review_data = response.json()
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            error_msg = f"GitHub API returned {status_code}: {exc.response.text}"
            logger.error(
                "GitHub review submission failed",
                extra={
                    "repository": repo_slug,
                    "pull_number": pull_number,
                    "commit_sha": commit_sha,
                    "installation_id": installation_id,
                    "review_submission_status": "failed",
                    "github_response_status": status_code,
                    "error_message": error_msg[:500],
                },
            )
            raise GitHubReviewSubmissionError(
                error_msg,
                status_code=status_code,
                response_body=exc.response.text,
            ) from exc
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            error_msg = f"Network timeout or connectivity error with GitHub API: {exc}"
            logger.error(
                "GitHub review submission failed",
                extra={
                    "repository": repo_slug,
                    "pull_number": pull_number,
                    "commit_sha": commit_sha,
                    "installation_id": installation_id,
                    "review_submission_status": "failed",
                    "github_response_status": None,
                    "error_message": error_msg[:500],
                },
            )
            raise GitHubReviewSubmissionError(
                error_msg,
                status_code=None,
            ) from exc
        except Exception as exc:
            error_msg = f"Unexpected error during GitHub review submission: {exc}"
            logger.error(
                "GitHub review submission failed",
                extra={
                    "repository": repo_slug,
                    "pull_number": pull_number,
                    "commit_sha": commit_sha,
                    "installation_id": installation_id,
                    "review_submission_status": "failed",
                    "github_response_status": None,
                    "error_message": error_msg[:500],
                },
            )
            raise GitHubReviewSubmissionError(
                error_msg,
                status_code=None,
            ) from exc

        github_review_id = review_data.get("id")
        logger.info(
            "GitHub review created",
            extra={
                "repository": repo_slug,
                "pull_number": pull_number,
                "commit_sha": commit_sha,
                "installation_id": installation_id,
                "github_review_id": github_review_id,
                "review_submission_status": "success",
                "github_response_status": response.status_code,
            },
        )
        return review_data


async def submit_pr_review(
    *,
    installation_id: int,
    owner: str,
    repo: str,
    pull_number: int,
    commit_sha: str,
    summary: str | None = None,
    findings: Any = None,
    event: str = "COMMENT",
    files_reviewed_count: int | None = None,
    files_skipped_count: int | None = None,
    skipped_files: Sequence[Any] | None = None,
    file_patches: dict[str, str | None] | None = None,
    valid_diff_lines_map: dict[str, set[int]] | None = None,
    token_service: GitHubInstallationTokenService | None = None,
) -> dict[str, Any]:
    """Convenience function to submit a GitHub PR review."""
    service = GitHubReviewService(token_service=token_service)
    return await service.submit_pr_review(
        installation_id=installation_id,
        owner=owner,
        repo=repo,
        pull_number=pull_number,
        commit_sha=commit_sha,
        summary=summary,
        findings=findings,
        event=event,
        files_reviewed_count=files_reviewed_count,
        files_skipped_count=files_skipped_count,
        skipped_files=skipped_files,
        file_patches=file_patches,
        valid_diff_lines_map=valid_diff_lines_map,
    )


def submit_pr_review_sync(
    *,
    installation_id: int,
    owner: str,
    repo: str,
    pull_number: int,
    commit_sha: str,
    summary: str | None = None,
    findings: Any = None,
    event: str = "COMMENT",
    files_reviewed_count: int | None = None,
    files_skipped_count: int | None = None,
    skipped_files: Sequence[Any] | None = None,
    file_patches: dict[str, str | None] | None = None,
    valid_diff_lines_map: dict[str, set[int]] | None = None,
    token_service: GitHubInstallationTokenService | None = None,
) -> dict[str, Any]:
    """Synchronous wrapper for submitting a GitHub PR review."""
    return asyncio.run(
        submit_pr_review(
            installation_id=installation_id,
            owner=owner,
            repo=repo,
            pull_number=pull_number,
            commit_sha=commit_sha,
            summary=summary,
            findings=findings,
            event=event,
            files_reviewed_count=files_reviewed_count,
            files_skipped_count=files_skipped_count,
            skipped_files=skipped_files,
            file_patches=file_patches,
            valid_diff_lines_map=valid_diff_lines_map,
            token_service=token_service,
        )
    )
