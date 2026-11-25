from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from apps.backend.shared.filters import BaseWorkspaceFilter


class PRFilterParams(BaseWorkspaceFilter):
    """
    Level 2 Pull Request query parameters.
    """
    state: str = Field("open", description="Filter by PR state: open | closed | all")
    search: Optional[str] = Field(None, description="Search keyword in PR title, author, or description")
    impact: Optional[str] = Field(None, description="Filter by impact level: low | medium | high | critical | all")
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(20, ge=1, le=100, description="Items per page")


class FindingItem(BaseModel):
    id: int
    report_id: int
    file_path: str
    line_start: int
    line_end: Optional[int] = None
    severity: str
    category: str
    title: str
    summary: Optional[str] = None
    recommendation: Optional[str] = None
    helpful_votes: int = 0
    unhelpful_votes: int = 0
    created_at: Optional[datetime] = None


class FindingVoteRequest(BaseModel):
    vote: str = Field(..., description="'helpful' or 'not_helpful'")


class FindingVoteResponse(BaseModel):
    success: bool
    finding_id: int
    vote: str
    message: str


class PullRequestSummaryResponse(BaseModel):
    id: int
    pr_number: int
    repo_id: Optional[int] = None
    repo_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    author: Optional[str] = None
    state: str
    source_branch: Optional[str] = None
    target_branch: Optional[str] = None
    url: Optional[str] = None
    created_at: Optional[datetime] = None
    time_ago: Optional[str] = None
    impact: Optional[str] = None
    review_status: str = "Not reviewed"
    confidence_score: Optional[str] = None
    findings_count: int = 0


class PullRequestListResponse(BaseModel):
    total: int
    page: int
    limit: int
    pull_requests: List[PullRequestSummaryResponse]


class PullRequestDetailResponse(BaseModel):
    id: int
    pr_number: int
    repo_id: Optional[int] = None
    repo_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    author: Optional[str] = None
    state: str
    source_branch: Optional[str] = None
    target_branch: Optional[str] = None
    url: Optional[str] = None
    created_at: Optional[datetime] = None
    time_ago: Optional[str] = None
    impact: Optional[str] = None
    review_status: str
    confidence_score: Optional[str] = None
    risk_score: Optional[float] = None
    findings: List[FindingItem] = []
    totals: dict = {}
