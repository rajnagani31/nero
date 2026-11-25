from fastapi import APIRouter

from .deps import get_analytics_service
from .stats import router as stats_router
from .charts import router as charts_router
from .export import router as export_router

router = APIRouter(tags=["Analytics"])
router.include_router(stats_router)
router.include_router(charts_router)
router.include_router(export_router)

__all__ = [
    "router",
    "get_analytics_service",
    "stats_router",
    "charts_router",
    "export_router",
]
