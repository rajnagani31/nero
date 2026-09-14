from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.pull_request import (
    PullRequest,
)
from sqlalchemy import select
from sqlalchemy import case, func, update
from sqlalchemy.dialects.postgresql import insert
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.repository import (
    Repository,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.pr_schema import (
    PullRequestData,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_job import (
    ReviewJob,
    ReviewJobStatusEnum,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.model.review_file_result import (
    ReviewFileResult,
)


class CodeReviewRepository:
    def __init__(self, session_factory):
        self.session_factory = session_factory

    def save_pull_request(self, pr_data: PullRequestData):
        session = self.session_factory()

        try:
            # breakpoint()
            repo = self.get_or_create_repository(session, pr_data)
            repo_id = repo.id
            pr_number = pr_data.pr_number
            pr = self.get_pull_request(session, repo_id, pr_number)

            if pr:
                pr.commit_sha = pr_data.commit_sha
                pr.state = pr_data.state
                pr.title = pr_data.title
                pr.pr_action = pr_data.pr_action
                pr.description = pr_data.description
                pr.closed_at = pr_data.closed_at
                pr.merged_at = pr_data.merged_at

            else:

                pr = PullRequest(
                    repo_id=repo.id,
                    pr_number=pr_data.pr_number,
                    commit_sha=pr_data.commit_sha,
                    author=pr_data.author,
                    state=pr_data.state,
                    pr_action=pr_data.pr_action,
                    title=pr_data.title,
                    description=pr_data.description,
                    source_branch=pr_data.source_branch,
                    target_branch=pr_data.target_branch,
                    url=pr_data.url,
                    closed_at=pr_data.closed_at,
                    merged_at=pr_data.merged_at,
                )

                session.add(pr)
                session.flush()

            if pr_data.review_job is not None:
                review_job = ReviewJob(
                    pr_id=pr.id,
                    status=pr_data.review_job.status,
                    attempts=pr_data.review_job.attempts,
                    total_files=pr_data.review_job.total_files,
                    processed_files=pr_data.review_job.processed_files,
                    queued_at=pr_data.review_job.queued_at,
                    base_sha=pr_data.review_job.base_sha,
                    head_sha=pr_data.review_job.head_sha,
                )
                session.add(review_job)

            session.commit()
            session.refresh(pr)
            return pr

        except Exception:
            session.rollback()
            raise

        finally:
            session.close()

    def save_installation_repositories(self, payload: dict):
        session = self.session_factory()

        try:
            installation = payload.get("installation") or {}
            installation_id = installation.get("id")
            account = installation.get("account") or {}
            github_account_id = account.get("id")
            repositories = (
                payload.get("repositories") or payload.get("repositories_added") or []
            )
            repositories_removed = payload.get("repositories_removed") or []

            saved_repositories = []
            for repository_data in repositories:
                saved_repositories.append(
                    self.upsert_repository_from_github(
                        session,
                        repository_data,
                        installation_id=installation_id,
                        github_account_id=github_account_id,
                    )
                )

            for repository_data in repositories_removed:
                self.mark_repository_inactive(session, repository_data.get("id"))

            if payload.get("action") == "deleted":
                for repository_data in repositories:
                    self.mark_repository_deleted(session, repository_data.get("id"))

            session.commit()
            return saved_repositories

        except Exception:
            session.rollback()
            raise

        finally:
            session.close()

    def get_repository_by_github_repo_id(self, repo_id: int):
        session = self.session_factory()
        try:
            return session.execute(
                select(Repository).where(
                    Repository.repo_id == repo_id, Repository.is_active == True
                )
            ).scalar_one_or_none()
        finally:
            session.close()

    def get_or_create_repository(self, session, pr_data):
        try:
            data = pr_data
            pr_repo = session.execute(
                select(Repository).where(
                    Repository.repo_id == data.repo_id, Repository.is_active == True
                )
            ).scalar_one_or_none()
            if pr_repo:
                self._update_repository_metadata(
                    pr_repo,
                    installation_id=data.installation_id,
                    github_account_id=data.github_account_id,
                    full_name=data.full_name,
                    owner=data.owner,
                    default_branch=data.default_branch,
                )
                return pr_repo

            # TODO : This query might be change in further away becaue create repo data when user select and able or anable repository
            pr_repo_instance = Repository(
                repo_id=data.repo_id,
                installation_id=data.installation_id,
                github_account_id=data.github_account_id,
                user_id=data.user_id,  # TODO : Still need set Auth service
                full_name=data.full_name,
                owner=data.owner,
                default_branch=data.default_branch,
                is_active=True,
            )

            session.add(pr_repo_instance)
            session.flush()  # gets ID without commit
            return pr_repo_instance

        except Exception as e:
            print("Repository Error:", e)
            raise

    def upsert_repository_from_github(
        self,
        session,
        repository_data: dict,
        *,
        installation_id: int | None,
        github_account_id: int | None,
        user_id: int | None = None,
    ):
        repo_id = repository_data.get("id")
        pr_repo = session.execute(
            select(Repository).where(
                Repository.repo_id == repo_id
            )
        ).scalar_one_or_none()

        owner_data = repository_data.get("owner") or {}
        owner = (
            owner_data.get("login")
            or repository_data.get("full_name", "").split("/")[0]
        )
        is_private = repository_data.get("private", False)

        if pr_repo:
            self._update_repository_metadata(
                pr_repo,
                installation_id=installation_id,
                github_account_id=github_account_id,
                user_id=user_id,
                full_name=repository_data.get("full_name"),
                owner=owner,
                default_branch=repository_data.get("default_branch"),
                is_private=is_private,
            )
            pr_repo.is_active = True
            return pr_repo

        pr_repo = Repository(
            repo_id=repo_id,
            installation_id=installation_id,
            github_account_id=github_account_id,
            user_id=user_id if user_id is not None else None,
            full_name=repository_data.get("full_name"),
            owner=owner,
            default_branch=repository_data.get("default_branch"),
            is_private=is_private,
            is_active=True,
        )
        session.add(pr_repo)
        session.flush()
        return pr_repo

    def sync_user_installation_repositories(
        self,
        repositories_data: list[dict],
        *,
        installation_id: int,
        user_id: int,
    ) -> list[Repository]:
        session = self.session_factory()
        try:
            saved_repositories = []
            for repo_data in repositories_data:
                saved_repositories.append(
                    self.upsert_repository_from_github(
                        session,
                        repo_data,
                        installation_id=installation_id,
                        github_account_id=(repo_data.get("owner") or {}).get("id"),
                        user_id=user_id,
                    )
                )
            session.commit()
            for repo in saved_repositories:
                session.refresh(repo)
            return saved_repositories
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_user_repositories(self, user_id: int) -> list[Repository]:
        session = self.session_factory()
        try:
            return list(
                session.execute(
                    select(Repository).where(
                        Repository.user_id == user_id,
                        Repository.is_active == True,
                    ).order_by(Repository.full_name)
                ).scalars().all()
            )
        finally:
            session.close()

    def mark_repository_inactive(self, session, repo_id: int | None) -> None:
        if repo_id is None:
            return

        pr_repo = session.execute(
            select(Repository).where(Repository.repo_id == repo_id)
        ).scalar_one_or_none()

        if pr_repo:
            pr_repo.is_active = False

    def mark_repository_deleted(self, session, repo_id: int | None) -> None:
        if repo_id is None:
            return

        pr_repo = session.execute(
            select(Repository).where(Repository.repo_id == repo_id)
        ).scalar_one_or_none()

        if pr_repo:
            pr_repo.is_deleted = True

    def _update_repository_metadata(
        self,
        repository: Repository,
        *,
        installation_id: int | None = None,
        github_account_id: int | None = None,
        user_id: int | None = None,
        full_name: str | None = None,
        owner: str | None = None,
        default_branch: str | None = None,
        is_private: bool | None = None,
    ) -> None:
        if installation_id is not None:
            repository.installation_id = installation_id
        if github_account_id is not None:
            repository.github_account_id = github_account_id
        if user_id is not None:
            repository.user_id = user_id
        if full_name:
            repository.full_name = full_name
        if owner:
            repository.owner = owner
        if default_branch:
            repository.default_branch = default_branch
        if is_private is not None:
            repository.is_private = is_private

    def get_pull_request(self, session, repo_id, pr_number):
        try:
            pr_instance = session.execute(
                select(PullRequest).where(
                    PullRequest.repo_id == repo_id, PullRequest.pr_number == pr_number
                )
            ).scalar_one_or_none()

            return pr_instance

        except Exception as e:
            raise RuntimeError(f"ERROR {e}") from e

    def get_pull_request_review_context(self, pr_id: int):
        session = self.session_factory()
        try:
            pr = session.execute(
                select(PullRequest).where(PullRequest.id == pr_id)
            ).scalar_one_or_none()
            if pr is None:
                return None

            repository = session.execute(
                select(Repository).where(Repository.id == pr.repo_id)
            ).scalar_one_or_none()
            if repository is None:
                return None

            return {
                "pull_request_id": pr.id,
                "pull_number": pr.pr_number,
                "repository_id": repository.id,
                "github_repo_id": repository.repo_id,
                "full_name": repository.full_name,
                "owner": repository.owner,
                "repo": (
                    repository.full_name.split("/", 1)[1]
                    if "/" in repository.full_name
                    else repository.full_name
                ),
                "installation_id": repository.installation_id,
            }

        finally:
            session.close()

    def get_review_job_context(self, review_job_id: int):
        session = self.session_factory()
        try:
            review_job = session.execute(
                select(ReviewJob).where(ReviewJob.id == review_job_id)
            ).scalar_one_or_none()
            if review_job is None:
                return None

            context = self.get_pull_request_review_context(review_job.pr_id)
            if context is None:
                return None

            context["review_job_id"] = review_job.id
            context["review_job_status"] = review_job.status
            context["base_sha"] = review_job.base_sha
            context["head_sha"] = review_job.head_sha
            return context
        finally:
            session.close()

    def get_latest_queued_review_job_id(self, pr_id: int) -> int | None:
        session = self.session_factory()
        try:
            return session.execute(
                select(ReviewJob.id)
                .where(
                    ReviewJob.pr_id == pr_id,
                    ReviewJob.status == ReviewJobStatusEnum.QUEUED,
                )
                .order_by(ReviewJob.queued_at.desc(), ReviewJob.id.desc())
                .limit(1)
            ).scalar_one_or_none()
        finally:
            session.close()

    def mark_review_job_running(self, review_job_id: int) -> None:
        session = self.session_factory()
        try:
            session.execute(
                update(ReviewJob)
                .where(ReviewJob.id == review_job_id)
                .values(
                    status=ReviewJobStatusEnum.RUNNING,
                    started_at=func.now(),
                    finished_at=None,
                    attempts=ReviewJob.attempts + 1,
                    error_code=None,
                    processed_files=0,
                    final_review_json=None,
                )
            )
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def set_review_job_total_files(self, review_job_id: int, total_files: int) -> None:
        session = self.session_factory()
        try:
            session.execute(
                update(ReviewJob)
                .where(ReviewJob.id == review_job_id)
                .values(total_files=total_files, processed_files=0)
            )
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def increment_processed_files(self, review_job_id: int) -> None:
        session = self.session_factory()
        try:
            session.execute(
                update(ReviewJob)
                .where(ReviewJob.id == review_job_id)
                .values(
                    processed_files=case(
                        (
                            ReviewJob.processed_files < ReviewJob.total_files,
                            ReviewJob.processed_files + 1,
                        ),
                        else_=ReviewJob.processed_files,
                    )
                )
            )
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def mark_review_job_succeeded(self, review_job_id: int, final_review: dict) -> None:
        session = self.session_factory()
        try:
            session.execute(
                update(ReviewJob)
                .where(ReviewJob.id == review_job_id)
                .values(
                    status=ReviewJobStatusEnum.SUCCEEDED,
                    processed_files=ReviewJob.total_files,
                    finished_at=func.now(),
                    error_code=None,
                    final_review_json=final_review,
                )
            )
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def mark_review_job_failed(self, review_job_id: int, error_code: str) -> None:
        session = self.session_factory()
        try:
            session.execute(
                update(ReviewJob)
                .where(ReviewJob.id == review_job_id)
                .values(
                    status=ReviewJobStatusEnum.FAILED,
                    finished_at=func.now(),
                    error_code=error_code[:64],
                )
            )
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def save_file_review_result(
        self,
        *,
        review_job_id: int,
        filename: str,
        status: str,
        findings: list,
        summary: str,
        metadata: dict | None = None,
    ) -> None:
        session = self.session_factory()
        try:
            stmt = insert(ReviewFileResult).values(
                job_id=review_job_id,
                filename=filename,
                status=status,
                findings_json=findings,
                summary=summary,
                metadata_json=metadata or {},
            )
            stmt = stmt.on_conflict_do_update(
                constraint="uq_review_file_results_job_file",
                set_={
                    "status": stmt.excluded.status,
                    "findings_json": stmt.excluded.findings_json,
                    "summary": stmt.excluded.summary,
                    "metadata_json": stmt.excluded.metadata_json,
                },
            )
            session.execute(stmt)
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
