import logging
import time
from pathlib import Path
from typing import Any

from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.adapters.groq_adapter import GroqAdapter
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.adapters.openai_adapter import OpenAIAdapter
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.graph.state import FileReviewState
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.prompts.loader import (
    get_file_review_prompt_template,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.router.tiered_router import (
    TieredRouter,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.schema import (
    AICallLogDTO,
    AuditLogOutput,
    FailoverOutput,
    FileReviewMetadata,
    FileReviewResult,
    FormatPromptOutput,
    ModelInvocationOutput,
    PreprocessDiffOutput,
    ReviewFindingDTO,
    RouteTierOutput,
    StructuredReviewOutput,
)
from apps.backend.bot.application import config

logger = logging.getLogger(__name__)

NON_REVIEWABLE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pdf",
    ".zip", ".tar", ".gz", ".woff", ".woff2", ".ttf", ".eot",
    ".lock", ".map",
}

NON_REVIEWABLE_FILENAMES = {
    "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "uv.lock",
}

EXTENSION_LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".c": "c",
    ".cpp": "c++",
    ".h": "c/c++",
    ".hpp": "c++",
    ".rb": "ruby",
    ".php": "php",
    ".sql": "sql",
    ".html": "html",
    ".css": "css",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".sh": "bash",
    ".dockerfile": "dockerfile",
}


def preprocess_diff_node(state: FileReviewState) -> PreprocessDiffOutput:
    """Inspects file status, path, and patch. Skips non-reviewable, minified, or empty diffs."""
    filename = state.get("filename", "")
    patch = state.get("patch", "")
    status = state.get("status", "modified")

    path = Path(filename)
    extension = path.suffix.lower()
    base_name = path.name.lower()

    language = EXTENSION_LANGUAGE_MAP.get(extension, "text")

    # Skip empty patches or deleted files
    if status == "removed" or not patch or not patch.strip():
        return PreprocessDiffOutput(
            language=language,
            attempt_count=0,
            fallback_used=False,
            fallback_reason=None,
            call_logs=list(state.get("call_logs") or []),
            result=FileReviewResult(
                filename=filename,
                findings=[],
                summary=f"File skipped: {status} with no actionable diff patch.",
                skipped=True,
                metadata=FileReviewMetadata(status=status, reason="empty_or_deleted"),
            ),
        )

    # Skip minified files specifically (.min.js, .min.css)
    if base_name.endswith(".min.js") or base_name.endswith(".min.css"):
        return PreprocessDiffOutput(
            language=language,
            attempt_count=0,
            fallback_used=False,
            fallback_reason=None,
            call_logs=list(state.get("call_logs") or []),
            result=FileReviewResult(
                filename=filename,
                findings=[],
                summary=f"File skipped: minified code asset ({base_name}).",
                skipped=True,
                metadata=FileReviewMetadata(status=status, reason="minified_asset"),
            ),
        )

    # Skip lockfiles and binary assets
    if base_name in NON_REVIEWABLE_FILENAMES or extension in NON_REVIEWABLE_EXTENSIONS:
        return PreprocessDiffOutput(
            language=language,
            attempt_count=0,
            fallback_used=False,
            fallback_reason=None,
            call_logs=list(state.get("call_logs") or []),
            result=FileReviewResult(
                filename=filename,
                findings=[],
                summary=f"File skipped: binary or generated artifact ({base_name}).",
                skipped=True,
                metadata=FileReviewMetadata(status=status, reason="non_reviewable_asset"),
            ),
        )

    return PreprocessDiffOutput(
        language=language,
        attempt_count=0,
        fallback_used=False,
        fallback_reason=None,
        call_logs=list(state.get("call_logs") or []),
        result=None,
    )


def route_tier_node(state: FileReviewState) -> RouteTierOutput | dict[str, Any]:
    """Determines the target LLM provider, key alias, and model based on tier."""
    if state.get("result"):
        return {}

    user_tier = state.get("user_tier", "free")
    force_dummy = state.get("force_dummy", False)

    router = TieredRouter()
    plan = router.resolve_plan(user_tier=user_tier, force_dummy=force_dummy)

    return RouteTierOutput(
        current_provider=plan.primary_provider,
        current_key_alias=plan.primary_key_alias,
        current_model=plan.primary_model,
    )


