from datetime import datetime, timezone, timedelta
import pytest
from apps.backend.shared.filters import BaseWorkspaceFilter
from apps.backend.shared.query_helpers import apply_workspace_scope


class MockQuery:
    def __init__(self):
        self.filters = []

    def filter(self, expr):
        self.filters.append(expr)
        return self


class MockModel:
    repo_id = "mock_repo_id"
    author = "mock_author"
    created_at = "mock_created_at"


def test_base_workspace_filter_period_resolution():
    # Week
    filter_week = BaseWorkspaceFilter(period="week")
    start, end = filter_week.resolve_date_range()
    assert start is not None
    assert end is not None
    assert (end - start).days == 7

    # Month
    filter_month = BaseWorkspaceFilter(period="month")
    start, end = filter_month.resolve_date_range()
    assert (end - start).days == 30

    # Explicit dates take precedence
    d1 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    d2 = datetime(2026, 1, 15, tzinfo=timezone.utc)
    filter_explicit = BaseWorkspaceFilter(from_date=d1, to_date=d2, period="week")
    start, end = filter_explicit.resolve_date_range()
    assert start == d1
    assert end == d2


def test_apply_workspace_scope():
    q = MockQuery()
    filters = BaseWorkspaceFilter(repo_id=42, author="rajnagani31", period="all")

    result = apply_workspace_scope(q, MockModel, filters)
    assert len(result.filters) == 2
