import time
from pathlib import Path

import httpx
import jwt
import redis.asyncio as redis
from jwt import InvalidKeyError

from apps.backend.agents.pr_reviewer_agent.apps.code_reviewer.schema.pr_schema import (
    PullRequestFile,
)
from apps.backend.bot.application import config


class GitHubAppConfigError(RuntimeError):
    pass


class GitHubInstallationTokenService:
    def __init__(
        self,
        *,
        app_id: str | None = None,
        private_key_path: str | None = None,
    ):
        self.app_id = app_id or config.GITHUB_APP_ID
        self.private_key_path = private_key_path or config.GITHUB_PRIVATE_KEY_PATH

    async def create_installation_access_token(self, installation_id: int) -> str:
        cached_token = await self._get_cached_installation_token(installation_id)
        if cached_token:
            return cached_token

        app_jwt = self._create_app_jwt()
        url = (
            f"https://api.github.com/app/installations/{installation_id}/access_tokens"
        )
        headers = {
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers)
            response.raise_for_status()
            token = response.json()["token"]

        await self._cache_installation_token(installation_id, token)
        return token

    async def _get_cached_installation_token(self, installation_id: int) -> str | None:
        client = redis.from_url(config.REDIS_URL, decode_responses=True)
        try:
            return await client.get(self._cache_key(installation_id))
        finally:
            await client.aclose()

    async def _cache_installation_token(self, installation_id: int, token: str) -> None:
        client = redis.from_url(config.REDIS_URL, decode_responses=True)
        try:
            await client.set(self._cache_key(installation_id), token, ex=55 * 60)
        finally:
            await client.aclose()

    @staticmethod
    def _cache_key(installation_id: int) -> str:
        return f"github:installation:{installation_id}"

    def _create_app_jwt(self) -> str:
        if not self.app_id:
            raise GitHubAppConfigError("GITHUB_APP_ID is required")

        private_key = self._load_private_key()
        now = int(time.time())
        payload = {
            "iat": now - 60,
            "exp": now + (9 * 60),
            "iss": self.app_id,
        }
        try:
            return jwt.encode(payload, private_key, algorithm="RS256")
        except InvalidKeyError as exc:
            raise GitHubAppConfigError(
                "GitHub App private key is invalid. Use the GitHub App private key "
                "PEM, not the public key. Configure only GITHUB_PRIVATE_KEY_PATH."
            ) from exc

    def _load_private_key(self) -> str:
        if self.private_key_path:
            private_key_path = Path(self.private_key_path)
            if not private_key_path.exists():
                raise GitHubAppConfigError(
                    f"GITHUB_PRIVATE_KEY_PATH does not exist: {private_key_path}"
                )
            private_key = private_key_path.read_text(encoding="utf-8")
            if "PRIVATE KEY" not in private_key:
                raise GitHubAppConfigError(
                    f"GITHUB_PRIVATE_KEY_PATH is not a PEM private key: {private_key_path}"
                )
            return private_key

        raise GitHubAppConfigError(
            "GITHUB_PRIVATE_KEY_PATH is required"
        )


class GitHubPullRequestService:
    def __init__(
        self,
        token_service: GitHubInstallationTokenService | None = None,
    ):
        self.token_service = token_service or GitHubInstallationTokenService()

    async def get_pull_request_files(
        self,
        owner: str,
        repo: str,
        pull_number: int,
        installation_id: int,
    ) -> list[PullRequestFile]:
        token = await self.token_service.create_installation_access_token(
            installation_id
        )
        url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}/files"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        files: list[PullRequestFile] = []
        page = 1

        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                response = await client.get(
                    url, headers=headers, params={"per_page": 100, "page": page}
                )
                response.raise_for_status()
                page_files = response.json()
                files.extend(
                    PullRequestFile.model_validate(file_data)
                    for file_data in page_files
                )

                if len(page_files) < 100:
                    break

                page += 1

        return files

    async def get_changed_files_between_commits(
        self,
        owner: str,
        repo: str,
        before_sha: str,
        after_sha: str,
        installation_id: int,
    ) -> list[PullRequestFile]:
        token = await self.token_service.create_installation_access_token(
            installation_id
        )
        url = f"https://api.github.com/repos/{owner}/{repo}/compare/{before_sha}...{after_sha}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

        return [
            PullRequestFile.model_validate(file_data)
            for file_data in data.get("files", [])
        ]
    
class GitHubInstallationService:
    def __init__(
        self,
        token_service: GitHubInstallationTokenService | None = None,
    ):
        self.token_service = token_service or GitHubInstallationTokenService()

    @classmethod
    async def get_installation_repositories(
        cls,
        installation_id: int,
        token_service: GitHubInstallationTokenService | None = None,
    ) -> list[dict]:
        """
        Return repositories accessible to a GitHub App installation.
        """
        svc = token_service or GitHubInstallationTokenService()
        token = await svc.create_installation_access_token(
            installation_id
        )

        url = "https://api.github.com/installation/repositories"

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                url,
                headers=headers,
            )

            response.raise_for_status()

        return response.json()["repositories"]

