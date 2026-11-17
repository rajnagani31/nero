from dataclasses import dataclass
from typing import Any, Literal

from apps.backend.bot.application import config

ProviderType = Literal["groq", "openai", "dummy"]
_UNSET: Any = object()


@dataclass
class RoutePlan:
    user_tier: str
    primary_provider: ProviderType
    primary_key_alias: str
    primary_model: str
    fallback_provider: ProviderType | None = None
    fallback_key_alias: str | None = None
    fallback_model: str | None = None


class TieredRouter:
    """Resolves target LLM provider, key alias, and fallback chain based on user subscription tier."""

    def __init__(
        self,
        *,
        groq_primary_key: str | None = _UNSET,
        groq_fallback_key: str | None = _UNSET,
        groq_model: str | None = None,
        openai_key: str | None = _UNSET,
        openai_model: str | None = None,
    ) -> None:
        self.groq_primary_key = (
            config.GROQ_API_KEY_PRIMARY if groq_primary_key is _UNSET else groq_primary_key
        )
        self.groq_fallback_key = (
            config.GROQ_API_KEY_FALLBACK if groq_fallback_key is _UNSET else groq_fallback_key
        )
        self.groq_model = groq_model or config.GROQ_MODEL or "openai/gpt-oss-120b"
        self.openai_key = config.OPENAI_API_KEY if openai_key is _UNSET else openai_key
        self.openai_model = openai_model or config.OPENAI_MODEL or "gpt-4o"

    def resolve_plan(self, user_tier: str | None = None, *, force_dummy: bool = False) -> RoutePlan:
        tier = (user_tier or "free").strip().lower()

        if force_dummy:
            return RoutePlan(
                user_tier=tier,
                primary_provider="dummy",
                primary_key_alias="dummy",
                primary_model="dummy",
                fallback_provider=None,
            )

        if tier in ("paid", "pro", "enterprise"):
            if self.openai_key:
                fallback_provider: ProviderType | None = "groq" if self.groq_primary_key else None
                return RoutePlan(
                    user_tier=tier,
                    primary_provider="openai",
                    primary_key_alias="openai_default",
                    primary_model=self.openai_model,
                    fallback_provider=fallback_provider,
                    fallback_key_alias="primary" if fallback_provider else None,
                    fallback_model=self.groq_model if fallback_provider else None,
                )

        # Free tier (or fallback for paid when OpenAI key not configured)
        if self.groq_primary_key:
            has_fallback_key = bool(self.groq_fallback_key)
            return RoutePlan(
                user_tier=tier,
                primary_provider="groq",
                primary_key_alias="primary",
                primary_model=self.groq_model,
                fallback_provider="groq" if has_fallback_key else None,
                fallback_key_alias="fallback" if has_fallback_key else None,
                fallback_model=self.groq_model if has_fallback_key else None,
            )

        # If only OpenAI key is present
        if self.openai_key:
            return RoutePlan(
                user_tier=tier,
                primary_provider="openai",
                primary_key_alias="openai_default",
                primary_model=self.openai_model,
                fallback_provider=None,
            )

        # No keys configured - use dummy
        return RoutePlan(
            user_tier=tier,
            primary_provider="dummy",
            primary_key_alias="dummy",
            primary_model="dummy",
            fallback_provider=None,
        )
