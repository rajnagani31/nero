from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class AICallLogDTO(BaseModel):
    """Structured data transfer object for individual LLM call audit records."""

    job_id: Optional[int] = None
    filename: str = Field(default="unknown", description="Target file name under review")
    provider: str = Field(default="unknown", description="AI provider (e.g. groq, openai)")
    key_alias: str = Field(default="unknown", description="API key alias used (e.g. primary, fallback)")
    model_name: str = Field(default="unknown", description="Exact model identifier")
    attempt_number: int = Field(default=1, ge=1, description="Sequential attempt number (1 for primary, 2+ for retries)")
    status_code: int = Field(default=200, description="HTTP response code (e.g. 200, 429, 500)")
    prompt_tokens: int = Field(default=0, ge=0)
    completion_tokens: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)
    latency_ms: int = Field(default=0, ge=0)
    error_message: Optional[str] = None


class JobTelemetryRollupDTO(BaseModel):
    """Structured rollup of PR-level AI resource usage, latency, and costs."""

    primary_provider: Optional[str] = None
    model_name: Optional[str] = None
    fallback_used: bool = False
    fallback_reason: Optional[str] = None
    total_prompt_tokens: int = Field(default=0, ge=0)
    total_completion_tokens: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)
    total_latency_ms: int = Field(default=0, ge=0)
    credits_deducted: Decimal = Field(default=Decimal("0.0000"), decimal_places=4)


class UserQuotaDTO(BaseModel):
    """Structured snapshot of a user's monthly PR review quota and credit balance."""

    user_id: int
    tier: str = "free"
    monthly_pr_reviews_limit: int = 50
    monthly_pr_reviews_count: int = 0
    credits_balance: Decimal = Decimal("10.0000")
    credits_used: Decimal = Decimal("0.0000")
