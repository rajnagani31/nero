from fastapi import Depends
from sqlalchemy.orm import Session

from apps.backend.bot.application.core.database import get_db
from ..service import AnalyticsService


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)
