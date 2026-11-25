from fastapi import APIRouter, Depends

from apps.backend.shared.auth import UserPrincipal, get_current_user_from_token
from ..schema import AnalyticsFilterParams, AnalyticsStatsResponse
from ..service import AnalyticsService
from .deps import get_analytics_service

router = APIRouter()


@router.get("/analytics/stats", response_model=AnalyticsStatsResponse)
async def get_analytics_stats(
    filters: AnalyticsFilterParams = Depends(),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: UserPrincipal = Depends(get_current_user_from_token),
):
    """
    Retrieve top-level KPI metrics (Total PRs, Reviews, Avg Merge Time, Bugs Caught).
    """
    return service.get_stats(filters)
