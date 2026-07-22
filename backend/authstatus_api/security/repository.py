from __future__ import annotations

import sqlite3
from typing import Any

from authstatus_api.persistence.connections import get_conn
from authstatus_api.persistence.schema import init_db
from backend.authstatus_api.security.mappings import (
    format_datetime,
    parse_datetime,
    session_row_to_dict,
    user_row_to_dict,
)
from authstatus_api.security.password_hashing import hash_password, verify_password
from authstatus_api.security.sessions import (
    DEFAULT_SESSION_MINUTES,
    generate_session_token,
    hash_session_token,
    is_session_expired,
    session_expiration,
    utc_now,
)


def create_user(
    username: str,
    password: str,
    role: str = "UR",
    *,
    must_change_password: bool = False,
) -> dict[str, Any]:
    init_db()

    normalized_username = username.strip().lower()
    now = format_datetime(utc_now())
    password_hash = hash_password(password)

    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO users (
                username,
                password_hash,
                role,
                password_changed_at,
                must_change_password,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                normalized_username,
                password_hash,
                role,
                now,
                1 if must_change_password else 0,
                now,
                now,
            ),
        )

        user_id = cursor.lastrowid

    user = get_user_by_id(int(user_id))
    if user is None:
        raise RuntimeError("Unable to create user.")

    return user


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    init_db()

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()

    return user_row_to_dict(row)


def get_user_by_username(username: str) -> dict[str, Any] | None:
    init_db()

    normalized_username = username.strip().lower()

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM users
            WHERE username = ?
            """,
            (normalized_username,),
        ).fetchone()

    return user_row_to_dict(row)


def list_users() -> list[dict[str, Any]]:
    init_db()

    with get_conn() as conn:
        rows = conn.execute("""
            SELECT *
            FROM users
            ORDER BY username
            """).fetchall()

    return [user_row_to_dict(row) for row in rows if row is not None]


def update_user(
    user_id: int,
    *,
    role: str | None = None,
    is_active: bool | None = None,
) -> dict[str, Any] | None:
    init_db()

    updates: list[str] = []
    values: list[Any] = []

    if role is not None:
        updates.append("role = ?")
        values.append(role)

    if is_active is not None:
        updates.append("is_active = ?")
        values.append(1 if is_active else 0)

    if not updates:
        return get_user_by_id(user_id)

    updates.append("updated_at = ?")
    values.append(format_datetime(utc_now()))
    values.append(user_id)

    try:
        with get_conn() as conn:
            cursor = conn.execute(
                f"""
                UPDATE users
                SET {", ".join(updates)}
                WHERE id = ?
                """,
                values,
            )
    except sqlite3.IntegrityError:
        raise

    if cursor.rowcount == 0:
        return None

    return get_user_by_id(user_id)


def update_user_password(
    user_id: int,
    *,
    new_password: str,
    must_change_password: bool,
) -> dict[str, Any] | None:
    init_db()

    now = format_datetime(utc_now())
    password_hash = hash_password(new_password)

    with get_conn() as conn:
        cursor = conn.execute(
            """
            UPDATE users
            SET
                password_hash = ?,
                password_changed_at = ?,
                must_change_password = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                password_hash,
                now,
                1 if must_change_password else 0,
                now,
                user_id,
            ),
        )

    if cursor.rowcount == 0:
        return None

    return get_user_by_id(user_id)


def revoke_user_sessions(user_id: int) -> int:
    init_db()

    now = format_datetime(utc_now())

    with get_conn() as conn:
        cursor = conn.execute(
            """
            UPDATE sessions
            SET revoked_at = ?
            WHERE user_id = ?
              AND revoked_at IS NULL
            """,
            (
                now,
                user_id,
            ),
        )

    return cursor.rowcount


def create_user_session(
    user_id: int,
    *,
    minutes: int = DEFAULT_SESSION_MINUTES,
    ip_address: str = "",
    user_agent: str = "",
) -> dict[str, Any]:
    init_db()

    token = generate_session_token()
    token_hash = hash_session_token(token)
    now = format_datetime(utc_now())
    expires_at = format_datetime(session_expiration(minutes=minutes))

    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO sessions (
                user_id,
                token_hash,
                created_at,
                last_seen_at,
                expires_at,
                ip_address,
                user_agent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                token_hash,
                now,
                now,
                expires_at,
                ip_address,
                user_agent,
            ),
        )

        session_id = cursor.lastrowid

    session = get_session_by_id(int(session_id))
    if session is None:
        raise RuntimeError("Unable to create session.")

    return {
        "token": token,
        "session": session,
    }


def get_session_by_id(session_id: int) -> dict[str, Any] | None:
    init_db()

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM sessions
            WHERE id = ?
            """,
            (session_id,),
        ).fetchone()

    return session_row_to_dict(row)


def get_active_session_by_token(token: str) -> dict[str, Any] | None:
    init_db()

    token_hash = hash_session_token(token)

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM sessions
            WHERE token_hash = ?
              AND revoked_at IS NULL
            """,
            (token_hash,),
        ).fetchone()

    session = session_row_to_dict(row)

    if session is None:
        return None

    if is_session_expired(parse_datetime(session["expires_at"])):
        return None

    return session


def touch_session(token: str) -> None:
    init_db()

    token_hash = hash_session_token(token)
    now = format_datetime(utc_now())

    with get_conn() as conn:
        conn.execute(
            """
            UPDATE sessions
            SET last_seen_at = ?
            WHERE token_hash = ?
              AND revoked_at IS NULL
            """,
            (now, token_hash),
        )


def revoke_session(token: str) -> bool:
    init_db()

    token_hash = hash_session_token(token)
    now = format_datetime(utc_now())

    with get_conn() as conn:
        cursor = conn.execute(
            """
            UPDATE sessions
            SET revoked_at = ?
            WHERE token_hash = ?
              AND revoked_at IS NULL
            """,
            (now, token_hash),
        )

    return cursor.rowcount > 0


def record_successful_login(user_id: int) -> None:
    init_db()

    now = format_datetime(utc_now())

    with get_conn() as conn:
        conn.execute(
            """
            UPDATE users
            SET
                failed_login_count = 0,
                last_login_at = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (now, now, user_id),
        )


def authenticate_user(username: str, password: str) -> dict[str, Any] | None:
    user = get_user_by_username(username)

    if user is None:
        return None

    if not user["is_active"]:
        return None

    if not verify_password(user["password_hash"], password):
        return None

    record_successful_login(user["id"])

    refreshed_user = get_user_by_id(user["id"])
    if refreshed_user is None:
        return None

    return refreshed_user


def get_user_for_session_token(token: str) -> dict[str, Any] | None:
    session = get_active_session_by_token(token)

    if session is None:
        return None

    user = get_user_by_id(session["user_id"])

    if user is None or not user["is_active"]:
        return None

    touch_session(token)

    return user
