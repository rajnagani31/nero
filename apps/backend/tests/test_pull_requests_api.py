from datetime import datetime, timezone
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from apps.backend.agents.pr_reviewer_agent.apps.pull_requests.router import (
    router as pr_router,
    get_pr_service,
)
from apps.backend.agents.pr_reviewer_agent.apps.pull_requests.schema import (
    PullRequestListResponse,
    PullRequestSummaryResponse,
    PullRequestDetailResponse,
    FindingItem,
)
from apps.backend.shared.auth import get_current_user_from_token, UserPrincipal

app = FastAPI()
app.include_router(pr_router, prefix="/api")

# Mock user dependency
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


def test_list_pull_requests_success(client):
    mock_service = MagicMock()
    mock_service.list_pull_requests.return_value = PullRequestListResponse(
        total=1,
        page=1,
        limit=20,
        pull_requests=[
            PullRequestSummaryResponse(
                id=11,
                pr_number=11,
                repo_name="fastapi",
                title="test nero ai ai-engin",
                state="open",
                impact="Low",
                review_status="Draft",
                confidence_score="5/5",
                findings_count=2,
            )
        ],
    )
    app.dependency_overrides[get_pr_service] = lambda: mock_service

    response = client.get("/api/pull-requests?state=open")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["pull_requests"][0]["pr_number"] == 11
    assert data["pull_requests"][0]["confidence_score"] == "5/5"


def test_get_pull_request_detail_found(client):
    mock_service = MagicMock()
    mock_service.get_pull_request_detail.return_value = PullRequestDetailResponse(
        id=11,
        pr_number=11,
        repo_name="fastapi",
        title="test nero ai ai-engin",
        state="open",
        impact="Low",
        review_status="Draft",
        confidence_score="5/5",
        findings=[
            FindingItem(
                id=101,
                report_id=1,
                file_path="engine/config.py",
                line_start=14,
                severity="medium",
                category="bug",
                title="Missing null check",
                recommendation="Add check",
            )
        ],
    )
    app.dependency_overrides[get_pr_service] = lambda: mock_service

    response = client.get("/api/pull-requests/11")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 11
    assert len(data["findings"]) == 1
    assert data["findings"][0]["severity"] == "medium"


def test_get_pull_request_detail_not_found(client):
    mock_service = MagicMock()
    mock_service.get_pull_request_detail.return_value = None
    app.dependency_overrides[get_pr_service] = lambda: mock_service

    response = client.get("/api/pull-requests/999")
    assert response.status_code == 404


def test_trigger_re_review_success(client):
    mock_service = MagicMock()
    mock_service.trigger_re_review.return_value = 5001
    app.dependency_overrides[get_pr_service] = lambda: mock_service

    response = client.post("/api/pull-requests/11/re-review")
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "queued"
    assert data["review_job_id"] == 5001


def test_vote_on_finding_success(client):
    mock_service = MagicMock()
    mock_service.vote_finding.return_value = True
    app.dependency_overrides[get_pr_service] = lambda: mock_service

    response = client.post("/api/findings/101/vote", json={"vote": "helpful"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["vote"] == "helpful"


def test_vote_on_finding_invalid_vote(client):
    mock_service = MagicMock()
    app.dependency_overrides[get_pr_service] = lambda: mock_service

    response = client.post("/api/findings/101/vote", json={"vote": "invalid_vote"})
    assert response.status_code == 400
