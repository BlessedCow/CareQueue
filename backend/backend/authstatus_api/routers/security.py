from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from authstatus_api.audit.service import record_audit_event
from authstatus_api.security.dependencies import (
    CurrentUserDependency,
    extract_bearer_token,
    require_role,
)
from authstatus_api.security.repository import (
    authenticate_user,
    create_user,
    create_user_session,
    get_user_for_session_token,
    list_users,
    revoke_session,
    update_user,
)
from authstatus_api.security.schemas import (
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    UserCreateRequest,
    UserListResponse,
    UserResponse,
    UserUpdateRequest,
)

router = APIRouter(prefix="/api/security", tags=["security"])

AdminUserDependency = Depends(require_role("Admin"))


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


@router.get("/users", response_model=UserListResponse)
def read_users(current_user: dict = AdminUserDependency) -> UserListResponse:
    return UserListResponse(
        users=[_user_response(user) for user in list_users()],
    )


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_managed_user(
    payload: UserCreateRequest,
    request: Request,
    current_user: dict = AdminUserDependency,
) -> UserResponse:
    user = create_user(payload.username, payload.password, role=payload.role)

    record_audit_event(
        action="user.create",
        resource_type="user",
        resource_id=user["id"],
        user=current_user,
        metadata={"role": payload.role},
        request=request,
    )

    return _user_response(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_managed_user(
    user_id: int,
    payload: UserUpdateRequest,
    request: Request,
    current_user: dict = AdminUserDependency,
) -> UserResponse:
    payload_data = payload.model_dump(exclude_unset=True)

    if not payload_data:
        user = update_user(user_id)
    else:
        if user_id == current_user["id"] and (
            "role" in payload_data or payload_data.get("is_active") is False
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot remove their own admin access.",
            )

        user = update_user(
            user_id,
            role=payload_data.get("role"),
            is_active=payload_data.get("is_active"),
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    record_audit_event(
        action="user.update",
        resource_type="user",
        resource_id=user_id,
        user=current_user,
        metadata={"fields": sorted(payload_data.keys())},
        request=request,
    )

    return _user_response(user)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request) -> LoginResponse:
    user = authenticate_user(payload.username, payload.password)

    if user is None:
        record_audit_event(
            action="security.login_failed",
            resource_type="security",
            metadata={"username": payload.username.strip().lower()},
            request=request,
            username=payload.username.strip().lower(),
        )

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
    
    record_audit_event(
        action="security.login",
        resource_type="session",
        resource_id=session["id"],
        user=user,
        request=request,
    )

    return LoginResponse(
        access_token=created_session["token"],
        expires_at=session["expires_at"],
        user=_user_response(user),
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(
    request: Request,
    authorization: str | None = Header(default=None),
) -> LogoutResponse:
    token = extract_bearer_token(authorization)
    user = get_user_for_session_token(token)
    logged_out = revoke_session(token)

    if logged_out:
        record_audit_event(
            action="security.logout",
            resource_type="session",
            user=user,
            request=request,
        )

    return LogoutResponse(logged_out=logged_out)


@router.get("/me", response_model=CurrentUserResponse)
def read_current_user(user: dict = CurrentUserDependency) -> CurrentUserResponse:
    return CurrentUserResponse(user=_user_response(user))