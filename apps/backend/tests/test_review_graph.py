import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.graph.nodes import (
    preprocess_diff_node,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.graph.review_graph import (
    review_graph,
    route_after_preprocess,
    should_continue_or_failover,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.graph.state import (
    FileReviewState,
    StructuredReviewOutput,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.review_schema import ReviewFindingDTO
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.service.ai_review_service import (
    AIReviewService,
)


def test_preprocess_skips_lockfiles() -> None:
    state: FileReviewState = {
        "filename": "package-lock.json",
        "status": "modified",
        "patch": '{"version": "1.0.0"}',
    }
    updates = preprocess_diff_node(state)
    assert updates.get("result") is not None
    assert updates["result"].skipped is True
    assert "binary or generated" in updates["result"].summary


def test_preprocess_skips_empty_diff() -> None:
    state: FileReviewState = {
        "filename": "main.py",
        "status": "modified",
        "patch": "",
    }
    updates = preprocess_diff_node(state)
    assert updates.get("result") is not None
    assert updates["result"].skipped is True


def test_graph_dummy_execution() -> None:
    service = AIReviewService(force_dummy=True)
    result = asyncio.run(
        service.review_file(
            filename="auth.py",
            status="modified",
            patch="diff --git a/auth.py b/auth.py\n+def authenticate(): pass",
            user_tier="free",
        )
    )

    assert result.filename == "auth.py"
    assert result.metadata["provider"] == "dummy"
    assert len(result.findings) == 1
    assert result.findings[0].title == "Mock Review Verification"


def test_failover_routing_logic() -> None:
    # Under limit (attempt 0): route to failover
    state: FileReviewState = {
        "error": "HTTP 429 Too Many Requests",
        "attempt_count": 0,
    }
    assert should_continue_or_failover(state) == "failover"

    # Limit reached (attempt 2): route to audit_log
    state["attempt_count"] = 2
    assert should_continue_or_failover(state) == "audit_log"

    # Success: route to audit_log
    state = {
        "result": object(),  # type: ignore[typeddict-item]
    }
    assert should_continue_or_failover(state) == "audit_log"


def test_groq_primary_failover_to_fallback() -> None:
    """Mock primary client failure with 429 and verify secondary succeeds."""
    mock_success_output = StructuredReviewOutput(
        findings=[
            ReviewFindingDTO(
                severity="high",
                category="bug",
                title="Potential Null Pointer",
                summary="User object might be None",
                recommendation="Add if not user: check",
                line_start=12,
            )
        ],
        summary="Found 1 high severity bug",
    )

    mock_failing_client = MagicMock()
    mock_failing_structured = AsyncMock()
    mock_failing_structured.ainvoke.side_effect = RuntimeError("HTTP 429 Rate Limit Exceeded")
    mock_failing_client.with_structured_output.return_value = mock_failing_structured

    mock_success_client = MagicMock()
    mock_success_structured = AsyncMock()
    mock_success_structured.ainvoke.return_value = mock_success_output
    mock_success_client.with_structured_output.return_value = mock_success_structured

    def mock_get_client(alias="primary", **kwargs):
        if alias in ("primary", "groq_primary"):
            return mock_failing_client
        return mock_success_client

    with patch(
        "apps.backend.agents.pr_reviewer_agent.apps.llm_provider.graph.nodes.GroqAdapter.get_client",
        side_effect=mock_get_client,
    ):
        service = AIReviewService(force_dummy=False)
        result = asyncio.run(
            service.review_file(
                filename="service.py",
                status="modified",
                patch="diff --git a/service.py b/service.py\n+user.save()",
                user_tier="free",
            )
        )

        assert result.filename == "service.py"
        assert result.metadata.get("fallback_used") is True
        assert len(result.findings) == 1
        assert result.findings[0].title == "Potential Null Pointer"
