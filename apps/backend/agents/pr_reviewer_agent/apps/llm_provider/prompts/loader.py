from pathlib import Path
from functools import lru_cache
from langchain_core.prompts import ChatPromptTemplate

PROMPTS_DIR = Path(__file__).resolve().parent


@lru_cache(maxsize=16)
def load_prompt_text(filename: str) -> str:
    """Load raw markdown text from the prompts directory."""
    file_path = PROMPTS_DIR / filename
    if not file_path.is_file():
        raise FileNotFoundError(f"Prompt template file not found: {file_path}")
    return file_path.read_text(encoding="utf-8").strip()


def get_file_review_prompt_template() -> ChatPromptTemplate:
    """Return a compiled ChatPromptTemplate for individual file code reviews."""
    system_text = load_prompt_text("system_prompt.md")
    human_text = load_prompt_text("file_review_prompt.md")
    return ChatPromptTemplate.from_messages(
        [
            ("system", system_text),
            ("human", human_text),
        ]
    )


def get_aggregate_summary_prompt_template() -> ChatPromptTemplate:
    """Return a compiled ChatPromptTemplate for executive pull request summaries."""
    system_text = load_prompt_text("system_prompt.md")
    human_text = load_prompt_text("aggregate_summary_prompt.md")
    return ChatPromptTemplate.from_messages(
        [
            ("system", system_text),
            ("human", human_text),
        ]
    )
