"""
Model registry for PR Reviewer Agent
"""

# Import Base from centralized database module
from apps.backend.bot.application.core.database import Base

# Import all PR reviewer models to register them with SQLAlchemy
from .artifact_ref import ArtifactRef, ArtifactTypeEnum
from .pull_request import PullRequest, PRStateEnum
from .review_finding import ReviewFinding, FindingSeverityEnum
from .review_file_result import ReviewFileResult
from .review_job import ReviewJob, ReviewJobStatusEnum
from .review_report import ReviewReport
from .repository import Repository
from .github_installation import GitHubInstallation
# Export Base for Alembic
__all__ = ['Base']
