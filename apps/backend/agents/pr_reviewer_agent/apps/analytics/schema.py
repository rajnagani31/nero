from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from apps.backend.shared.filters import BaseWorkspaceFilter


class AnalyticsFilterParams(BaseWorkspaceFilter):
    """
    Level 2 Analytics query parameters.
    """
    tab: str = Field("pr", description="Sub-tab filter: 'pr' for PR Reviews, 'bug' for Bugs Caught")
    group_by: str = Field("day", description="'day' or 'week'")


class AnalyticsStatsResponse(BaseModel):
    total_prs: int = 0
    total_reviews: int = 0
    avg_merge_time_days: float = 0.0
    avg_merge_time_display: str = "0d"
    bugs_caught: int = 0
    bugs_caught_repos_count: int = 0
    prs_delta_pct: str = "±0%"
    reviews_delta_pct: str = "±0%"
    merge_time_delta_pct: str = "-56%"
    addressed_rate_pct: int = 96


class ChartPoint(BaseModel):
    date: str
    label: str
    value: float


class RepoMetricItem(BaseModel):
    repo_name: str
    value: float
    unit: str = ""


class ContributorMetricItem(BaseModel):
    name: str
    handle: str
    merged_prs: int


class SeverityBreakdown(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class CommentRatingsData(BaseModel):
    upvotes: int = 0
    downvotes: int = 0
    most_upvoted_comments: List[Dict[str, Any]] = []


class AnalyticsChartsResponse(BaseModel):
    period: str
    group_by: str
    prs_reviewed: Dict[str, Any]
    bugs_caught: Dict[str, Any]
    avg_merge_time: Dict[str, Any]
    top_contributors: Dict[str, Any]
    addressed_rate: Dict[str, Any]
    comment_ratings: CommentRatingsData
