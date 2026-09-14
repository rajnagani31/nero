from fastapi import Depends, HTTPException, Request, status

from ..config import JWT_SECRET, SessionLocal
from ..repository.auth_repository import AuthRepository
from ..service.auth_service import AuthError, AuthService

def get_auth_service() -> AuthService:
    return AuthService(
        AuthRepository(SessionLocal),
        secret=JWT_SECRET,
    )


async def get_current_user_from_db(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        body_bytes = await request.body() # type:ignore
        body_str = body_bytes.decode("utf-8") if body_bytes else "(empty)"
        print(f"[Request Method] {request.method}")
        print(f"[Request URL] {request.url}")
        print(f"[Request Body] {body_str}")
        return auth_service.get_user_from_request(request)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
