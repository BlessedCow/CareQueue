from __future__ import annotations

import hmac
import secrets

from fastapi import HTTPException, Request, status

from authstatus_api.settings import get_settings

CSRF_TOKEN_BYTES = 32
CSRF_PROTECTED_METHODS = frozenset(
    {
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    },
)


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(CSRF_TOKEN_BYTES)


def validate_csrf_request(request: Request) -> None:
    if request.method.upper() not in CSRF_PROTECTED_METHODS:
        return

    settings = get_settings()
    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    header_token = request.headers.get(settings.csrf_header_name)

    if (
        not cookie_token
        or not header_token
        or not hmac.compare_digest(cookie_token, header_token)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed.",
        )