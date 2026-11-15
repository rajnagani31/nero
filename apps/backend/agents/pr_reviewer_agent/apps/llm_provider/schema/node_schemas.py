from typing import Any, Optional

from pydantic import BaseModel, Field

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.review_schema import (
    FileReviewResult,
)
from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.schema.telemetry_schemas import (
    AICallLogDTO,
)


class NodeOutputBase(BaseModel):
    """Base class for node outputs with attribute and dictionary-style access."""

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)

    def __getitem__(self, key: str) -> Any:
        try:
            return getattr(self, key)
        except AttributeError:
            raise KeyError(key)


class PreprocessDiffOutput(NodeOutputBase):
    """Structured output from diff preprocessing node."""

    language: str = "text"
    attempt_count: int = 0
    fallback_used: bool = False
    fallback_reason: Optional[str] = None
    call_logs: list[AICallLogDTO] = Field(default_factory=list)
    result: Optional[FileReviewResult] = None


class RouteTierOutput(NodeOutputBase):
    """Structured output from tier routing node."""

    current_provider: str = "dummy"
    current_key_alias: str = "dummy"
    current_model: str = "dummy"


class FormatPromptOutput(NodeOutputBase):
    """Structured output from prompt formatting node."""

    formatted_messages: list[Any] = Field(default_factory=list)


class ModelInvocationOutput(NodeOutputBase):
    """Structured output from LLM invocation node (success or failure)."""

    result: Optional[FileReviewResult] = None
    status_code: int = 200
    error: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: int = 0
    call_logs: list[AICallLogDTO] = Field(default_factory=list)


class FailoverOutput(NodeOutputBase):
    """Structured output from 429/5xx failover node."""

    attempt_count: int
    fallback_used: bool = True
    fallback_reason: Optional[str] = None
    error: Optional[str] = None
    current_key_alias: Optional[str] = None
    current_provider: Optional[str] = None
    current_model: Optional[str] = None


class AuditLogOutput(NodeOutputBase):
    """Structured output from audit logging and result finalization node."""

    result: FileReviewResult
