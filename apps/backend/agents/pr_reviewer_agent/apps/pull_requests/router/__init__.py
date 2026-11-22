from fastapi import APIRouter

from .deps import get_pr_service
from .list_pr import router as list_pr_router
from .get_pr import router as get_pr_router
from .re_review import router as re_review_router
from .vote_finding import router as vote_finding_router

router = APIRouter(tags=["Pull Requests"])
router.include_router(list_pr_router)
router.include_router(get_pr_router)
router.include_router(re_review_router)
router.include_router(vote_finding_router)

__all__ = [
    "router",
    "get_pr_service",
    "list_pr_router",
    "get_pr_router",
    "re_review_router",
    "vote_finding_router",
]
