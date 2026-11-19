from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import or_, desc, func
from sqlalchemy.orm import Session

from apps.backend.shared.query_helpers import apply_workspace_scope
from .schema import (
    PRFilterParams,
    PullRequestSummaryResponse,
    PullRequestListResponse,
    PullRequestDetailResponse,
    FindingItem,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.pull_request import (
    PullRequest,
    PRStateEnum,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.repository import (
    Repository,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_job import (
    ReviewJob,
    ReviewJobStatusEnum,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_report import (
    ReviewReport,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_finding import (
    ReviewFinding,
)


def _format_time_ago(dt: Optional[datetime]) -> str:
    if not dt:
        return "recently"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return f"{seconds}s ago"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    if days < 30:
        return f"{days} days ago"
    months = days // 30
    return f"{months} months ago"


class PullRequestService:
    def __init__(self, db: Session):
        self.db = db

    def list_pull_requests(self, filters: PRFilterParams, user_id: Optional[int] = None) -> PullRequestListResponse:
        query = self.db.query(PullRequest)

        # Tenant/user scoping if specified
        if user_id is not None:
            query = query.filter(PullRequest.user_id == user_id)

        # 1. State filter
        if filters.state == "open":
            query = query.filter(PullRequest.state == PRStateEnum.OPEN)
        elif filters.state == "closed":
            query = query.filter(
                or_(
                    PullRequest.state == PRStateEnum.CLOSED,
                    PullRequest.state == PRStateEnum.MERGED,
                )
            )

        # 2. Level 1 Workspace filter (repo, author, date range)
        query = apply_workspace_scope(query, PullRequest, filters)

        # 3. Search filter
        if filters.search:
            search_pattern = f"%{filters.search.strip()}%"
            query = query.filter(
                or_(
                    PullRequest.title.ilike(search_pattern),
                    PullRequest.author.ilike(search_pattern),
                    PullRequest.description.ilike(search_pattern),
                )
            )

        total = query.count()

        # Ordering & pagination
        offset = (filters.page - 1) * filters.limit
        prs = (
            query.order_by(desc(PullRequest.created_at))
            .offset(offset)
            .limit(filters.limit)
            .all()
        )

        items: List[PullRequestSummaryResponse] = []
        for pr in prs:
            # Load repository details
            repo_name = None
            if pr.repo_id:
                repo = self.db.query(Repository).filter(Repository.id == pr.repo_id).first()
                if repo:
                    repo_name = repo.full_name or repo.repo_id

            # Load latest report
            latest_report = (
                self.db.query(ReviewReport)
                .filter(ReviewReport.pr_id == pr.id)
                .order_by(desc(ReviewReport.created_at))
                .first()
            )

            # Load latest job status
            latest_job = (
                self.db.query(ReviewJob)
                .filter(ReviewJob.pr_id == pr.id)
                .order_by(desc(ReviewJob.created_at))
                .first()
            )

            # Determine review status
            review_status = "Not reviewed"
            if pr.state == PRStateEnum.MERGED:
                review_status = "Merged"
            elif latest_job:
                if latest_job.status in (ReviewJobStatusEnum.QUEUED, ReviewJobStatusEnum.RUNNING):
                    review_status = "Reviewing…"
                elif latest_job.status == ReviewJobStatusEnum.SUCCEEDED:
                    review_status = "Draft"
                elif latest_job.status == ReviewJobStatusEnum.FAILED:
                    review_status = "Failed"

            # Derive confidence & impact
            confidence_score = None
            impact = "Low"
            findings_count = 0

            if latest_report:
                totals = latest_report.totals_json or {}
                findings_count = totals.get("total_findings", 0)
                risk_score = float(latest_report.risk_score or 0)

                if totals.get("critical", 0) > 0:
                    impact = "Critical"
                elif totals.get("high", 0) > 0:
                    impact = "High"
                elif totals.get("medium", 0) > 0:
                    impact = "Medium"

                if risk_score > 7:
                    confidence_score = "5/5"
                elif risk_score > 4:
                    confidence_score = "4/5"
                else:
                    confidence_score = "3/5"

            # Apply impact filter if requested
            if filters.impact and filters.impact != "all":
                if impact.lower() != filters.impact.lower():
                    continue

            items.append(
                PullRequestSummaryResponse(
                    id=pr.id,
                    pr_number=pr.pr_number or 0,
                    repo_id=pr.repo_id,
                    repo_name=repo_name,
                    title=pr.title,
                    description=pr.description,
                    author=pr.author,
                    state=pr.state.value if pr.state else "open",
                    source_branch=pr.source_branch,
                    target_branch=pr.target_branch,
                    url=pr.url,
                    created_at=pr.created_at,
                    time_ago=_format_time_ago(pr.created_at),
                    impact=impact,
                    review_status=review_status,
                    confidence_score=confidence_score,
                    findings_count=findings_count,
                )
            )

        return PullRequestListResponse(
            total=total,
            page=filters.page,
            limit=filters.limit,
            pull_requests=items,
        )

    def get_pull_request_detail(self, pr_id: int) -> Optional[PullRequestDetailResponse]:
        pr = self.db.query(PullRequest).filter(PullRequest.id == pr_id).first()
        if not pr:
            return None

        repo_name = None
        if pr.repo_id:
            repo = self.db.query(Repository).filter(Repository.id == pr.repo_id).first()
            if repo:
                repo_name = repo.full_name or repo.repo_id

        latest_report = (
            self.db.query(ReviewReport)
            .filter(ReviewReport.pr_id == pr.id)
            .order_by(desc(ReviewReport.created_at))
            .first()
        )

        findings_list: List[FindingItem] = []
        totals = {}
        risk_score = None
        confidence_score = None
        impact = "Low"

        if latest_report:
            totals = latest_report.totals_json or {}
            risk_score = float(latest_report.risk_score or 0)
            if risk_score > 7:
                confidence_score = "5/5"
            elif risk_score > 4:
                confidence_score = "4/5"
            else:
                confidence_score = "3/5"

            if totals.get("critical", 0) > 0:
                impact = "Critical"
            elif totals.get("high", 0) > 0:
                impact = "High"
            elif totals.get("medium", 0) > 0:
                impact = "Medium"

            # Load findings for report
            stored_votes = (latest_report.model_info_json or {}).get("finding_votes", {})
            raw_findings = (
                self.db.query(ReviewFinding)
                .filter(ReviewFinding.report_id == latest_report.id)
                .order_by(ReviewFinding.id)
                .all()
            )

            for f in raw_findings:
                f_votes = stored_votes.get(str(f.id), {})
                findings_list.append(
                    FindingItem(
                        id=f.id,
                        report_id=f.report_id,
                        file_path=f.file_path,
                        line_start=f.line_start,
                        line_end=f.line_end,
                        severity=f.severity.value if f.severity else "medium",
                        category=f.category.value if f.category else "other",
                        title=f.title,
                        summary=f.summary,
                        recommendation=f.recommendation,
                        helpful_votes=f_votes.get("helpful", 0),
                        unhelpful_votes=f_votes.get("unhelpful", 0),
                        created_at=f.created_at,
                    )
                )

        review_status = "Draft" if latest_report else "Not reviewed"
        if pr.state == PRStateEnum.MERGED:
            review_status = "Merged"

        return PullRequestDetailResponse(
            id=pr.id,
            pr_number=pr.pr_number or 0,
            repo_id=pr.repo_id,
            repo_name=repo_name,
            title=pr.title,
            description=pr.description,
            author=pr.author,
            state=pr.state.value if pr.state else "open",
            source_branch=pr.source_branch,
            target_branch=pr.target_branch,
            url=pr.url,
            created_at=pr.created_at,
            time_ago=_format_time_ago(pr.created_at),
            impact=impact,
            review_status=review_status,
            confidence_score=confidence_score,
            risk_score=risk_score,
            findings=findings_list,
            totals=totals,
        )

    def trigger_re_review(self, pr_id: int) -> Optional[int]:
        pr = self.db.query(PullRequest).filter(PullRequest.id == pr_id).first()
        if not pr:
            return None

        new_job = ReviewJob(
            pr_id=pr.id,
            status=ReviewJobStatusEnum.QUEUED,
            reviewed_commit_sha=pr.commit_sha,
            queued_at=datetime.now(timezone.utc),
        )
        self.db.add(new_job)
        self.db.commit()
        self.db.refresh(new_job)

        # Dispatch Celery task safely
        try:
            from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks import (
                review_pull_request,
            )
            review_pull_request.delay(new_job.id)
        except Exception as e:
            print(f"[PullRequestService] Celery dispatch error: {e}")

        return new_job.id

    def vote_finding(self, finding_id: int, vote: str) -> bool:
        finding = self.db.query(ReviewFinding).filter(ReviewFinding.id == finding_id).first()
        if not finding:
            return False

        report = self.db.query(ReviewReport).filter(ReviewReport.id == finding.report_id).first()
        if not report:
            return False

        model_info = dict(report.model_info_json or {})
        votes = model_info.setdefault("finding_votes", {})
        finding_vote = votes.setdefault(str(finding_id), {"helpful": 0, "unhelpful": 0})

        if vote == "helpful":
            finding_vote["helpful"] = finding_vote.get("helpful", 0) + 1
        elif vote == "not_helpful":
            finding_vote["unhelpful"] = finding_vote.get("unhelpful", 0) + 1

        report.model_info_json = model_info
        self.db.commit()
        return True
