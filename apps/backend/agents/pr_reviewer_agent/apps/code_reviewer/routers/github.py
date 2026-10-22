import json
import os
import httpx
from fastapi import APIRouter, Depends, Request, HTTPException
from dotenv import load_dotenv

from apps.backend.bot.application.core.database import SessionLocal
from apps.backend.bot.application import config
from ..webhook.verify_signature import verify_signature
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.repository.git_repository import (
    CodeReviewRepository,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.service.git_service import (
    CodeReviewService,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.service.pr_resolver import (
    PrResolver,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.tasks import (
    review_pull_request,
)
from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.service.github_pull_request_service import (
    GitHubInstallationService,
    GitHubAppConfigError,
)
from apps.backend.shared.auth import UserPrincipal, get_current_user_from_token

load_dotenv()

router = APIRouter()


def get_code_review_service():
    return CodeReviewService(CodeReviewRepository(SessionLocal))


def github_service():
    return CodeReviewRepository(SessionLocal)


@router.get("/health-neroai")
async def health_neroai_check(current_user = Depends(get_current_user_from_token)):
    return {
        "status": "success",
        "data": current_user
    }

@router.post("/webhook/github")
async def github_webhook(
    request: Request,
    # current_user = Depends(get_current_user_from_token),
    code_review_service: CodeReviewService = Depends(get_code_review_service),
):
    payload = await request.body()

    if not config.GITHUB_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=500, detail="GitHub webhook secret is not configured"
        )

    if not verify_signature(request.headers, payload, config.GITHUB_WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload_dict = json.loads(payload)
    with open("payload.json", "w") as f:
        json.dump(payload_dict, f, indent=4)

    github_event = request.headers.get("X-GitHub-Event")
    print(f"[GitHub Webhook] Event: {github_event}")
    if github_event in {"installation", "installation_repositories"}:
        print("[Github events:]", github_event)
        repositories = code_review_service.process_installation_webhook(
            payload=payload_dict
        )
        return {"status": "installation received", "repositories": len(repositories)}

    resolver = PrResolver()
    action = resolver.resolver(payload=payload_dict)
    pull_request = code_review_service.process_webhook(payload=payload_dict, action=action)
    review_job_id = None

    print('[Pull Request]', pull_request)
    if pull_request is not None:
        review_job_id = code_review_service.repository.get_latest_queued_review_job_id(
            pull_request.id
        )
        if review_job_id is not None:
            print(f"[Review Job ID] {review_job_id} - Queued for review")
            review_pull_request.delay(review_job_id) # type:ignore

    return {"status": "webhook received", "review_job_id": review_job_id}


@router.get("/items/")
async def read_items(
    q: str | None = None,
    current_user: UserPrincipal = Depends(get_current_user_from_token),
):
    results = {
        "authenticated_user_id": current_user.id,
        "items": [{"item_id": "Foo"}, {"item_id": "Bar"}],
    }
    if q:
        results.update({"q": q})
    return results


@router.get("/github/install")
@router.get("/github/installations")
async def get_github_install(
    current_user: UserPrincipal = Depends(get_current_user_from_token),
):
    """
    Generate and return the GitHub App installation URL for connecting GitHub repositories.
    """

    app_slug = config.GITHUB_APP_SLUG or os.getenv("GITHUB_APP_SLUG")
    if not app_slug:
        raise HTTPException(
            status_code=500,
            detail="GITHUB_APP_SLUG is not configured",
        )

    url = f"https://github.com/apps/{app_slug}/installations/new?state={current_user.id}"

    return {"url": url}


@router.get("/github/callback")
async def github_callback(
    installation_id: int,
    current_user: UserPrincipal = Depends(get_current_user_from_token),
    code_review_service: CodeReviewService = Depends(get_code_review_service),
):
    """
    Handle GitHub App installation callback, validate installation_id,
    synchronize accessible repositories for the authenticated user, and return connected repositories.
    """
    if installation_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid installation_id parameter",
        )

    try:
        raw_repos = await GitHubInstallationService.get_installation_repositories(
            installation_id
        )
    except GitHubAppConfigError as exc:
        print(f"[GitHub Callback Error] Config error: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"GitHub App configuration error: {str(exc)}",
        ) from exc
    except httpx.HTTPStatusError as exc:
        print(f"[GitHub Callback Error] HTTPStatusError: {exc.response.text}")
        raise HTTPException(
            status_code=exc.response.status_code if exc.response.status_code in (400, 401, 403, 404) else 502,
            detail=f"GitHub API error fetching repositories for installation {installation_id}: {exc.response.text}",
        ) from exc
    except httpx.RequestError as exc:
        print(f"[GitHub Callback Error] RequestError: {exc}")
        raise HTTPException(
            status_code=503,
            detail="Network error communicating with GitHub API",
        ) from exc
    except Exception as exc:
        print(f"[GitHub Callback Error] Unexpected exception: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching installation repositories: {str(exc)}",
        ) from exc

    try:
        saved_repos = code_review_service.repository.sync_user_installation_repositories(
            raw_repos,
            installation_id=installation_id,
            user_id=current_user.id,
        )
    except Exception as exc:
        print(f"[GitHub Callback Error] DB sync error: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to synchronize repositories in database: {str(exc)}",
        ) from exc

    formatted_repos = [
        {
            "id": repo.id,
            "repo_id": repo.repo_id,
            "installation_id": repo.installation_id,
            "github_account_id": repo.github_account_id,
            "user_id": repo.user_id,
            "full_name": repo.full_name,
            "owner": repo.owner,
            "default_branch": repo.default_branch,
            "is_private": getattr(repo, "is_private", False),
            "is_active": repo.is_active,
        }
        for repo in saved_repos
    ]

    return {
        "success": True,
        "installation_id": installation_id,
        "repositories": formatted_repos,
    }


@router.get("/github/repositories")
@router.get("/repositories")
async def get_github_repositories(
    current_user: UserPrincipal = Depends(get_current_user_from_token),
    code_review_service: CodeReviewService = Depends(get_code_review_service),
):
    """
    Return all connected GitHub repositories for the authenticated NeroAI user.
    """
    user_repos = code_review_service.repository.get_user_repositories(current_user.id)
    return {
        "repositories": [
            {
                "id": repo.id,
                "repo_id": repo.repo_id,
                "installation_id": repo.installation_id,
                "github_account_id": repo.github_account_id,
                "user_id": repo.user_id,
                "full_name": repo.full_name,
                "owner": repo.owner,
                "default_branch": repo.default_branch,
                "is_private": getattr(repo, "is_private", False),
                "is_active": repo.is_active,
            }
            for repo in user_repos
        ]
    }