def format_prompt_node(state: FileReviewState) -> FormatPromptOutput | dict[str, Any]:
    """Formats markdown prompt template with file diff and context."""
    if state.get("result"):
        return {}

    template = get_file_review_prompt_template()
    messages = template.format_messages(
        filename=state.get("filename", ""),
        status=state.get("status", "modified"),
        patch=state.get("patch", ""),
        language=state.get("language", "text"),
    )

    return FormatPromptOutput(formatted_messages=messages)


async def invoke_model_node(state: FileReviewState) -> ModelInvocationOutput | dict[str, Any]:
    """Invokes the resolved LLM provider with structured schema output."""
    if state.get("result"):
        return {}

    provider = state.get("current_provider", "dummy")
    key_alias = state.get("current_key_alias", "dummy")
    model_name = state.get("current_model", "dummy")
    filename = state.get("filename", "unknown")
    call_logs: list[AICallLogDTO] = list(state.get("call_logs") or [])
    attempt_number = state.get("attempt_count", 0) + 1

    # Check for exhausted providers branch
    if provider in ("exhausted", None, "none"):
        err = state.get("error") or "All real LLM providers exhausted; no provider available"
        return ModelInvocationOutput(
            error=err,
            status_code=503,
            call_logs=call_logs,
        )

    # Dummy provider branch - strictly gated behind explicit force_dummy
    if provider == "dummy":
        if not state.get("force_dummy", False):
            err = "Automatic dummy fallback is disabled in production."
            call_logs.append(
                AICallLogDTO(
                    job_id=state.get("job_id"),
                    filename=filename,
                    provider="dummy",
                    key_alias="dummy",
                    model_name="dummy",
                    attempt_number=attempt_number,
                    status_code=503,
                    prompt_tokens=0,
                    completion_tokens=0,
                    total_tokens=0,
                    latency_ms=0,
                    error_message=err,
                )
            )
            return ModelInvocationOutput(
                error=err,
                status_code=503,
                call_logs=call_logs,
            )

        # Explicit test mode mock review
        result = FileReviewResult(
            filename=filename,
            findings=[
                ReviewFindingDTO(
                    severity="info",
                    category="other",
                    title="Mock Review Verification",
                    summary="Automated review simulation passed via dummy provider.",
                    recommendation="Ensure real API keys are configured in production.",
                    line_start=1,
                    line_end=1,
                )
            ],
            summary="Dummy AI review verified for local test.",
            metadata=FileReviewMetadata(
                provider="dummy",
                model="dummy",
                status=state.get("status", "modified"),
            ),
        )
        call_logs.append(
            AICallLogDTO(
                job_id=state.get("job_id"),
                filename=filename,
                provider="dummy",
                key_alias="dummy",
                model_name="dummy",
                attempt_number=attempt_number,
                status_code=200,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                latency_ms=1,
                error_message=None,
            )
        )
        return ModelInvocationOutput(
            result=result,
            status_code=200,
            error=None,
            call_logs=call_logs,
            latency_ms=1,
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
        )

    # Resolve LLM client
    try:
        if provider == "groq":
            adapter = GroqAdapter(model_name=model_name)
            client = adapter.get_client(alias=key_alias)  # type: ignore[arg-type]
        elif provider == "openai":
            adapter_openai = OpenAIAdapter(model_name=model_name)
            client = adapter_openai.get_client()
        else:
            raise ValueError(f"Unknown provider '{provider}'")

        structured_client = client.with_structured_output(StructuredReviewOutput)
    except Exception as exc:
        logger.exception("Failed to initialize LLM client for provider=%s alias=%s", provider, key_alias)
        call_logs.append(
            AICallLogDTO(
                job_id=state.get("job_id"),
                filename=filename,
                provider=provider,
                key_alias=key_alias,
                model_name=model_name,
                attempt_number=attempt_number,
                status_code=500,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                latency_ms=0,
                error_message=str(exc),
            )
        )
        return ModelInvocationOutput(
            error=str(exc),
            status_code=500,
            call_logs=call_logs,
        )

    # Invoke model
    start_time = time.perf_counter()
    try:
        messages = state.get("formatted_messages", [])
        response: StructuredReviewOutput = await structured_client.ainvoke(messages)
        latency_ms = int((time.perf_counter() - start_time) * 1000)

        # Estimate tokens
        prompt_len = sum(len(getattr(m, "content", "")) for m in messages)
        prompt_tokens = max(1, prompt_len // 4)
        completion_tokens = max(1, len(str(response)) // 4)
        total_tokens = prompt_tokens + completion_tokens

        result = FileReviewResult(
            filename=filename,
            findings=response.findings,
            summary=response.summary,
            metadata=FileReviewMetadata(
                provider=provider,
                key_alias=key_alias,
                model=model_name,
                latency_ms=latency_ms,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                fallback_used=state.get("fallback_used", False),
            ),
        )

        call_logs.append(
            AICallLogDTO(
                job_id=state.get("job_id"),
                filename=filename,
                provider=provider,
                key_alias=key_alias,
                model_name=model_name,
                attempt_number=attempt_number,
                status_code=200,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                latency_ms=latency_ms,
                error_message=None,
            )
        )

        return ModelInvocationOutput(
            result=result,
            status_code=200,
            error=None,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            call_logs=call_logs,
        )

    except Exception as exc:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        err_str = str(exc)
        status_code = 429 if ("429" in err_str or "rate_limit" in err_str.lower()) else 500

        logger.warning(
            "LLM invocation failed (provider=%s, alias=%s, code=%s): %s",
            provider,
            key_alias,
            status_code,
            exc,
        )

        call_logs.append(
            AICallLogDTO(
                job_id=state.get("job_id"),
                filename=filename,
                provider=provider,
                key_alias=key_alias,
                model_name=model_name,
                attempt_number=attempt_number,
                status_code=status_code,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                latency_ms=latency_ms,
                error_message=err_str,
            )
        )

        return ModelInvocationOutput(
            error=err_str,
            status_code=status_code,
            latency_ms=latency_ms,
            call_logs=call_logs,
        )


def failover_node(state: FileReviewState) -> FailoverOutput:
    """Switches provider or key alias upon rate-limit (429) or failure."""
    current_provider = state.get("current_provider", "groq")
    current_key_alias = state.get("current_key_alias", "primary")
    attempt_count = state.get("attempt_count", 0) + 1
    error_msg = state.get("error", "Unknown error")

    logger.info(
        "Failing over from provider=%s key_alias=%s (attempt %d). Reason: %s",
        current_provider,
        current_key_alias,
        attempt_count,
        error_msg,
    )

    updates = FailoverOutput(
        attempt_count=attempt_count,
        fallback_used=True,
        fallback_reason=error_msg,
        error=None,
    )

    if current_provider == "groq" and current_key_alias in ("primary", "groq_primary"):
        updates.current_key_alias = "fallback"
    elif current_provider == "openai":
        updates.current_provider = "groq"
        updates.current_key_alias = "primary"
        updates.current_model = config.GROQ_MODEL or "openai/gpt-oss-120b"
    else:
        # All real providers exhausted
        if state.get("force_dummy", False):
            updates.current_provider = "dummy"
            updates.current_key_alias = "dummy"
            updates.current_model = "dummy"
        else:
            updates.current_provider = "exhausted"
            updates.current_key_alias = "none"
            updates.current_model = "none"
            updates.error = f"All real LLM providers exhausted. Last error: {error_msg}"

    return updates


def audit_log_node(state: FileReviewState) -> AuditLogOutput:
    """Finalizes telemetry on result or builds failure result if all attempts failed."""
    result = state.get("result")
    filename = state.get("filename", "unknown")
    call_logs: list[AICallLogDTO] = list(state.get("call_logs") or [])

    # Calculate cumulative latency across all attempts
    total_file_latency = sum(getattr(c, "latency_ms", 0) for c in call_logs) or state.get("latency_ms", 0)

    if result is None:
        result = FileReviewResult(
            filename=filename,
            findings=[],
            summary=f"Review failed after {state.get('attempt_count', 0)} attempts: {state.get('error')}",
            skipped=False,
            metadata=FileReviewMetadata(
                provider=None,
                model=None,
                status="failed",
                reason=state.get("error"),
                fallback_used=state.get("fallback_used", False),
                fallback_reason=state.get("fallback_reason"),
                latency_ms=total_file_latency,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
            ),
        )
    else:
        meta = result.metadata
        meta.latency_ms = total_file_latency
        if state.get("fallback_used"):
            meta.fallback_used = True
            meta.fallback_reason = state.get("fallback_reason")

    return AuditLogOutput(result=result)
