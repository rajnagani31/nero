import logging

from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.adapters.groq_adapter import GroqAdapter
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.adapters.openai_adapter import OpenAIAdapter
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.graph.review_graph import review_graph
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.graph.state import (
    FileReviewMetadata,
    FileReviewResult,
    FileReviewState,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.prompts.loader import (
    get_aggregate_summary_prompt_template,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.repository.ai_telemetry_repo import (
    AITelemetryRepository,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.router.tiered_router import (
    TieredRouter,
)

logger = logging.getLogger(__name__)


class AIReviewService:
    """Unified high-level AI review service backed by LangGraph, LangChain, and typed Pydantic DTOs."""

    def __init__(
        self,
        *,
        force_dummy: bool = False,
        telemetry_repo: AITelemetryRepository | None = None,
    ) -> None:
        self.force_dummy = force_dummy
        self.telemetry_repo = telemetry_repo or AITelemetryRepository()

    async def review_file(
        self,
        *,
        filename: str,
        status: str,
        patch: str,
        user_tier: str = "free",
        job_id: int | None = None,
    ) -> FileReviewResult:
        initial_state: FileReviewState = {
            "job_id": job_id,
            "filename": filename,
            "status": status,
            "patch": patch,
            "user_tier": user_tier,
            "force_dummy": self.force_dummy,
            "call_logs": [],
        }

        # Execute compiled LangGraph StateGraph
        final_state = await review_graph.ainvoke(initial_state)

        # Persist call logs into database via typed repository
        call_logs = final_state.get("call_logs", [])
        if call_logs and job_id:
            self.telemetry_repo.save_call_logs(call_logs)

        result = final_state.get("result")
        if not result:
            result = FileReviewResult(
                filename=filename,
                findings=[],
                summary="Review completed without result.",
                skipped=True,
                metadata=FileReviewMetadata(status=status),
            )

        return result

    async def generate_aggregate_summary(
        self,
        *,
        pr_title: str,
        pr_description: str,
        total_files: int,
        file_summaries: str,
        critical_findings_count: int,
        high_findings_count: int,
        user_tier: str = "free",
    ) -> str:
        """Synthesizes high-level PR report from individual file reviews."""
        if self.force_dummy:
            return (
                f"# PR Review Summary: {pr_title}\n\n"
                "**Verdict**: APPROVE\n\n"
                f"Evaluated {total_files} files with 0 critical defects. (Dummy Mode)"
            )

        template = get_aggregate_summary_prompt_template()
        messages = template.format_messages(
            pr_title=pr_title or "Untitled PR",
            pr_description=pr_description or "No description provided",
            total_files=total_files,
            file_summaries=file_summaries,
            critical_findings_count=critical_findings_count,
            high_findings_count=high_findings_count,
        )

        router = TieredRouter()
        plan = router.resolve_plan(user_tier=user_tier)

        try:
            if plan.primary_provider == "openai":
                client = OpenAIAdapter().get_client()
            elif plan.primary_provider == "groq":
                client = GroqAdapter().get_client(alias=plan.primary_key_alias)  # type: ignore[arg-type]
            else:
                return (
                    f"# PR Review Summary: {pr_title}\n\n"
                    "**Verdict**: APPROVE\n\n"
                    "Review completed using dummy provider."
                )

            response = await client.ainvoke(messages)
            return getattr(response, "content", str(response)).strip()
        except Exception as exc:
            logger.exception("Failed to generate aggregate summary with primary provider: %s", exc)
            return (
                f"# PR Review Summary: {pr_title}\n\n"
                f"**Verdict**: COMMENT\n\n"
                f"Completed evaluation of {total_files} changed files.\n"
                f"Critical findings: {critical_findings_count}, High findings: {high_findings_count}.\n"
                f"*(Automated synthesis error: {exc})*"
            )
