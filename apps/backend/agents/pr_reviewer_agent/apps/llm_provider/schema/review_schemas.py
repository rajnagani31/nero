from pydantic import BaseModel, Field

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.review_schema import (
    FileReviewMetadata,
    FileReviewResult,
    FinalReviewResult,
    ReviewFindingDTO,
    Severity,
)


class StructuredReviewOutput(BaseModel):
    """Pydantic model bound for LangChain structured model output."""

    findings: list[ReviewFindingDTO] = Field(
        default_factory=list,
        description="List of specific, line-anchored code review defects or observations",
    )
    summary: str = Field(
        ...,
        description="High-level summary of the file changes and overall code health",
    )


__all__ = [
    "Severity",
    "FileReviewMetadata",
    "ReviewFindingDTO",
    "FileReviewResult",
    "FinalReviewResult",
    "StructuredReviewOutput",
]
