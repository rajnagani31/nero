from fastapi import APIRouter, Depends

from apps.backend.shared.auth import UserPrincipal, get_current_user_from_token
from ..schema import AnalyticsFilterParams, AnalyticsChartsResponse
from ..service import AnalyticsService
from .deps import get_analytics_service

router = APIRouter()


@router.get("/analytics/charts", response_model=AnalyticsChartsResponse)
async def get_analytics_charts(
    filters: AnalyticsFilterParams = Depends(),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: UserPrincipal = Depends(get_current_user_from_token),
):
    """
    Retrieve timeseries datasets for the 6 interactive dashboard panels.
    """
    return service.get_charts(filters)
