# Rule: No Hardcoded Data

## Purpose
Hardcoded sample, mock, placeholder, and magic values in production code paths make defects nearly impossible to isolate and trace. When fake or inline values enter the execution pipeline, data integrity is compromised and systems become fragile. All production data must flow from genuine storage, validated API responses, or explicit configuration.

---

## Enforceable Rules

1. **NEVER Hardcode Mock, Demo, or Placeholder Data in Production Paths**:
   - Never embed hardcoded mock arrays, fake metrics, synthetic user objects, placeholder IDs, or hardcoded chart time-series inside production frontend components, API routers, service layers, Celery tasks, or repository methods.
   - Prototyping data must never leak into production code files.

2. **ALWAYS Return `None` / `null` or Explicit "No Data" for Missing Values**:
   - When a record, field, or metric does not exist, return `None` (Python) or `null` (TypeScript), or transition the component to a dedicated `"No data available"` empty state.
   - **Mandatory Pattern**: `value if data else None`
   - **Forbidden Pattern**: `value if data else <hardcoded fallback>`

3. **NEVER Hardcode Configuration, Secrets, or Infrastructure Endpoints**:
   - Never hardcode database connection strings, API tokens, secret keys, webhook secrets, hostnames, ports, email addresses, or base URLs in source code.
   - All environment-dependent values and operational limits (timeouts, rate limits, token quotas) must be loaded through the project's centralized configuration layer (`config.py` in backend, `import.meta.env` in frontend) and validated with Pydantic settings or environment variables.

4. **ALWAYS Define Repeated Values in Enums or Constants Modules (DRY)**:
   - Statuses, severity levels, review states, event names, role types, error codes, and recurring UI options used in more than one location **must be defined exactly once** in a shared Enum or constants file.
   - **Python**: Use `enum.StrEnum` or `enum.Enum` (e.g., `ReviewJobStatusEnum`, `FindingSeverityEnum`).
   - **TypeScript**: Use `const` objects (`as const`) or string enums (e.g., `export const SEVERITY_LEVELS = [...] as const`).
   - Magic numbers (e.g., `86400`, `400`, `11.6`) and magic strings (e.g., `"open"`, `"critical"`, `"draft"`) scattered in logic are strictly prohibited.

5. **Strict Isolation of Test and Mock Data**:
   - Mock data, factories, and fixtures are permitted **ONLY** within dedicated test directories (`tests/`, `fixtures/`), database seed scripts, or Storybook files.
   - Production modules must **NEVER** import from test or mock directories.
   - If a developer explicitly requests temporary mock scaffolding during active development, isolate it in a dedicated file (e.g., `mock_analytics_data.ts`), mark it with `// TODO(TICKET-ID): Remove before merge`, and verify it is not reachable in production builds.

6. **Self-Audit Requirement**:
   - Before completing any task, commit, or pull request, search your own changes (`git diff`) for hardcoded numbers, synthetic strings, and inline objects. Remove or extract them immediately.

---

## Code Examples

### 1. Python (Configuration & Constants)
```python
# ❌ BAD: Hardcoded secrets, magic strings, and fake fallback list
def fetch_top_repositories():
    api_url = "https://api.github.com"  # Hardcoded URL!
    headers = {"Authorization": "Bearer ghp_fakeToken123456"}  # Leaked secret!
    
    response = httpx.get(f"{api_url}/orgs/nero/repos", headers=headers)
    if response.status_code != 200:
        # Hardcoded fake repos!
        return [{"name": "nero", "stars": 42}, {"name": "fastapi", "stars": 100}]
    return response.json()

# ✅ GOOD: Config-driven settings and single-source-of-truth Enums
class AppStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"

def fetch_top_repositories(settings: Settings = Depends(get_settings)) -> list[RepoSummary]:
    response = httpx.get(
        f"{settings.GITHUB_API_URL}/orgs/{settings.GITHUB_ORG}/repos",
        headers={"Authorization": f"Bearer {settings.GITHUB_TOKEN.get_secret_value()}"},
        timeout=settings.DEFAULT_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return [RepoSummary.model_validate(r) for r in response.json()]
```

### 2. TypeScript / React (UI Data & Enums)
```typescript
// ❌ BAD: Hardcoded chart points, magic string status, and default fallback metric
export const BugsChart = ({ data }: { data?: BugPoint[] }) => {
  // Hardcoded fallback data disguised as production UI
  const points = data && data.length > 0 ? data : [
    { date: "Nov 1", count: 12 },
    { date: "Nov 2", count: 18 }
  ];
  const severity = "critical"; // Magic string!

  return <BarChart data={points} />;
};

// ✅ GOOD: Typed constants, explicit empty states, and clean data flow
export const SEVERITY_OPTIONS = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export const BugsChart: React.FC<{ data: BugPoint[] | null }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <EmptyState message="No bug findings recorded for this timeframe" />;
  }
  return <BarChart data={data} />;
};
```
