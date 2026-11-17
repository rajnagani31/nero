from apps.backend.agents.pr_reviewer_agent.apps.llm_provider.router.tiered_router import (
    TieredRouter,
)


def test_tiered_router_free_tier_with_groq_keys() -> None:
    router = TieredRouter(
        groq_primary_key="gsk_prim_123",
        groq_fallback_key="gsk_fall_456",
        groq_model="openai/gpt-oss-120b",
        openai_key="sk-openai-123",
    )

    plan = router.resolve_plan("free")
    assert plan.user_tier == "free"
    assert plan.primary_provider == "groq"
    assert plan.primary_key_alias == "primary"
    assert plan.primary_model == "openai/gpt-oss-120b"
    assert plan.fallback_provider == "groq"
    assert plan.fallback_key_alias == "fallback"


def test_tiered_router_paid_tier_with_openai_key() -> None:
    router = TieredRouter(
        groq_primary_key="gsk_prim_123",
        groq_fallback_key="gsk_fall_456",
        openai_key="sk-openai-123",
        openai_model="gpt-4o",
    )

    plan = router.resolve_plan("paid")
    assert plan.user_tier == "paid"
    assert plan.primary_provider == "openai"
    assert plan.primary_key_alias == "openai_default"
    assert plan.primary_model == "gpt-4o"
    assert plan.fallback_provider == "groq"
    assert plan.fallback_key_alias == "primary"


def test_tiered_router_dummy_fallback_when_no_keys() -> None:
    router = TieredRouter(
        groq_primary_key=None,
        groq_fallback_key=None,
        openai_key=None,
    )

    plan = router.resolve_plan("free")
    assert plan.primary_provider == "dummy"
    assert plan.fallback_provider is None


def test_tiered_router_force_dummy() -> None:
    router = TieredRouter(
        groq_primary_key="gsk_prim_123",
        openai_key="sk-openai-123",
    )

    plan = router.resolve_plan("paid", force_dummy=True)
    assert plan.primary_provider == "dummy"
