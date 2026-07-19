from __future__ import annotations

import pytest
from pydantic import ValidationError

from authstatus_api.settings import Settings


def test_default_environment_is_development(monkeypatch):
    monkeypatch.delenv(
        "AUTHSTATUS_APP_ENVIRONMENT",
        raising=False,
    )

    settings = Settings(_env_file=None)

    assert settings.app_environment == "development"


@pytest.mark.parametrize(
    "value",
    [
        "development",
        "DEVELOPMENT",
        " test ",
    ],
)
def test_supported_environment_values_are_normalized(value):
    settings = Settings(
        _env_file=None,
        AUTHSTATUS_APP_ENVIRONMENT=value,
    )

    assert settings.app_environment == value.strip().lower()


def test_production_environment_is_normalized_with_secure_configuration():
    settings = Settings(
        _env_file=None,
        AUTHSTATUS_APP_ENVIRONMENT=" PRODUCTION ",
        AUTHSTATUS_SESSION_COOKIE_SECURE=True,
        AUTHSTATUS_CORS_ORIGINS="https://carequeue.example",
    )

    assert settings.app_environment == "production"


def test_unsupported_environment_is_rejected():
    with pytest.raises(
        ValidationError,
        match="app_environment must be",
    ):
        Settings(
            _env_file=None,
            AUTHSTATUS_APP_ENVIRONMENT="staging",
        )


@pytest.mark.parametrize(
    "origin",
    [
        "ftp://carequeue.example",
        "carequeue.example",
        "https://user:password@carequeue.example",
        "https://carequeue.example/application",
        "https://carequeue.example?source=test",
        "https://carequeue.example#section",
    ],
)
def test_cors_origins_reject_non_origin_urls(origin):
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            AUTHSTATUS_CORS_ORIGINS=origin,
        )


def test_cors_origins_accept_json_environment_list():
    settings = Settings(
        _env_file=None,
        AUTHSTATUS_CORS_ORIGINS=(
            '["http://localhost:5173",' '"https://carequeue.example"]'
        ),
    )

    assert settings.cors_origins == [
        "http://localhost:5173",
        "https://carequeue.example",
    ]


@pytest.mark.parametrize(
    "value",
    [
        "[invalid-json",
        '{"origin": "https://carequeue.example"}',
        '["https://carequeue.example", 123]',
    ],
)
def test_cors_origins_reject_invalid_json_values(value):
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            AUTHSTATUS_CORS_ORIGINS=value,
        )


def test_cors_origins_are_normalized():
    settings = Settings(
        _env_file=None,
        AUTHSTATUS_CORS_ORIGINS=(
            "HTTP://LOCALHOST:5173/," "HTTPS://CAREQUEUE.EXAMPLE/"
        ),
    )

    assert settings.cors_origins == [
        "http://localhost:5173",
        "https://carequeue.example",
    ]


def test_cors_origins_reject_normalized_duplicates():
    with pytest.raises(
        ValidationError,
        match="CORS origins cannot contain duplicates",
    ):
        Settings(
            _env_file=None,
            AUTHSTATUS_CORS_ORIGINS=(
                "https://carequeue.example," "HTTPS://CAREQUEUE.EXAMPLE/"
            ),
        )


def test_production_allows_hostname_containing_localhost_text():
    settings = Settings(
        _env_file=None,
        AUTHSTATUS_APP_ENVIRONMENT="production",
        AUTHSTATUS_SESSION_COOKIE_SECURE=True,
        AUTHSTATUS_CORS_ORIGINS=("https://localhost-support.example"),
    )

    assert settings.cors_origins == [
        "https://localhost-support.example",
    ]


def test_production_requires_secure_session_cookie():
    with pytest.raises(
        ValidationError,
        match="Production requires secure session cookies",
    ):
        Settings(
            _env_file=None,
            AUTHSTATUS_APP_ENVIRONMENT="production",
            AUTHSTATUS_SESSION_COOKIE_SECURE=False,
            AUTHSTATUS_CORS_ORIGINS="https://carequeue.example",
        )


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "http://carequeue.example",
        "https://localhost:5173",
        "https://127.0.0.1:5173",
        "https://[::1]:5173",
    ],
)
def test_production_rejects_unsafe_cors_origins(origin):
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            AUTHSTATUS_APP_ENVIRONMENT="production",
            AUTHSTATUS_SESSION_COOKIE_SECURE=True,
            AUTHSTATUS_CORS_ORIGINS=origin,
        )


def test_production_accepts_secure_configuration():
    settings = Settings(
        _env_file=None,
        AUTHSTATUS_APP_ENVIRONMENT="production",
        AUTHSTATUS_SESSION_COOKIE_SECURE=True,
        AUTHSTATUS_CORS_ORIGINS=(
            "https://carequeue.example," "https://admin.carequeue.example"
        ),
    )

    assert settings.app_environment == "production"
    assert settings.session_cookie_secure is True
    assert settings.cors_origins == [
        "https://carequeue.example",
        "https://admin.carequeue.example",
    ]
