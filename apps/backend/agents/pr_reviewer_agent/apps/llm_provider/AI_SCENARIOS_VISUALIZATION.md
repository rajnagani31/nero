# NeroAI Review Engine: Architecture & AI Scenarios Visualization

This document serves as the canonical living architectural reference for the multi-provider, stateful AI pull request code review engine.

---

## 1. High-Level Scatter-Gather & Graph Architecture

```
                          [ GitHub PR Webhook ]
                                    |
                                    v
                     [ review_pull_request Celery Task ]
                                    |
            +-----------------------+-----------------------+
            | (Celery Chord Scatter: parallel review_file)  |
            v                                               v
    [ review_file Task ]                            [ review_file Task ]
     (Worker A: file1.py)                            (Worker B: file2.ts)
            |                                               |
            v                                               v
   [ LangGraph StateGraph ]                        [ LangGraph StateGraph ]
   +----------------------+                        +----------------------+
   | 1. Preprocess Diff   |                        | 1. Preprocess Diff   |
   | 2. Route Tier (Tier) |                        | 2. Route Tier (Tier) |
   | 3. Format Prompt     |                        | 3. Format Prompt     |
   | 4. Invoke LLM        |                        | 4. Invoke LLM        |
   |    (Groq / OpenAI)   |                        |    (Groq / OpenAI)   |
   | 5. 429 Failover Node |                        | 5. 429 Failover Node |
   | 6. Audit & Findings  |                        | 6. Audit & Findings  |
   +----------------------+                        +----------------------+
            |                                               |
            v                                               v
     [ DB: ai_call_logs ]                            [ DB: ai_call_logs ]
  [ DB: review_file_results ]                     [ DB: review_file_results ]
            |                                               |
            +-----------------------+-----------------------+
                                    |
                                    v
                  [ aggregate_review Celery Chord Gather ]
                 - Roll up tokens, latency, cost, and verdict
                 - Update DB: review_jobs (SUCCEEDED)
                 - Deduct user credits in DB: user_ai_quotas
                                    |
                                    v
                      [ GitHub PR Review Comment Post ]
```

---

## 2. Per-File LangGraph StateGraph Flow

```
                      +-------------------+
                      |      START        |
                      +-------------------+
                                |
                                v
                      +-------------------+
                      |  preprocess_diff  |
                      +-------------------+
                                |
               +----------------+----------------+
               | (is skipped?)                   | (has actionable patch)
               v                                 v
      +-----------------+              +-------------------+
      |                 |              |    route_tier     |
      |                 |              +-------------------+
      |                 |                        |
      |                 |                        v
      |                 |              +-------------------+
      |                 |              |   format_prompt   |
      |                 |              +-------------------+
      |                 |                        |
      |                 |                        v
      |                 |              +-------------------+ <-------+
      |                 |              |   invoke_model    |         |
      |                 |              +-------------------+         |
      |                 |                        |                   |
      |                 |        +---------------+---------------+   |
      |                 |        | (429/5xx & retry < 2)         |   |
      |                 |        v                               |   |
      |                 |  +------------+                        |   |
      |                 |  |  failover  | -----------------------+   |
      |                 |  +------------+                            |
      |                 |        | (success OR exhausted retries)    |
      |                 v        v                                   |
      |               +-------------------+                          |
      +-------------> |     audit_log     |                          |
                      +-------------------+                          |
                                |                                    |
                                v                                    |
                      +-------------------+                          |
                      |       END         |                          |
                      +-------------------+                          |
```

---

## 3. Execution Scenarios Matrix

### Scenario A: Free Tier Standard Path (Groq Primary 200 OK)
- **Condition**: User on Free tier, Primary Groq account has available quota.
- **Path**: `route_tier` -> selects Groq Primary (`openai/gpt-oss-120b`). Model returns HTTP 200.
- **Telemetry**: `ai_call_logs` records 1 entry (status_code=200, key_alias="primary"). `review_file_results` records `provider_used="groq"`, `fallback_used=False`.

```
[route_tier] --> [invoke_model: Groq Primary] --(200 OK)--> [audit_log] --> [END]
```

### Scenario B: Free Tier Rate Limit Failover (Groq Primary 429 -> Groq Fallback 200 OK)
- **Condition**: Free tier, Primary Groq account encounters HTTP 429 (Rate Limit).
- **Path**: Primary call returns 429. Conditional edge routes to `failover` node. Key alias switched to `fallback`. Secondary call returns HTTP 200.
- **Telemetry**: `ai_call_logs` records 2 entries (entry 1: status_code=429, key_alias="primary"; entry 2: status_code=200, key_alias="fallback"). `review_jobs` and `review_file_results` mark `fallback_used=True`, `fallback_reason="HTTP 429..."`.

