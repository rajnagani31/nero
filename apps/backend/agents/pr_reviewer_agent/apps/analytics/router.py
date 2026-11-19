from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from apps.backend.bot.application.core.database import get_db
from apps.backend.shared.auth import UserPrincipal, get_current_user_from_token
from .schema import (
    AnalyticsFilterParams,
    AnalyticsStatsResponse,
    AnalyticsChartsResponse,
)
from .service import AnalyticsService

router = APIRouter(tags=["Analytics"])


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)


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
