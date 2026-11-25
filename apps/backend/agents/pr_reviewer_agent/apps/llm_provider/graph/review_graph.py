import logging
from langgraph.graph import END, START, StateGraph

from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.graph.nodes import (
    audit_log_node,
    failover_node,
    format_prompt_node,
    invoke_model_node,
    preprocess_diff_node,
    route_tier_node,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.graph.state import FileReviewState

logger = logging.getLogger(__name__)


def route_after_preprocess(state: FileReviewState) -> str:
    """If file is skipped (e.g. lockfile or empty diff), bypass review directly to audit."""
    if state.get("result") is not None:
        return "audit_log"
    return "route_tier"


def should_continue_or_failover(state: FileReviewState) -> str:
    """Decides whether to route to failover or conclude review with audit logging."""
    if state.get("result") is not None:
        return "audit_log"

    error = state.get("error")
    attempt_count = state.get("attempt_count", 0)

    # If error occurred and retry limit not reached (max 2 attempts across providers)
    if error and attempt_count < 2:
        logger.warning(
            "Routing to failover node (attempt=%d, error=%s)",
            attempt_count,
            error,
        )
        return "failover"

    return "audit_log"


def create_review_graph():
    """Builds and compiles the LangGraph StateGraph review workflow."""
    workflow = StateGraph(FileReviewState)

    # Register workflow nodes
    workflow.add_node("preprocess_diff", preprocess_diff_node)
    workflow.add_node("route_tier", route_tier_node)
    workflow.add_node("format_prompt", format_prompt_node)
    workflow.add_node("invoke_model", invoke_model_node)
    workflow.add_node("failover", failover_node)
    workflow.add_node("audit_log", audit_log_node)

    # Define edges & transitions
    workflow.add_edge(START, "preprocess_diff")

    workflow.add_conditional_edges(
        "preprocess_diff",
        route_after_preprocess,
        {
            "route_tier": "route_tier",
            "audit_log": "audit_log",
        },
    )

    workflow.add_edge("route_tier", "format_prompt")
    workflow.add_edge("format_prompt", "invoke_model")

    workflow.add_conditional_edges(
        "invoke_model",
        should_continue_or_failover,
        {
            "failover": "failover",
            "audit_log": "audit_log",
        },
    )

    workflow.add_edge("failover", "invoke_model")
    workflow.add_edge("audit_log", END)

    return workflow.compile()


# Export compiled graph singleton
review_graph = create_review_graph()
