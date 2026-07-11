from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request, status

from authstatus_api.security.dependencies import (
    CurrentUserDependency,
    extract_bearer_token,
)
from authstatus_api.security.repository import (
    authenticate_user,
    create_user_session,
    revoke_session,
)
from authstatus_api.security.schemas import (
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    UserResponse,
)

router = APIRouter(prefix="/api/security", tags=["security"])


def _client_ip(request: Request) -> str:
    if request.client is None:
        return ""

    return request.client.host


def _user_response(user: dict) -> UserResponse:
    return UserResponse(
        id=user["id"],
        username=user["username"],
        role=user["role"],
        is_active=user["is_active"],
        last_login_at=user["last_login_at"],
        password_changed_at=user["password_changed_at"],
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request) -> LoginResponse:
    user = authenticate_user(payload.username, payload.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    created_session = create_user_session(
        user["id"],
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent", ""),
    )

    session = created_session["session"]

    return LoginResponse(
        access_token=created_session["token"],
        expires_at=session["expires_at"],
        user=_user_response(user),
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(authorization: str | None = Header(default=None)) -> LogoutResponse:
    token = extract_bearer_token(authorization)

    return LogoutResponse(logged_out=revoke_session(token))


@router.get("/me", response_model=CurrentUserResponse)
def read_current_user(user: dict = CurrentUserDependency) -> CurrentUserResponse:
    return CurrentUserResponse(user=_user_response(user))