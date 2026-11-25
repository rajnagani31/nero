import logging
from langchain_openai import ChatOpenAI

from apps.backend.bot.application import config

logger = logging.getLogger(__name__)


class OpenAIAdapter:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model_name: str | None = None,
    ) -> None:
        self.api_key = api_key or config.OPENAI_API_KEY
        self.model_name = model_name or config.OPENAI_MODEL or "gpt-4o"

    def get_client(
        self,
        *,
        temperature: float = 0.1,
        timeout: float = 60.0,
    ) -> ChatOpenAI:
        if not self.api_key:
            raise ValueError("OpenAI API key is not configured.")

        logger.info(
            "Initializing ChatOpenAI (model=%s, temp=%s)",
            self.model_name,
            temperature,
        )

        return ChatOpenAI(
            api_key=self.api_key,
            model=self.model_name,
            temperature=temperature,
            timeout=timeout,
            max_retries=1,
        )
