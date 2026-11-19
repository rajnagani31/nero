from fastapi import APIRouter, Depends, HTTPException, status

from apps.backend.shared.auth import UserPrincipal, get_current_user_from_token
from ..service import PullRequestService
from .deps import get_pr_service

router = APIRouter()


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
