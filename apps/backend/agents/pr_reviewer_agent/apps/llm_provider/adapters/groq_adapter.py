import logging
from typing import Literal
from langchain_groq import ChatGroq

from apps.backend.bot.application import config

logger = logging.getLogger(__name__)

GroqKeyAlias = Literal["primary", "fallback", "groq_primary", "groq_fallback"]


class GroqAdapter:
    def __init__(
        self,
        *,
        primary_api_key: str | None = None,
        fallback_api_key: str | None = None,
        model_name: str | None = None,
    ) -> None:
        self.primary_api_key = primary_api_key or config.GROQ_API_KEY_PRIMARY
        self.fallback_api_key = fallback_api_key or config.GROQ_API_KEY_FALLBACK
        self.model_name = model_name or config.GROQ_MODEL or "openai/gpt-oss-120b"

    def get_api_key(self, alias: GroqKeyAlias = "primary") -> str | None:
        if alias in ("primary", "groq_primary"):
            return self.primary_api_key
        if alias in ("fallback", "groq_fallback"):
            return self.fallback_api_key or self.primary_api_key
        return self.primary_api_key

    def get_client(
        self,
        alias: GroqKeyAlias = "primary",
        *,
        temperature: float = 0.1,
        timeout: float = 60.0,
    ) -> ChatGroq:
        api_key = self.get_api_key(alias)
        if not api_key:
            raise ValueError(f"Groq API key for alias '{alias}' is not configured.")

        normalized_alias = "primary" if alias in ("primary", "groq_primary") else "fallback"
        logger.info(
            "Initializing ChatGroq (alias=%s, model=%s, temp=%s)",
            normalized_alias,
            self.model_name,
            temperature,
        )

        return ChatGroq(
            groq_api_key=api_key,
            model_name=self.model_name,
            temperature=temperature,
            timeout=timeout,
            max_retries=1,
        )
