from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel, Field


class BaseWorkspaceFilter(BaseModel):
    """
    Reusable workspace scope filter (Level 1).
    Inherited by PRs, Analytics, and all future dashboard modules.
    """
    repo_id: Optional[int] = Field(None, description="Filter by repository ID")
    team_id: Optional[str] = Field(None, description="Filter by team identifier")
    author: Optional[str] = Field(None, description="Filter by author username")
    period: Optional[str] = Field("month", description="Time period shortcut: week | month | last_month | all")
    from_date: Optional[datetime] = Field(None, description="Explicit start datetime (UTC)")
    to_date: Optional[datetime] = Field(None, description="Explicit end datetime (UTC)")

    def resolve_date_range(self) -> tuple[Optional[datetime], Optional[datetime]]:
        """
        Compute concrete (start_datetime, end_datetime) based on explicit dates or period shortcut.
        """
        now = datetime.now(timezone.utc)
        if self.from_date or self.to_date:
            return self.from_date, self.to_date

        if self.period == "week":
            return now - timedelta(days=7), now
        elif self.period == "month":
            return now - timedelta(days=30), now
        elif self.period == "last_month":
            start_last_month = now - timedelta(days=60)
            end_last_month = now - timedelta(days=30)
            return start_last_month, end_last_month
        elif self.period == "all":
            return None, None
        return now - timedelta(days=30), now
