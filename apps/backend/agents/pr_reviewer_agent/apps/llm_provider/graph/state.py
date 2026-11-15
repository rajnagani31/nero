from typing import Any, Optional, TypedDict

from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.schema.review_schemas import (
    FileReviewMetadata,
    FileReviewResult,
    ReviewFindingDTO,
    StructuredReviewOutput,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.schema.telemetry_schemas import (
    AICallLogDTO,
)


class FileReviewState(TypedDict, total=False):
    # Inputs
    job_id: int | None
    filename: str
    status: str
    patch: str
    language: str
    user_tier: str
    force_dummy: bool

    # Routing & Context
    current_provider: str
    current_key_alias: str
    current_model: str
    attempt_count: int
    fallback_used: bool
    fallback_reason: str | None

    # Formatted Messages
    formatted_messages: list[Any]

    # Result & Telemetry
    result: FileReviewResult | None
    error: str | None
    status_code: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int

    # Structured call audit logs
    call_logs: list[AICallLogDTO]


__all__ = [
    "StructuredReviewOutput",
    "FileReviewState",
    "FileReviewResult",
    "ReviewFindingDTO",
    "FileReviewMetadata",
    "AICallLogDTO",
]
