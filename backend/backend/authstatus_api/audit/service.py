from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from fastapi import Request

from authstatus_api.database import get_conn, init_db


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def _client_ip(request: Request | None) -> str:
    if request is None or request.client is None:
        return ""

    return request.client.host


def _user_agent(request: Request | None) -> str:
    if request is None:
        return ""

    return request.headers.get("user-agent", "")


def _safe_metadata(metadata: dict[str, Any] | None) -> str:
    return json.dumps(metadata or {}, sort_keys=True)


def audit_field_names(payload: dict[str, Any]) -> dict[str, list[str]]:
    return {"fields": sorted(payload.keys())}


def record_audit_event(
    *,
    action: str,
    resource_type: str,
    user: dict[str, Any] | None = None,
    resource_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    request: Request | None = None,
    username: str | None = None,
) -> dict[str, Any]:
    init_db()

    created_at = _now()
    user_id = user["id"] if user else None
    audit_username = username or (user["username"] if user else None)

    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO audit_events (
                user_id,
                username,
                action,
                resource_type,
                resource_id,
                metadata,
                ip_address,
                user_agent,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                audit_username,
                action,
                resource_type,
                resource_id,
                _safe_metadata(metadata),
                _client_ip(request),
                _user_agent(request),
                created_at,
            ),
        )

        audit_id = int(cursor.lastrowid)
        row = conn.execute(
            """
            SELECT *
            FROM audit_events
            WHERE id = ?
            """,
            (audit_id,),
        ).fetchone()

    return dict(row)