```
[invoke_model: Groq Primary] --(429)--> [failover] --> [invoke_model: Groq Fallback] --(200 OK)--> [audit_log]
```

### Scenario C: Free Tier Outage / Celery Retry (Both Groq accounts 5xx)
- **Condition**: Severe Groq platform outage; both Primary and Fallback return HTTP 500/503.
- **Path**: Primary fails -> failover to Fallback -> Fallback fails. All retries exhausted. Graceful error logged; Celery task retries with exponential backoff (max 3 retries).
- **Telemetry**: `ai_call_logs` records all attempted 5xx codes. Review marked as failed only if Celery retries are exhausted.

```
[invoke_model: Primary] --(500)--> [failover] --> [invoke_model: Fallback] --(500)--> [Celery Retry]
```

### Scenario D: Paid Tier Standard Path (OpenAI GPT-4o 200 OK)
- **Condition**: User on Paid / Pro tier.
- **Path**: `route_tier` -> selects OpenAI (`gpt-4o`). Model returns HTTP 200.
- **Telemetry**: `ai_call_logs` records status_code=200, provider="openai", model_name="gpt-4o".

```
[route_tier] --> [invoke_model: OpenAI gpt-4o] --(200 OK)--> [audit_log] --> [END]
```

### Scenario E: Paid Tier Outage Failover (OpenAI 5xx/Timeout -> Groq Primary 200 OK)
- **Condition**: Paid tier user, but OpenAI endpoint suffers timeout or 503 outage.
- **Path**: OpenAI invocation times out. `failover` node catches error, switches provider to Groq Primary (`openai/gpt-oss-120b`). Secondary call completes review.
- **Telemetry**: `ai_call_logs` records OpenAI failure and Groq success. `fallback_used=True` with `fallback_reason` populated.

```
[invoke_model: OpenAI] --(Timeout/5xx)--> [failover] --> [invoke_model: Groq Primary] --(200 OK)--> [audit_log]
```

### Scenario F: Skipped / Binary / Non-Code Files (Zero AI Calls)
- **Condition**: Lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `uv.lock`), images (`.png`, `.svg`), deleted files, or empty diffs.
- **Path**: `preprocess_diff` immediately flags file as skipped. Bypasses tier router and LLM calls directly to `audit_log`.
- **Telemetry**: `review_file_results` saved with `status="skipped"`, `findings=[]`, `prompt_tokens=0`, `latency_ms=0`. No `ai_call_logs` entry generated (zero cost).

```
[preprocess_diff] --(is skipped)--> [audit_log] --> [END]
```

---

## 4. Database Mutation Lifecycle

| Stage | Table | Columns Updated | State / Description |
|---|---|---|---|
| 1. PR Webhook | `pull_requests` | `state="open"`, `commit_sha` | Webhook registered; PR metadata saved |
| 2. Enqueue | `review_jobs` | `status="queued"`, `attempts=0`, `total_files=N` | Job queued for Celery workers |
| 3. Worker Start | `review_jobs` | `status="running"`, `started_at=now()` | Workers pick up file review tasks |
| 4. File Review (LLM Call) | `ai_call_logs` | `job_id`, `filename`, `provider`, `key_alias`, `model_name`, `status_code`, `prompt_tokens`, `completion_tokens`, `latency_ms`, `error_message` | Audit row inserted for EVERY call attempt (200, 429, 500) |
| 5. File Review (Result) | `review_file_results` | `status="reviewed"/"skipped"`, `findings_json`, `summary`, `provider_used`, `model_used`, `prompt_tokens`, `completion_tokens`, `latency_ms` | Per-file findings anchored to diff lines |
| 6. Gather & Rollup | `review_jobs` | `status="succeeded"`, `finished_at=now()`, `primary_provider`, `model_name`, `fallback_used`, `fallback_reason`, `total_prompt_tokens`, `total_completion_tokens`, `total_tokens`, `total_latency_ms`, `credits_deducted` | Celery chord gather completes aggregate rollup |
| 7. Quota Deduction | `user_ai_quotas` | `monthly_pr_reviews_count += 1`, `credits_used += credits_deducted`, `credits_balance -= credits_deducted` | User monthly quota and credits balance reconciled |
