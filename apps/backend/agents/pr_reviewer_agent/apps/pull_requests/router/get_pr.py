from fastapi import APIRouter, Depends, HTTPException, status

from apps.backend.shared.auth import UserPrincipal, get_current_user_from_token
from ..schema import PullRequestDetailResponse
from ..service import PullRequestService
from .deps import get_pr_service

router = APIRouter()


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
