from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import (
    BaseSettings,
    NoDecode,
    SettingsConfigDict,
)

PACKAGE_ROOT = Path(__file__).resolve().parents[0]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ROOT_ENV_FILE = PROJECT_ROOT / ".env"


def resolve_project_path(path: Path) -> Path:
    if path.is_absolute():
        return path.resolve()

    return (PROJECT_ROOT / path).resolve()


class Settings(BaseSettings):
    app_name: str = "AuthStatus API"
    app_version: str = "0.1.0"
    app_environment: str = Field(
        default="development",
        validation_alias="AUTHSTATUS_APP_ENVIRONMENT",
    )

    database_path: Path = Field(
        default=Path("backend/data/auth_tracker.db"),
        validation_alias="AUTHSTATUS_DATABASE_PATH",
    )
    database_encryption: str = Field(
        default="plaintext",
        validation_alias="AUTHSTATUS_DATABASE_ENCRYPTION",
    )
    allow_unsafe_database_path: bool = Field(
        default=False,
        validation_alias="AUTHSTATUS_ALLOW_UNSAFE_DATABASE_PATH",
    )
    encryption_key: str = Field(
        default="", validation_alias="AUTHSTATUS_ENCRYPTION_KEY"
    )
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        validation_alias="AUTHSTATUS_CORS_ORIGINS",
    )
    session_cookie_name: str = Field(
        default="carequeue_session",
        validation_alias="AUTHSTATUS_SESSION_COOKIE_NAME",
    )
    session_cookie_secure: bool = Field(
        default=False,
        validation_alias="AUTHSTATUS_SESSION_COOKIE_SECURE",
    )
    csrf_cookie_name: str = Field(
        default="carequeue_csrf",
        validation_alias="AUTHSTATUS_CSRF_COOKIE_NAME",
    )
    csrf_header_name: str = Field(
        default="X-CSRF-Token",
        validation_alias="AUTHSTATUS_CSRF_HEADER_NAME",
    )
    sqlcipher_key: str = Field(
        default="",
        validation_alias="AUTHSTATUS_SQLCIPHER_KEY",
    )

    backup_encryption_key: str = Field(
        default="",
        validation_alias="AUTHSTATUS_BACKUP_ENCRYPTION_KEY",
    )
    backup_directory: Path = Field(
        default=Path("backend/backups"),
        validation_alias="AUTHSTATUS_BACKUP_DIRECTORY",
    )

    restore_directory: Path = Field(
        default=Path("backend/restores"),
        validation_alias="AUTHSTATUS_RESTORE_DIRECTORY",
    )

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("app_environment")
    @classmethod
    def validate_app_environment(cls, value: str) -> str:
        normalized_value = value.strip().lower()

        if normalized_value not in {
            "development",
            "test",
            "production",
        }:
            raise ValueError(
                "app_environment must be development, test, or production."
            )

        return normalized_value

    @field_validator("database_encryption")
    @classmethod
    def validate_database_encryption(cls, value: str) -> str:
        normalized_value = value.strip().lower()

        if normalized_value not in {"plaintext", "sqlcipher"}:
            raise ValueError("database_encryption must be plaintext or sqlcipher.")

        return normalized_value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_and_validate_cors_origins(
        cls,
        value: str | list[str],
    ) -> list[str]:
        if isinstance(value, str):
            stripped_value = value.strip()

            if stripped_value.startswith("["):
                try:
                    parsed_value = json.loads(stripped_value)
                except json.JSONDecodeError as exc:
                    raise ValueError(
                        "CORS origins must be a valid JSON list or "
                        "comma-separated origins."
                    ) from exc

                if not isinstance(parsed_value, list) or not all(
                    isinstance(origin, str) for origin in parsed_value
                ):
                    raise ValueError(
                        "CORS origins JSON value must be a list of strings."
                    )

                values = parsed_value
            else:
                values = [
                    origin.strip()
                    for origin in stripped_value.split(",")
                    if origin.strip()
                ]
        else:
            values = value

        normalized_origins: list[str] = []
        seen_origins: set[str] = set()

        for raw_origin in values:
            origin = raw_origin.strip()
            parsed_origin = urlsplit(origin)

            if parsed_origin.scheme.lower() not in {
                "http",
                "https",
            }:
                raise ValueError("CORS origins must use HTTP or HTTPS.")

            if not parsed_origin.netloc:
                raise ValueError("CORS origins must include a hostname.")

            if parsed_origin.username is not None or parsed_origin.password is not None:
                raise ValueError("CORS origins cannot contain credentials.")

            if parsed_origin.path not in {"", "/"}:
                raise ValueError("CORS origins cannot contain a path.")

            if parsed_origin.query:
                raise ValueError("CORS origins cannot contain a query string.")

            if parsed_origin.fragment:
                raise ValueError("CORS origins cannot contain a fragment.")

            normalized_origin = (
                f"{parsed_origin.scheme.lower()}://" f"{parsed_origin.netloc.lower()}"
            )

            if normalized_origin in seen_origins:
                raise ValueError("CORS origins cannot contain duplicates.")

            seen_origins.add(normalized_origin)
            normalized_origins.append(normalized_origin)

        return normalized_origins

    @model_validator(mode="after")
    def validate_production_security(self) -> Settings:
        if self.app_environment != "production":
            return self

        if not self.session_cookie_secure:
            raise ValueError("Production requires secure session cookies.")

        if not self.cors_origins:
            raise ValueError("Production requires at least one trusted CORS origin.")

        for origin in self.cors_origins:
            normalized_origin = origin.strip().lower()

            if normalized_origin == "*":
                raise ValueError("Production CORS origins cannot contain a wildcard.")

            if not normalized_origin.startswith("https://"):
                raise ValueError("Production CORS origins must use HTTPS.")

            hostname = urlsplit(normalized_origin).hostname

            if hostname in {
                "localhost",
                "127.0.0.1",
                "::1",
            }:
                raise ValueError(
                    "Production CORS origins cannot use local development hosts."
                )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings(_env_file=ROOT_ENV_FILE)
