from typing import Any, Optional
from sqlalchemy.orm import Query
from .filters import BaseWorkspaceFilter


def apply_workspace_scope(
    query: Any,
    model: Any,
    filters: BaseWorkspaceFilter,
    date_field: str = "created_at",
    repo_field: str = "repo_id",
    author_field: str = "author",
) -> Any:
    """
    Applies common Level 1 workspace scope filters (repository, author, date range)
    to a SQLAlchemy query or select statement in a composable, safe way.
    """
    # 1. Repository filter
    if filters.repo_id is not None and hasattr(model, repo_field):
        query = query.filter(getattr(model, repo_field) == filters.repo_id)

    # 2. Author filter
    if filters.author and hasattr(model, author_field):
        query = query.filter(getattr(model, author_field) == filters.author)

    # 3. Date range filter
    start_dt, end_dt = filters.resolve_date_range()
    if start_dt is not None and hasattr(model, date_field):
        query = query.filter(getattr(model, date_field) >= start_dt)
    if end_dt is not None and hasattr(model, date_field):
        query = query.filter(getattr(model, date_field) <= end_dt)

    return query
