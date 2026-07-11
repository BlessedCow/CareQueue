from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Header, HTTPException, status

from authstatus_api.security.repository import get_user_for_session_token


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


def get_current_user(
    authorization: str | None = Header(default=None),
) -> dict:
    token = extract_bearer_token(authorization)
    user = get_user_for_session_token(token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    return user

CurrentUserDependency = Depends(get_current_user)

def require_role(*allowed_roles: str) -> Callable:
    def dependency(current_user: dict = CurrentUserDependency) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this role.",
            )

        return current_user

    return dependency