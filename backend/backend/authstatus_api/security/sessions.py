from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

SESSION_TOKEN_BYTES = 32
DEFAULT_SESSION_MINUTES = 30


def generate_session_token() -> str:
    return secrets.token_urlsafe(SESSION_TOKEN_BYTES)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def utc_now() -> datetime:
    return datetime.now(UTC)


def session_expiration(minutes: int = DEFAULT_SESSION_MINUTES) -> datetime:
    return utc_now() + timedelta(minutes=minutes)


def is_session_expired(expires_at: datetime, now: datetime | None = None) -> bool:
    current_time = now or utc_now()
    return expires_at <= current_time