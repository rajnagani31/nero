from pydantic import BaseModel
from datetime import datetime
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_job import (
    ReviewJobStatusEnum,
)


class ReviewJobData(BaseModel):
    """
     {
    "id": 1001,
    "pr_id": 25,
    "status": "queued",
    "attempts": 0,
    "queued_at": "2026-07-19T10:00:00Z"
    }
    """

    status: ReviewJobStatusEnum
    attempts: int
    total_files: int = 0
    processed_files: int = 0
    queued_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error_code: str | None = None
    base_sha: str | None = None
    head_sha: str | None = None


class PullRequestData(BaseModel):
    repo_id: int
    installation_id: int | None = None
    github_account_id: int | None = None
    pr_number: int
    commit_sha: str
    author: str
    state: str
    title: str
    description: str | None
    source_branch: str
    target_branch: str
    url: str
    closed_at: datetime | None
    merged_at: datetime | None
    full_name: str | None = None
    owner: str | None = None
    default_branch: str | None = None
    pr_action: str
    review_job: ReviewJobData | None = None


class PullRequestFile(BaseModel):
    sha: str | None = None
    filename: str
    status: str
    additions: int = 0
    deletions: int = 0
    changes: int = 0
    blob_url: str | None = None
    raw_url: str | None = None
    contents_url: str | None = None
    patch: str | None = None
    previous_filename: str | None = None


class GitHubInstallUrlResponse(BaseModel):
    url: str


class RepositoryResponse(BaseModel):
    id: int
    repo_id: int | None = None
    installation_id: int | None = None
    github_account_id: int | None = None
    user_id: int | None = None
    full_name: str
    owner: str
    default_branch: str | None = None
    is_private: bool = False
    is_active: bool = True
    is_deleted: bool = False

