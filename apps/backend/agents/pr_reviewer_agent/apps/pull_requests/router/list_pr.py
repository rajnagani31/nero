from fastapi import APIRouter, Depends

from apps.backend.shared.auth import UserPrincipal, get_current_user_from_token
from ..schema import PRFilterParams, PullRequestListResponse
from ..service import PullRequestService
from .deps import get_pr_service

router = APIRouter()


@router.get("/pull-requests", response_model=PullRequestListResponse)
async def list_pull_requests(
    filters: PRFilterParams = Depends(),
    service: PullRequestService = Depends(get_pr_service),
    current_user: UserPrincipal = Depends(get_current_user_from_token),
):
    """
    List pull requests filtered by state, repository, search query, or impact.
    """
    return service.list_pull_requests(filters=filters, user_id=None)
