from fastapi import APIRouter, Depends, Response

from apps.backend.shared.auth import UserPrincipal, get_current_user_from_token
from ..schema import AnalyticsFilterParams
from ..service import AnalyticsService
from .deps import get_analytics_service

router = APIRouter()


@router.get("/analytics/export")
async def export_analytics_csv(
    filters: AnalyticsFilterParams = Depends(),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: UserPrincipal = Depends(get_current_user_from_token),
):
    """
    Export reviewed PR and caught bugs dataset in CSV format.
    """
    csv_data = service.generate_csv_export(filters)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=analytics.csv"},
    )
