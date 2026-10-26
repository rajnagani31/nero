import asyncio
import logging
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.review_schema import (
    FileReviewResult,
    FinalReviewResult,
    ReviewFindingDTO,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.service.github_review_service import (
    GitHubReviewService,
    GitHubReviewSubmissionError,
    format_inline_comment_body,
    generate_review_summary,
    parse_diff_lines,
    prepare_review_payload,
    submit_pr_review,
)


def test_parse_diff_lines_single_hunk() -> None:
    patch = (
        "@@ -10,3 +10,4 @@\n"
        " def login():\n"
        "-    pass\n"
        "+    # TODO: validate password\n"
        "+    return True\n"
        "     print('done')\n"
    )
    lines = parse_diff_lines(patch)
    # Hunk starts at +10:
    # line 10: ' def login():' (context)
    # line -: '-    pass' (deleted, doesn't advance new lines)
    # line 11: '+    # TODO: validate password'
    # line 12: '+    return True'
    # line 13: '     print(\'done\')'
    assert lines == {10, 11, 12, 13}


def test_parse_diff_lines_multiple_hunks() -> None:
    patch = (
        "@@ -1,2 +1,3 @@ def foo():\n"
        " x = 1\n"
        "+y = 2\n"
        "@@ -50,2 +51,3 @@ class Bar:\n"
        " a = 1\n"
        "+b = 2\n"
    )
    lines = parse_diff_lines(patch)
    assert 1 in lines
    assert 2 in lines
    assert 51 in lines
    assert 52 in lines
    assert 99 not in lines


def test_parse_diff_lines_empty_or_none() -> None:
    assert parse_diff_lines(None) == set()
    assert parse_diff_lines("") == set()


def test_format_inline_comment_body() -> None:
    finding = ReviewFindingDTO(
        file="src/payment.py",
        line=42,
        side="RIGHT",
        severity="critical",
        title="Missing authorization",
        message="Payment ownership is not validated.",
        suggestion="Validate the user's organization.",
    )
    body = format_inline_comment_body(finding)
    assert "🔴 **Critical issue**: Missing authorization" in body
    assert "Payment ownership is not validated." in body
    assert "> **Suggestion:** Validate the user's organization." in body


def test_generate_review_summary_contains_counts_files_and_result() -> None:
    findings = [
        ReviewFindingDTO(
            file="src/auth.py",
            line=10,
            severity="critical",
            title="Hardcoded Secret",
            message="Secret is hardcoded",
        ),
        ReviewFindingDTO(
            file="src/calc.py",
            line=5,
            severity="high",
            title="Zero Division",
            message="Possible division by zero",
        ),
        ReviewFindingDTO(
            file="src/utils.py",
            line=12,
            severity="medium",
            title="Inefficient Loop",
            message="O(n^2) complexity",
        ),
        ReviewFindingDTO(
            file="src/utils.py",
            line=20,
            severity="low",
            title="Naming convention",
            message="Use snake_case",
        ),
    ]

    summary = generate_review_summary(
        findings=findings,
        files_reviewed=3,
    )

    # Verify heading & overall result
    assert "## 🤖 NeroAI Code Review" in summary
    assert "❌ **Changes requested**" in summary

    # Verify finding counts
    assert "🔴 Critical: 1" in summary
    assert "🟠 High: 1" in summary
    assert "🟡 Medium: 1" in summary
    assert "🔵 Low: 1" in summary

    # Verify files reviewed
    assert "### Files reviewed" in summary
    assert "\n3\n" in summary

    # Verify result instruction
    assert "Please review the inline comments below." in summary


def test_generate_review_summary_all_clear() -> None:
    summary = generate_review_summary(
        findings=[],
        files_reviewed=5,
    )
    assert "✅ **All clear**" in summary
    assert "🔴 Critical: 0" in summary
    assert "\n5\n" in summary


def test_generate_review_summary_all_files_skipped_shows_incomplete_review() -> None:
    skipped = [
        {"filename": "app/binary.so", "reason": "Skipped because GitHub did not provide a text patch."},
        {"filename": "docs/image.png", "reason": "Skipped because GitHub did not provide a text patch."},
    ]
    summary = generate_review_summary(
        findings=[],
        files_reviewed=0,
        files_skipped=2,
        skipped_files=skipped,
    )
    assert "✅ **All clear**" not in summary
    assert "⚠️ **Incomplete review**" in summary
    assert "Review incomplete: all files were skipped" in summary
    assert "### Files reviewed\n\n0" in summary
    assert "### Files skipped\n\n2" in summary
    assert "- `app/binary.so`: Skipped because GitHub did not provide a text patch." in summary
    assert "- `docs/image.png`: Skipped because GitHub did not provide a text patch." in summary


def test_generate_review_summary_partial_skipped_shows_incomplete_review() -> None:
    skipped = [
        FileReviewResult(
            filename="docs/logo.png",
            summary="Skipped because GitHub did not provide a text patch.",
            skipped=True,
        )
    ]
    summary = generate_review_summary(
        findings=[],
        files_reviewed=3,
        files_skipped=1,
        skipped_files=skipped,
    )
    assert "✅ **All clear**" not in summary
    assert "⚠️ **Incomplete review**" in summary
    assert "Review incomplete: some files were skipped" in summary
    assert "### Files reviewed\n\n3" in summary
    assert "### Files skipped\n\n1" in summary
    assert "- `docs/logo.png`: Skipped because GitHub did not provide a text patch." in summary


def test_prepare_review_payload_auto_detects_skipped_files() -> None:
    file_reviews = [
        FileReviewResult(
            filename="src/app.py",
            findings=[],
            summary="Clean",
            skipped=False,
            metadata={"patch": "@@ -1,2 +1,2 @@\n+line1\n"},
        ),
        FileReviewResult(
            filename="assets/icon.png",
            findings=[],
            summary="Skipped because GitHub did not provide a text patch.",
            skipped=True,
        ),
    ]
    payload = prepare_review_payload(
        commit_sha="commit_sha_123",
        findings=file_reviews,
    )
    body = payload["body"]
    assert "✅ **All clear**" not in body
    assert "⚠️ **Incomplete review**" in body
    assert "### Files reviewed\n\n1" in body
    assert "### Files skipped\n\n1" in body
    assert "- `assets/icon.png`: Skipped because GitHub did not provide a text patch." in body


def test_prepare_review_payload_with_inline_and_no_line_findings() -> None:
    patch = "@@ -40,5 +40,5 @@\n context\n+line_41\n+line_42\n"
    file_patches = {"src/payment/service.py": patch}

    findings = [
        # 1. Valid line in diff -> inline comment
        ReviewFindingDTO(
            file="src/payment/service.py",
            line=42,
            side="RIGHT",
            severity="critical",
            title="Missing authorization",
            message="Payment ownership is not validated.",
            suggestion="Validate user org",
        ),
        # 2. Line outside diff -> unmapped -> PR summary
        ReviewFindingDTO(
            file="src/payment/service.py",
            line=999,
            severity="high",
            title="Deprecated call",
            message="Function is deprecated.",
        ),
        # 3. File-level finding with no line -> unmapped -> PR summary
        ReviewFindingDTO(
            file="README.md",
            line=None,
            severity="info",
            title="Missing documentation",
            message="Documentation is missing for the new payment flow.",
        ),
        # 4. General PR-level finding -> unmapped -> PR summary
        ReviewFindingDTO(
            file=None,
            line=None,
            severity="info",
            title="Test Coverage",
            message="Test coverage should be added for the new service.",
        ),
    ]

    payload = prepare_review_payload(
        commit_sha="head_commit_sha_123",
        findings=findings,
        file_patches=file_patches,
        files_reviewed_count=2,
    )

    assert payload["commit_id"] == "head_commit_sha_123"
    assert payload["event"] == "COMMENT"

    # Only line 42 should become an inline comment
    comments = payload["comments"]
    assert len(comments) == 1
    assert comments[0]["path"] == "src/payment/service.py"
    assert comments[0]["line"] == 42
    assert comments[0]["side"] == "RIGHT"
    assert "🔴 **Critical issue**: Missing authorization" in comments[0]["body"]

    # All unmapped findings must appear in the summary
    body = payload["body"]
    assert "### Additional findings" in body
    assert "- `src/payment/service.py`: Function is deprecated." in body
    assert "- `README.md`: Documentation is missing for the new payment flow." in body
    assert "- General: Test coverage should be added for the new service." in body


def test_submit_pr_review_successful() -> None:
    mock_token_service = MagicMock()
    mock_token_service.create_installation_access_token = AsyncMock(
        return_value="ghs_mock_installation_token"
    )

    service = GitHubReviewService(token_service=mock_token_service)

    fake_response = MagicMock(spec=httpx.Response)
    fake_response.status_code = 200
    fake_response.json.return_value = {
        "id": 88888,
        "commit_id": "sha_abc",
        "state": "COMMENTED",
        "body": "## 🤖 NeroAI Code Review",
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = fake_response

        result = asyncio.run(
            service.submit_pr_review(
                installation_id=12345,
                owner="my-org",
                repo="my-repo",
                pull_number=10,
                commit_sha="sha_abc",
                findings=[
                    ReviewFindingDTO(
                        file="main.py",
                        line=5,
                        severity="high",
                        title="Bug",
                        message="Fix this",
                    )
                ],
                file_patches={"main.py": "@@ -1,5 +1,5 @@\n line1\n line2\n line3\n line4\n+line5\n"},
            )
        )

        assert result["id"] == 88888
        assert mock_post.called
        call_url = mock_post.call_args[0][0]
        call_headers = mock_post.call_args[1]["headers"]
        call_json = mock_post.call_args[1]["json"]

        assert call_url == "https://api.github.com/repos/my-org/my-repo/pulls/10/reviews"
        assert call_headers["Authorization"] == "Bearer ghs_mock_installation_token"
        assert call_json["commit_id"] == "sha_abc"
        assert call_json["event"] == "COMMENT"
        assert len(call_json["comments"]) == 1
        assert call_json["comments"][0]["path"] == "main.py"
        assert call_json["comments"][0]["line"] == 5


@pytest.mark.parametrize("status_code", [401, 403, 404, 422, 500])
def test_submit_pr_review_http_error_simulation(
    status_code: int, caplog: pytest.LogCaptureFixture
) -> None:
    mock_token_service = MagicMock()
    mock_token_service.create_installation_access_token = AsyncMock(
        return_value="ghs_mock_token"
    )

    service = GitHubReviewService(token_service=mock_token_service)

    fake_request = httpx.Request(
        "POST", "https://api.github.com/repos/o/r/pulls/1/reviews"
    )
    fake_response = httpx.Response(
        status_code=status_code,
        request=fake_request,
        text=f'{{"message": "GitHub error {status_code}"}}',
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = fake_response

        with caplog.at_level(logging.ERROR):
            with pytest.raises(GitHubReviewSubmissionError) as exc_info:
                asyncio.run(
                    service.submit_pr_review(
                        installation_id=999,
                        owner="test-owner",
                        repo="test-repo",
                        pull_number=1,
                        commit_sha="commit_sha_xyz",
                        findings=[],
                    )
                )

        assert exc_info.value.status_code == status_code
        # Verify access token is NEVER logged
        for record in caplog.records:
            assert "ghs_mock_token" not in record.message
            assert "Bearer" not in record.message


def test_submit_pr_review_network_timeout(
    caplog: pytest.LogCaptureFixture,
) -> None:
    mock_token_service = MagicMock()
    mock_token_service.create_installation_access_token = AsyncMock(
        return_value="ghs_mock_token"
    )

    service = GitHubReviewService(token_service=mock_token_service)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.TimeoutException("Connection timed out")

        with caplog.at_level(logging.ERROR):
            with pytest.raises(GitHubReviewSubmissionError) as exc_info:
                asyncio.run(
                    service.submit_pr_review(
                        installation_id=999,
                        owner="test-owner",
                        repo="test-repo",
                        pull_number=1,
                        commit_sha="commit_sha_xyz",
                        findings=[],
                    )
                )

        assert exc_info.value.status_code is None
        assert "timed out" in exc_info.value.message.lower()
        # Verify secrets are not logged
        for record in caplog.records:
            assert "ghs_mock_token" not in record.message
