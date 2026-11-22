---

---

# Rule: Maintain Living AI Scenarios Visualization

## Scope & Target
This rule applies whenever working on or modifying:
- `apps/backend/agents/pr_reviewer_agent/apps/llm_provider/`
- `apps/backend/agents/pr_reviewer_agent/apps/code_reviewer/tasks/`
- Celery review tasks (`review_file_task.py`, `aggregate_review_task.py`, `review_pull_request_task.py`)
- Database models and schemas (`review_jobs`, `review_file_results`, `ai_call_logs`, `user_ai_quotas`)

Target Living Document:
`apps/backend/agents/pr_reviewer_agent/apps/llm_provider/AI_SCENARIOS_VISUALIZATION.md`

---

## Mandatory Requirements

1. **Continuous Synchronization**:
   Whenever any code change alters the AI review pipeline, routing logic, failover mechanism, Celery scatter-gather flow, or database table columns, the agent **MUST** update `AI_SCENARIOS_VISUALIZATION.md` in the same commit/change.

2. **Diagram Formatting (Strict ASCII Only)**:
   All diagrams in `AI_SCENARIOS_VISUALIZATION.md` **MUST** use plain ASCII characters only:
   - Borders: `+`, `-`, `|`
   - Directional arrows: `-->`, `<--`, `^`, `v`
   - Markers: `*`, `x`
   - **DO NOT** use unicode box-drawing glyphs (`┌`, `─`, `│`, `└`, etc.) or emojis inside diagrams to prevent character drifting across terminals, fonts, and locales.

3. **Required Content Sections**:
   The document must always document:
   - **Scatter-Gather Architecture**: Celery `chord` fan-out to parallel workers $\rightarrow$ worker-level LangGraph execution $\rightarrow$ Celery gather callback $\rightarrow$ GitHub comment delivery.
   - **All Execution Scenarios**:
     - Scenario A: Free Tier Standard Path (Groq Primary 200 OK)
     - Scenario B: Free Tier Rate Limit Failover (Groq Primary 429 $\rightarrow$ Groq Fallback 200 OK)
     - Scenario C: Free Tier Outage / Celery Retry (Both Groq accounts 5xx)
     - Scenario D: Paid Tier Standard Path (OpenAI GPT-4o 200 OK)
     - Scenario E: Paid Tier Outage Failover (OpenAI 5xx/Timeout $\rightarrow$ Groq Primary 200 OK)
     - Scenario F: Skipped / Binary Files (Zero AI calls)
   - **Table Mutation Lifecycle**: Exact table state transitions across `pull_requests`, `review_jobs`, `review_file_results`, `ai_call_logs`, and `user_ai_quotas`.

4. **Maintenance Horizon**:
   This document must be kept strictly updated through every development phase until this feature branch is fully reviewed, verified, and merged.
