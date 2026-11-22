# Rule: No Silent Fallbacks

## Purpose
Silent fallbacks hide critical system, dependency, and query failures. When an agent or developer adds unapproved fallback data, degraded modes, or empty defaults, users receive incorrect or fabricated results and production bugs become invisible. A fallback is **strictly prohibited** unless explicitly defined in written business specifications or approved by the developer in the current conversation.

---

## Enforceable Rules

1. **NEVER Add Unapproved Fallbacks**:
   - Never introduce fallback values, default substitute data, automatic retries, silent skips, or degraded execution modes unless (a) the feature specification explicitly requires it, or (b) the developer explicitly approves it.
   - If an external call or query fails and no fallback is documented, **STOP and ask the developer** before writing one.

2. **ALWAYS Make Failures Explicit and Visible**:
   - **Backend**: Always raise a clear, typed exception and return the correct HTTP status code (`400`, `404`, `500`, `502`) with an error message and code. Never return empty dictionaries, zeroed counts, or mock objects when an underlying service fails.
   - **Frontend**: Always transition UI into an explicit error state displaying a user-friendly error message and a retry action. Never display mock arrays, fake metrics, or silent zero values (`0`) when a fetch fails.
   - **Background Workers / Jobs**: Always mark failed jobs with their exact error message and full stacktrace in the database and logs. Never mark a failed task as `SUCCEEDED`, never skip files silently without an explicit failure record, and never continue downstream pipelines on corrupted or partial data.

3. **NEVER Swallow Exceptions**:
   - Never write bare `except:`, `except Exception: pass`, or empty `catch {}` blocks.
   - Never catch an exception merely to return a fallback or `None` unless the specification demands it.
   - When catching an exception, **always** re-raise it, transform it into a domain-specific typed exception (`raise DomainError(...) from exc`), or execute an approved fallback while logging the root cause and context.

4. **NEVER Use Default Operators to Mask Missing Required Data**:
   - Never write `value or "N/A"`, `data or []`, or `dict.get("key", 0)` when the absence of that key indicates an upstream failure, schema violation, or uninitialized state.
   - A missing required value is an error, not an invitation to synthesize a placeholder.

5. **Mandatory Protocol for Approved Fallbacks**:
   If and only if a fallback is approved in writing or by the developer:
   - Implement it in **one** centralized, clearly named function or service method.
   - **Always log** a warning (`logger.warning(...)`) every time the fallback triggers.
   - **Always notify the user** if degraded/cached data is shown (e.g., `"Showing cached results from..."`).
   - Write an automated unit test verifying both the primary failure and the fallback execution.
   - Add a code comment citing the requirement/ticket: `# Fallback approved per [TICKET-ID / Spec]`.

6. **Retries, Timeouts, and Caches Count as Fallbacks**:
   - Retries, exponential backoffs, circuit breakers, and cache reads require the same explicit approval.
   - Retries must have finite limits (e.g., `max_retries=3`). When limits expire, the error **must** surface immediately.

---

## Code Examples

### 1. Python (FastAPI Service)
```python
# ❌ BAD: Silently catches failure and returns fake data
def get_user_analytics(user_id: int) -> AnalyticsStats:
    try:
        return db.query(Analytics).filter_by(user_id=user_id).one()
    except Exception:
        # Hides DB crash; user thinks they have 0 reviews!
        return AnalyticsStats(total_prs=0, total_reviews=0)

# ✅ GOOD: Re-raises typed domain error with proper HTTP mapping
def get_user_analytics(user_id: int) -> AnalyticsStats:
    record = db.query(Analytics).filter_by(user_id=user_id).first()
    if not record:
        raise EntityNotFoundException(f"Analytics for user {user_id} not found")
    return AnalyticsStats.model_validate(record)
```

### 2. Python (Celery Background Job)
```python
# ❌ BAD: Swallows review failure and pretends file was skipped cleanly
@celery_app.task
def review_file(file_id: int):
    try:
        response = ai_client.review(file_id)
        return response
    except Exception:
        # Marks failed review as clean skip!
        return {"status": "skipped", "findings": []}

# ✅ GOOD: Fails loudly, logs context, and marks job as FAILED
@celery_app.task(bind=True, max_retries=3)
def review_file(self, file_id: int):
    try:
        return ai_client.review(file_id)
    except httpx.NetworkError as exc:
        logger.warning("Network blip reviewing file %s, retrying: %s", file_id, exc)
        raise self.retry(exc=exc, countdown=15)
    except Exception as exc:
        logger.error("Permanent failure reviewing file %s: %s", file_id, exc, exc_info=True)
        repository.mark_file_failed(file_id, error_message=str(exc))
        raise
```

### 3. TypeScript / React (API Call & UI State)
```typescript
// ❌ BAD: Swallows network/server error and returns hardcoded mock data
export async function fetchStats(): Promise<Stats> {
  try {
    const res = await fetch("/api/stats");
    return await res.json();
  } catch {
    return MOCK_STATS; // Hides API downtime!
  }
}

// ✅ GOOD: Propagates error so React component shows error banner
export async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/stats");
  if (!res.ok) {
    const errorBody = await res.text();
    throw new ApiError(res.status, `Failed to load stats: ${errorBody}`);
  }
  return res.json();
}
```
