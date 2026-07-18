from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Header, HTTPException, Request, status

from authstatus_api.security.repository import (
    get_user_for_session_token,
)
from authstatus_api.settings import get_settings


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )

    return token.strip()


def extract_session_token(
    request: Request,
    authorization: str | None,
) -> str:
    settings = get_settings()
    cookie_token = request.cookies.get(
        settings.session_cookie_name
    )

    if cookie_token:
        return cookie_token

    return extract_bearer_token(authorization)


def get_authenticated_user(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict:
    token = extract_session_token(
        request,
        authorization,
    )
    user = get_user_for_session_token(token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    return user


AuthenticatedUserDependency = Depends(get_authenticated_user)


def get_current_user(
    authenticated_user: dict = AuthenticatedUserDependency,
) -> dict:
    if authenticated_user["must_change_password"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required.",
        )

    return authenticated_user


CurrentUserDependency = Depends(get_current_user)


def require_role(*allowed_roles: str) -> Callable:
    def dependency(
        current_user: dict = CurrentUserDependency,
    ) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this role.",
            )

        return current_user

    return dependency