from fastapi import APIRouter, Depends, HTTPException, status

from apps.backend.shared.auth import UserPrincipal, get_current_user_from_token
from ..schema import FindingVoteRequest, FindingVoteResponse
from ..service import PullRequestService
from .deps import get_pr_service

router = APIRouter()


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
