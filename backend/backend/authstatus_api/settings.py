from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PACKAGE_ROOT = Path(__file__).resolve().parents[0]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(__file__).resolve().parents[3]
ROOT_ENV_FILE = PROJECT_ROOT / ".env"


def resolve_project_path(path: Path) -> Path:
    if path.is_absolute():
        return path.resolve()

    return (PROJECT_ROOT / path).resolve()


class Settings(BaseSettings):
    app_name: str = "AuthStatus API"
    app_version: str = "0.1.0"

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
    encryption_key: str = Field(default="", validation_alias="AUTHSTATUS_ENCRYPTION_KEY")
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"],
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
    
    @field_validator("database_encryption")
    @classmethod
    def validate_database_encryption(cls, value: str) -> str:
        normalized_value = value.strip().lower()

        if normalized_value not in {"plaintext", "sqlcipher"}:
            raise ValueError("database_encryption must be plaintext or sqlcipher.")

        return normalized_value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]

        return value


@lru_cache
def get_settings() -> Settings:
    return Settings(_env_file=ROOT_ENV_FILE)