from __future__ import annotations

from unittest.mock import patch

import pytest
from authstatus_api.security.csrf import (
    CSRF_TOKEN_BYTES,
    generate_csrf_token,
    validate_csrf_request,
)
from fastapi import HTTPException
from starlette.requests import Request


def build_request(
    *,
    method: str,
    cookie_token: str | None = None,
    header_token: str | None = None,
) -> Request:
    headers: list[tuple[bytes, bytes]] = []

    if cookie_token is not None:
        headers.append(
            (
                b"cookie",
                f"carequeue_csrf={cookie_token}".encode(),
            )
        )

    if header_token is not None:
        headers.append(
            (
                b"x-csrf-token",
                header_token.encode(),
            )
        )

    return Request(
        {
            "type": "http",
            "method": method,
            "path": "/api/example",
            "headers": headers,
        }
    )


def test_generate_csrf_token_uses_secure_random_value():
    with patch(
        "authstatus_api.security.csrf.secrets.token_urlsafe",
        return_value="generated-token",
    ) as token_mock:
        token = generate_csrf_token()

    assert token == "generated-token"
    token_mock.assert_called_once_with(CSRF_TOKEN_BYTES)


@pytest.mark.parametrize("method", ["GET", "HEAD", "OPTIONS"])
def test_safe_methods_do_not_require_csrf_token(method):
    validate_csrf_request(
        build_request(method=method),
    )


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
def test_state_changing_methods_accept_matching_tokens(method):
    validate_csrf_request(
        build_request(
            method=method,
            cookie_token="matching-token",
            header_token="matching-token",
        ),
    )


@pytest.mark.parametrize(
    ("cookie_token", "header_token"),
    [
        (None, None),
        ("cookie-token", None),
        (None, "header-token"),
        ("cookie-token", "different-token"),
    ],
)
def test_state_changing_methods_reject_missing_or_invalid_tokens(
    cookie_token,
    header_token,
):
    with pytest.raises(HTTPException) as exc_info:
        validate_csrf_request(
            build_request(
                method="POST",
                cookie_token=cookie_token,
                header_token=header_token,
            ),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "CSRF validation failed."