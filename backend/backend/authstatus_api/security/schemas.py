from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    username: str
    password: str

    model_config = ConfigDict(extra="forbid")


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    last_login_at: str | None = None
    password_changed_at: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    user: UserResponse


class CurrentUserResponse(BaseModel):
    user: UserResponse


class LogoutResponse(BaseModel):
    logged_out: bool