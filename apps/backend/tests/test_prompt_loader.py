from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.prompts.loader import (
    get_aggregate_summary_prompt_template,
    get_file_review_prompt_template,
    load_prompt_text,
)


def test_load_prompt_text() -> None:
    system_text = load_prompt_text("system_prompt.md")
    assert "NeroAI" in system_text
    assert "False-Positive Mitigation" in system_text

    file_review_text = load_prompt_text("file_review_prompt.md")
    assert "{filename}" in file_review_text
    assert "{patch}" in file_review_text

    aggregate_text = load_prompt_text("aggregate_summary_prompt.md")
    assert "{pr_title}" in aggregate_text
    assert "{file_summaries}" in aggregate_text


def test_file_review_prompt_template_formatting() -> None:
    template = get_file_review_prompt_template()
    messages = template.format_messages(
        filename="auth/service.py",
        status="modified",
        patch="diff --git a/auth/service.py b/auth/service.py\n+def login(): pass",
        language="python",
    )

    assert len(messages) == 2
    assert messages[0].type == "system"
    assert "NeroAI" in messages[0].content

    assert messages[1].type == "human"
    assert "auth/service.py" in messages[1].content
    assert "def login(): pass" in messages[1].content
    assert "python" in messages[1].content


def test_aggregate_summary_prompt_template_formatting() -> None:
    template = get_aggregate_summary_prompt_template()
    messages = template.format_messages(
        pr_title="Refactor Auth Layer",
        pr_description="Upgrade session handling to JWT tokens",
        total_files=3,
        file_summaries="- auth.py: 1 bug found\n- session.py: clean",
        critical_findings_count=0,
        high_findings_count=1,
    )

    assert len(messages) == 2
    assert messages[0].type == "system"
    assert "NeroAI" in messages[0].content

    assert messages[1].type == "human"
    assert "Refactor Auth Layer" in messages[1].content
    assert "Upgrade session handling to JWT tokens" in messages[1].content
    assert "Total Files Evaluated" in messages[1].content
    assert "High Findings Count" in messages[1].content
