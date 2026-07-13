from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

UserRole = Literal["Admin", "UR", "Read Only"]


class LoginRequest(BaseModel):
    username: str
    password: str

    model_config = ConfigDict(extra="forbid")


class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: UserRole = "UR"

    model_config = ConfigDict(extra="forbid")


class UserUpdateRequest(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None

    model_config = ConfigDict(extra="forbid")


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    last_login_at: str | None = None
    password_changed_at: str


class UserListResponse(BaseModel):
    users: list[UserResponse]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    user: UserResponse


class CurrentUserResponse(BaseModel):
    user: UserResponse


class LogoutResponse(BaseModel):
    logged_out: bool