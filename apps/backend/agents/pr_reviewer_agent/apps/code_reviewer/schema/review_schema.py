from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


Severity = Literal["critical", "high", "medium", "low", "info"]


SEVERITY_ALIASES = {
    "style": "low",
    "docs": "info",
    "documentation": "info",
    "test": "medium",
    "testing": "medium",
    "maintainability": "medium",
    "performance": "medium",
    "bug": "high",
    "security": "high",
}


class ReviewFindingDTO(BaseModel):
    file: str | None = None
    line: int | None = None
    side: Literal["LEFT", "RIGHT"] = "RIGHT"
    severity: Severity = "info"
    category: Literal[
        "security",
        "bug",
        "performance",
        "style",
        "maintainability",
        "test",
        "docs",
        "other",
    ] = "other"
    title: str = "Review finding"
    summary: str = ""
    message: str | None = None
    recommendation: str | None = None
    suggestion: str | None = None
    line_start: int | None = None
    line_end: int | None = None

    @field_validator("severity", mode="before")
    @classmethod
    def normalize_severity(cls, value: Any) -> str:
        if value is None:
            return "info"

        normalized = str(value).strip().lower()
        allowed = {"critical", "high", "medium", "low", "info"}
        if normalized in allowed:
            return normalized
        return SEVERITY_ALIASES.get(normalized, "info")

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "file_path" in data and not data.get("file"):
                data["file"] = data["file_path"]

            line = data.get("line")
            line_start = data.get("line_start")
            if line is not None and line_start is None:
                data["line_start"] = line
            elif line_start is not None and line is None:
                data["line"] = line_start

            message = data.get("message")
            summary = data.get("summary")
            if message and not summary:
                data["summary"] = message
            elif summary and not message:
                data["message"] = summary

            suggestion = data.get("suggestion")
            recommendation = data.get("recommendation")
            if suggestion and not recommendation:
                data["recommendation"] = suggestion
            elif recommendation and not suggestion:
                data["suggestion"] = recommendation

            if not data.get("title") and data.get("summary"):
                data["title"] = data["summary"][:60]
        return data


class FileReviewResult(BaseModel):
    filename: str
    findings: list[ReviewFindingDTO] = Field(default_factory=list)
    summary: str = ""
    skipped: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class FinalReviewResult(BaseModel):
    review_job_id: int
    total_files: int
    reviewed_files: int
    skipped_files: int
    total_findings: int
    findings_by_severity: dict[str, int]
    summary: str
    files: list[FileReviewResult]
