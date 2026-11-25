---
name: write-clean-code
description: >-
  Clean, reusable, and well-structured code standards. Use when creating or changing a backend feature,
  service, API endpoint, worker, schema, or frontend module. Enforces single-responsibility, DRY, OOP
  principles, typed data (Pydantic/TypeScript), and quality habits.
---

# Write Clean, Reusable, Well-Structured Code

This skill defines the engineering standards and patterns required across the entire codebase (FastAPI backend, Celery workers, and React frontend). Load and follow this skill whenever creating or refactoring features, services, endpoints, or UI modules.

---

## 1. Folder and File Structure

Always organize code into distinct, single-responsibility layers. Keep layers strictly separated:

* **`router/`**: Thin HTTP presentation layer. Defines endpoints, validates query/body parameters via Pydantic, and delegates immediately to a service. **NEVER put business logic, database queries, or AI calls inside a router.**
* **`service/`**: Pure business logic orchestration. Manages workflows, enforces business rules, coordinates repositories, and calls AI/external clients.
* **`repository/`**: Database access layer. Encapsulates SQLAlchemy queries, updates, transactions, and vector operations.
* **`schema/`**: Pydantic models for API request bodies, query parameters, and JSON response serialization.
* **`model/`**: SQLAlchemy ORM table definitions.
* **`core/`**: Central configuration, exceptions, enums, and foundational utilities.
* **`tasks/`**: Celery background tasks and asynchronous job definitions.

### Canonical Feature Directory Layout
```text
apps/backend/agents/pr_reviewer_agent/apps/<feature_domain>/
├── router/
│   ├── __init__.py
│   ├── list_<feature>.py       # One endpoint or closely grouped endpoints per file
│   └── get_<feature>.py
├── service/
│   ├── __init__.py
│   └── <feature>_service.py     # Pure business logic
├── repository/
│   ├── __init__.py
│   └── <feature>_repository.py  # SQLAlchemy queries & DB mutations
├── schema/
│   ├── __init__.py
│   └── <feature>_schema.py      # Request/response Pydantic models
├── model/
│   ├── __init__.py
│   └── <feature>_model.py       # SQLAlchemy ORM declarations
└── tests/
    └── test_<feature>_service.py
```

---

## 2. Reuse & DRY (Don't Repeat Yourself)

1. **Centralize Shared Values**:
   Any string, status, route path, severity level, or error code that appears more than once must be declared in a central module and imported everywhere (see [Rule 2: No Hardcoded Data](../rules/no-hardcoded-data.md)).
   ```python
   # apps/backend/shared/constants.py or core/enums.py
   from enum import StrEnum

   class ReviewJobStatusEnum(StrEnum):
       QUEUED = "queued"
       RUNNING = "running"
       SUCCEEDED = "succeeded"
       FAILED = "failed"
   ```
2. **Search Before Writing**:
   Before implementing a utility function (e.g., date parsing, diff analysis, workspace scoping), search the repository (`apps/backend/shared/` or `apps/frontend/src/utils/`). Reuse existing utilities instead of copying and pasting variants.

---

## 3. Pragmatic Object-Oriented Design

Use object-oriented design where it clarifies state and behavior, avoiding premature over-engineering:

1. **Encapsulation**:
   - Keep internal helper methods private with a leading underscore (`def _calculate_lead_time(...)`).
   - Expose behavior via explicit public methods on service classes.
   - Use `@property` for derived, read-only attributes that do not perform heavy I/O.
2. **Interfaces & Polymorphism (ABC / Protocol)**:
   - When multiple implementations share a contract (e.g., LLM providers, notification dispatchers, diff parsers), define an `abc.ABC` with `@abstractmethod` or a `typing.Protocol`.
   - Prefer composition over deep inheritance hierarchies.
3. **Data Classes**:
   - Use `@dataclass(frozen=True, slots=True)` for lightweight, immutable in-memory value objects.
   - Use `@classmethod` for alternative constructors (e.g., `from_db_model(...)`, `from_github_payload(...)`).
   - Use `@staticmethod` only for pure, deterministic helper functions that do not access `self` or `cls`.
