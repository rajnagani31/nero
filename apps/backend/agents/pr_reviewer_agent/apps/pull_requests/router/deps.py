from fastapi import Depends
from sqlalchemy.orm import Session

from apps.backend.bot.application.core.database import get_db
from ..service import PullRequestService


def get_pr_service(db: Session = Depends(get_db)) -> PullRequestService:
    return PullRequestService(db)
