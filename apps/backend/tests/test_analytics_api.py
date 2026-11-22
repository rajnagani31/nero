import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from apps.backend.agents.pr_reviewer_agent.apps.analytics.router import (
    router as analytics_router,
    get_analytics_service,
)
from apps.backend.agents.pr_reviewer_agent.apps.analytics.schema import (
    AnalyticsStatsResponse,
    AnalyticsChartsResponse,
    CommentRatingsData,
)
from apps.backend.shared.auth import get_current_user_from_token, UserPrincipal

app = FastAPI()
app.include_router(analytics_router, prefix="/api")

def mock_get_current_user():
    return UserPrincipal(
        id=1,
        email="test@example.com",
        name="Test User",
        is_authenticated=True,
    )

app.dependency_overrides[get_current_user_from_token] = mock_get_current_user


@pytest.fixture
def client():
    return TestClient(app)


def test_get_analytics_stats(client):
    mock_service = MagicMock()
    mock_service.get_stats.return_value = AnalyticsStatsResponse(
        total_prs=2,
        total_reviews=5,
        avg_merge_time_days=11.6,
        avg_merge_time_display="11.6d",
        bugs_caught=17,
        bugs_caught_repos_count=2,
    )
    app.dependency_overrides[get_analytics_service] = lambda: mock_service

    response = client.get("/api/analytics/stats?period=month")
    assert response.status_code == 200
    data = response.json()
    assert data["total_prs"] == 2
    assert data["total_reviews"] == 5
    assert data["avg_merge_time_display"] == "11.6d"
    assert data["bugs_caught"] == 17


def test_get_analytics_charts(client):
    mock_service = MagicMock()
    mock_service.get_charts.return_value = AnalyticsChartsResponse(
        period="month",
        group_by="day",
        prs_reviewed={"series": [], "top_repos": []},
        bugs_caught={"series": [], "top_repos": [], "severity": {}},
        avg_merge_time={"series": [], "top_repos": []},
        top_contributors={"series": [], "contributors": []},
        addressed_rate={"series": [], "top_repos": []},
        comment_ratings=CommentRatingsData(upvotes=0, downvotes=0, most_upvoted_comments=[]),
    )
    app.dependency_overrides[get_analytics_service] = lambda: mock_service

    response = client.get("/api/analytics/charts?period=month&group_by=day")
    assert response.status_code == 200
    data = response.json()
    assert data["period"] == "month"
    assert "prs_reviewed" in data
    assert "bugs_caught" in data


def test_export_analytics_csv(client):
    mock_service = MagicMock()
    mock_service.generate_csv_export.return_value = "PR ID,PR Number,Title\n1,10,Fix bug\n"
    app.dependency_overrides[get_analytics_service] = lambda: mock_service

    response = client.get("/api/analytics/export?period=month")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=analytics.csv" in response.headers["content-disposition"]
    assert "PR ID,PR Number,Title" in response.text
