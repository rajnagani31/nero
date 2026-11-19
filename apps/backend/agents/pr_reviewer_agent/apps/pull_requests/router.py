from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from apps.backend.bot.application.core.database import get_db
from apps.backend.shared.auth import UserPrincipal, get_current_user_from_token
from .schema import (
    PRFilterParams,
    PullRequestListResponse,
    PullRequestDetailResponse,
    FindingVoteRequest,
    FindingVoteResponse,
)
from .service import PullRequestService

router = APIRouter(tags=["Pull Requests"])


def get_pr_service(db: Session = Depends(get_db)) -> PullRequestService:
    return PullRequestService(db)


@router.get("/pull-requests", response_model=PullRequestListResponse)
async def list_pull_requests(
    filters: PRFilterParams = Depends(),
    service: PullRequestService = Depends(get_pr_service),
    current_user: UserPrincipal = Depends(get_current_user_from_token),
):
    """
    List pull requests filtered by state, repository, search query, or impact.
    """
    # Note: user_id scoping is optional depending on whether repos are workspace-wide
    return service.list_pull_requests(filters=filters, user_id=None)


@router.get("/pull-requests/{pr_id}", response_model=PullRequestDetailResponse)
async def get_pull_request(
    pr_id: int,
    service: PullRequestService = Depends(get_pr_service),
    current_user: UserPrincipal = Depends(get_current_user_from_token),
):
    """
    Retrieve full PR metadata, review findings, risk score, and confidence ratings.
    """
    detail = service.get_pull_request_detail(pr_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pull request with ID {pr_id} not found",
        )
    return detail


@router.post("/pull-requests/{pr_id}/re-review", status_code=status.HTTP_202_ACCEPTED)
async def trigger_re_review(
    pr_id: int,
    service: PullRequestService = Depends(get_pr_service),
    current_user: UserPrincipal = Depends(get_current_user_from_token),
):
    """
    Trigger an on-demand re-review for a pull request by queuing a new background ReviewJob.
    """
    job_id = service.trigger_re_review(pr_id)
    if not job_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot re-review: Pull request with ID {pr_id} not found",
        )
    return {
        "status": "queued",
        "pr_id": pr_id,
        "review_job_id": job_id,
        "message": f"Re-review queued successfully for PR #{pr_id}",
    }


@router.post("/findings/{finding_id}/vote", response_model=FindingVoteResponse)
@router.post("/pull-requests/findings/{finding_id}/vote", response_model=FindingVoteResponse)
async def vote_on_finding(
    finding_id: int,
    payload: FindingVoteRequest,
    service: PullRequestService = Depends(get_pr_service),
    current_user: UserPrincipal = Depends(get_current_user_from_token),
):
    """
    Save helpful or not helpful feedback on a specific AI review finding.
    """
    if payload.vote not in ("helpful", "not_helpful"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vote must be either 'helpful' or 'not_helpful'",
        )

    success = service.vote_finding(finding_id, payload.vote)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review finding with ID {finding_id} not found",
        )

    return FindingVoteResponse(
        success=True,
        finding_id=finding_id,
        vote=payload.vote,
        message="Feedback saved successfully",
    )