4. **Dependency Injection**:
   - Use FastAPI's `Depends()` to inject database sessions and service instances into routers. This allows 100% isolated unit testing via mocks.
5. **When NOT to Use a Class**:
   - If a utility is a pure, stateless mathematical or formatting function (e.g., `format_time_ago(dt)`), keep it as a standalone, top-level function. Do not wrap stateless functions in artificial single-method "Manager" or "Helper" classes.

---

## 4. Typed Data Over Raw Dictionaries

Passing raw dictionaries around creates invisible bugs, type drift, and broken contracts:

1. **API Boundaries**: **Always** use Pydantic models for incoming requests and outgoing responses.
2. **Internal Domain Models**: Use Pydantic or `@dataclass`. Never pass arbitrary `dict[str, Any]` across service boundaries.
3. **TypedDict Constraint**: Use `TypedDict` **only** when interfacing with third-party libraries that mandate dict shapes (e.g., LangGraph state).
4. **Type Annotations**:
   - Write complete Python 3.12+ type annotations (`int | None`, `list[str]`, `dict[str, UserItem]`).
   - Ensure clean verification under type checkers (`mypy` / `pyright`).
5. **Frontend Equivalence**:
   - Declare strict TypeScript `interface` or `type` definitions mirroring backend schemas.
   - **Never** use `any`. Use `unknown` with a type guard if the schema is genuinely dynamic.
   - Keep all API client functions strictly typed: `async function fetchStats(): Promise<AnalyticsStats>`.

---

## 5. Quality Habits & Pre-Completion Checklist

Always verify these standards before marking any task as complete:

* [ ] **Layer Integrity**: Are routers thin and free of direct SQL/ORM queries?
* [ ] **No Silent Fallbacks**: Does the code surface failures explicitly rather than hiding them behind fake defaults? (See [Rule 1: No Silent Fallbacks](../rules/no-silent-fallbacks.md))
* [ ] **No Hardcoded Values**: Are all statuses, limits, and magic strings extracted to Enums/constants? (See [Rule 2: No Hardcoded Data](../rules/no-hardcoded-data.md))
* [ ] **Zero Raw Dicts**: Are all function signatures, requests, and responses explicitly typed?
* [ ] **Error Handling**: Are custom, typed domain exceptions used instead of generic exceptions?
* [ ] **Single Responsibility**: Does each file and class have one clear, well-defined purpose?
* [ ] **Automated Tests**: Are unit or integration tests included alongside the new behavior?

---

## 6. Before / After Architecture Example

### ❌ BEFORE (Messy, Untyped, Silent Fallback)
```python
# router/analytics.py - Bloated router, raw dicts, magic strings, and silent fallback
@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    try:
        data = db.execute("SELECT count(*) as total, status FROM review_jobs GROUP BY status").fetchall()
        result = {}
        for row in data:
            result[row["status"]] = row["total"]
        return result
    except Exception:
        # Silent fallback + hardcoded mock data!
        return {"succeeded": 10, "failed": 2}
```

### ✅ AFTER (Clean, Layered, Typed, Explicit)
```python
# schema/analytics_schema.py
class JobStatusMetrics(BaseModel):
    succeeded_count: int
    failed_count: int

# core/exceptions.py
class AnalyticsQueryError(Exception):
    """Raised when analytics aggregation fails."""

# service/analytics_service.py
class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_job_metrics(self) -> JobStatusMetrics:
        try:
            counts = (
                self.db.query(ReviewJob.status, func.count(ReviewJob.id))
                .group_by(ReviewJob.status)
                .all()
            )
            data_map = dict(counts)
            return JobStatusMetrics(
                succeeded_count=data_map.get(ReviewJobStatusEnum.SUCCEEDED, 0),
                failed_count=data_map.get(ReviewJobStatusEnum.FAILED, 0),
            )
        except SQLAlchemyError as exc:
            logger.error("Failed to query job metrics: %s", exc, exc_info=True)
            raise AnalyticsQueryError("Database aggregation failed") from exc

# router/get_stats.py
@router.get("/stats", response_model=JobStatusMetrics)
def get_stats(service: AnalyticsService = Depends(get_analytics_service)) -> JobStatusMetrics:
    return service.get_job_metrics()
```
