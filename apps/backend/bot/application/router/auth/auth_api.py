from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse

from ...dependencies.auth import get_auth_service, get_current_user_from_db
from ...schema.chat_schema import (
    AuthenticatedUserResponse,
    GoogleLoginUrlResponse,
    GuestSessionRequest,
    LoginRequest,
    LogoutResponse,
    SignupRequest,
    UserSessionResponse,
)
from ...service.auth_service import AuthError, AuthService


router = APIRouter(tags=["auth"], prefix="/auth")


def build_session_response(session) -> UserSessionResponse:
    return UserSessionResponse(
        token=session.token,
        access_token=session.access_token,
        session_label=session.session_label,
        user_id=session.user_id,
        session_id=session.session_id,
        expires_at=session.expires_at,
        refresh_expires_at=session.refresh_expires_at,
        user=AuthenticatedUserResponse(**session.user.__dict__),
    )


@router.post("/guest", response_model=UserSessionResponse)
def create_guest_session(
    request: Request,
    response: Response,
    payload: GuestSessionRequest | None = None,
    auth_service: AuthService = Depends(get_auth_service),
):
    session = auth_service.create_guest_session(
        request,
        client_session_id=payload.client_session_id if payload else None,
    )
    auth_service.apply_session_cookies(response, session)
    return build_session_response(session)


@router.post("/signup", response_model=UserSessionResponse)
def signup(
    payload: SignupRequest,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        session = auth_service.signup(
            request=request,
            email=payload.email,
            password=payload.password,
            display_name=payload.display_name,
            client_session_id=payload.client_session_id,
        )
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    auth_service.apply_session_cookies(response, session)
    return build_session_response(session)


@router.post("/login", response_model=UserSessionResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        session = auth_service.login(
            request=request,
            email=payload.email,
            password=payload.password,
            client_session_id=payload.client_session_id,
        )
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        print(f"[Login Error] Unexpected exception during login: {exc}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Login failed: {str(exc)}") from exc

    auth_service.apply_session_cookies(response, session)
    return build_session_response(session)


@router.post("/refresh", response_model=UserSessionResponse)
def refresh_session(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        session = auth_service.refresh_session(request)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    auth_service.apply_session_cookies(response, session)
    return build_session_response(session)


@router.post("/logout", response_model=LogoutResponse)
def logout(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    auth_service.logout(request)
    auth_service.clear_session_cookies(response)
    return LogoutResponse()


@router.get("/google/url", response_model=GoogleLoginUrlResponse)
def google_login_url(auth_service: AuthService = Depends(get_auth_service)):
    enabled, login_url, detail = auth_service.google_login_url()
    return GoogleLoginUrlResponse(enabled=enabled, login_url=login_url, detail=detail)


@router.get("/google/login")
def google_login(auth_service: AuthService = Depends(get_auth_service)):
    enabled, login_url, detail = auth_service.google_login_url()
    if not enabled or not login_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail or "Google login unavailable")
    return RedirectResponse(login_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/google/callback")
def google_callback(
    code: str,
    state: str,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        session = auth_service.login_with_google_callback(request=request, code=code, state=state)
    except AuthError as exc:
        return RedirectResponse(auth_service.build_frontend_redirect_url(error=str(exc)), status_code=status.HTTP_302_FOUND)

    redirect = RedirectResponse(auth_service.build_frontend_redirect_url(), status_code=status.HTTP_302_FOUND)
    auth_service.apply_session_cookies(redirect, session)
    return redirect


@router.get("/me", response_model=AuthenticatedUserResponse)
def get_authenticated_user(current_user=Depends(get_current_user_from_db)):
    return AuthenticatedUserResponse(**current_user.__dict__)
