from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional

from .jwt_utils import AuthException, decode_access_token
from .schemas import UserPrincipal
from .security import bearer_scheme

ACCESS_COOKIE_NAME = "codebot_access_token"
GUEST_COOKIE_NAME = "guest_token"


def extract_token_from_request(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = None,
) -> Optional[str]:
    # 1. Bearer token from Swagger UI / Postman / Authorization Header
    if credentials and credentials.credentials:
        return credentials.credentials.strip()

    # Direct header check fallback
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()

    # 2. Cookie check for web app browser sessions
    cookie_token = request.cookies.get(ACCESS_COOKIE_NAME) or request.cookies.get(
        GUEST_COOKIE_NAME
    )
    if cookie_token:
        return cookie_token

    return None


async def get_current_user_from_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> UserPrincipal:
    token = extract_token_from_request(request, credentials)
    if not token:
        print("[Auth Error] 401 Unauthorized: Authorization token missing from headers & cookies")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(token)
    except AuthException as exc:
        print(f"[Auth Error] 401 Unauthorized: {exc.message}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message,
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return UserPrincipal(
        id=int(payload.sub),
        email=payload.email,
        user_type=payload.user_type,
        session_id=payload.sid,
    )


# Alias for convenience
get_current_user = get_current_user_from_token

