import json
from typing import Any

import httpx

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.review_schema import (
    FileReviewResult,
)
from apps.backend.bot.application import config


class AIReviewTemporaryError(RuntimeError):
    pass


class AIReviewService:
    allowed_categories = {
        "security",
        "bug",
        "performance",
        "style",
        "maintainability",
        "test",
        "docs",
        "other",
    }
    category_aliases = {
        "correctness": "bug",
        "reliability": "bug",
        "quality": "maintainability",
        "readability": "maintainability",
        "testing": "test",
        "documentation": "docs",
    }

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout_seconds: float = 60.0,
        use_dummy: bool | None = None,
    ) -> None:
        self.api_key = api_key or config.OPENAI_API_KEY
        self.model = model or config.OPENAI_MODEL
        self.timeout_seconds = timeout_seconds
        self.use_dummy = (
            use_dummy if use_dummy is not None else not bool(self.api_key)
        )

    async def review_file(
        self,
        *,
        filename: str,
        status: str,
        patch: str,
    ) -> FileReviewResult:
        if self.use_dummy:
            return self._build_dummy_result(
                filename=filename,
                status=status,
                patch=patch,
            )

        if not self.api_key:
            return FileReviewResult(
                filename=filename,
                findings=[],
                summary="AI review skipped because OPENAI_API_KEY is not configured.",
                metadata={"provider": "none", "status": status},
            )

        prompt = self._build_prompt(filename=filename, status=status, patch=patch)
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a senior code reviewer. Return only JSON matching "
                        '{"filename": string, "findings": array, "summary": string}.'
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise AIReviewTemporaryError("AI request failed temporarily") from exc

        if response.status_code in {408, 409, 425, 429, 500, 502, 503, 504}:
            raise AIReviewTemporaryError(f"AI request failed with {response.status_code}")

        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        parsed: dict[str, Any] = json.loads(content)
        parsed["filename"] = filename
        parsed = self._normalize_response(parsed)
        return FileReviewResult.model_validate(parsed)

    def _build_dummy_result(self, *, filename: str, status: str, patch: str) -> FileReviewResult:
        return FileReviewResult(
            filename=filename,
            findings=[
                {
                    "file": filename,
                    "severity": "info",
                    "category": "other",
                    "title": "Dummy review placeholder",
                    "summary": (
                        "This is a placeholder review generated locally for testing. "
                        "Replace it with the real AI review provider when configured."
                    ),
                    "message": (
                        "This is a placeholder review generated locally for testing. "
                        "Replace it with the real AI review provider when configured."
                    ),
                    "recommendation": "Wire the real OpenAI review service to replace this placeholder.",
                    "suggestion": "Wire the real OpenAI review service to replace this placeholder.",
                    "line": 1,
                    "line_start": 1,
                    "line_end": 1,
                    "side": "RIGHT",
                }
            ],
            summary=(
                "Dummy AI review generated for local testing. "
                f"Status: {status}. Patch length: {len(patch or '')}."
            ),
            metadata={"provider": "dummy", "status": status, "patch_length": len(patch or "")},
        )

    def _normalize_response(self, parsed: dict[str, Any]) -> dict[str, Any]:
        findings = parsed.get("findings")
        if not isinstance(findings, list):
            parsed["findings"] = []
            return parsed

        filename = parsed.get("filename")
        for finding in findings:
            if not isinstance(finding, dict):
                continue
            category = str(finding.get("category") or "other").lower()
            category = self.category_aliases.get(category, category)
            finding["category"] = category if category in self.allowed_categories else "other"
            if not finding.get("file") and filename:
                finding["file"] = filename
            if not finding.get("side"):
                finding["side"] = "RIGHT"
            if not finding.get("title"):
                finding["title"] = "Review finding"
            if not finding.get("summary") and finding.get("message"):
                finding["summary"] = finding["message"]
            elif not finding.get("summary"):
                finding["summary"] = finding["title"]
            if not finding.get("message") and finding.get("summary"):
                finding["message"] = finding["summary"]
            if not finding.get("recommendation") and finding.get("suggestion"):
                finding["recommendation"] = finding["suggestion"]
            elif not finding.get("suggestion") and finding.get("recommendation"):
                finding["suggestion"] = finding["recommendation"]
            if finding.get("line") is not None and finding.get("line_start") is None:
                finding["line_start"] = finding["line"]
            elif finding.get("line_start") is not None and finding.get("line") is None:
                finding["line"] = finding["line_start"]
        return parsed

    def _build_prompt(self, *, filename: str, status: str, patch: str) -> str:
        return (
            f"Review this changed file.\n\n"
            f"Filename: {filename}\n"
            f"Git status: {status}\n\n"
            f"Patch:\n{patch}\n\n"
            "Find correctness, security, performance, maintainability, test, and docs issues. "
            "Each finding must include severity, category, title, summary, recommendation, "
            "line_start, and optional line_end. Severity must be exactly one of: "
            "critical, high, medium, low, info. Category must be exactly one of: "
            "security, bug, performance, style, maintainability, test, docs, other."
        )
