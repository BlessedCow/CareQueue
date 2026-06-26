from __future__ import annotations

from datetime import datetime
from typing import Any

from authstatus_api.crypto import decrypt_auth_record, encrypt_auth_payload
from authstatus_api.database import AUTH_TABLE_COLUMNS, get_conn, init_db

BOOLEAN_FIELDS = {
    "care_manager_enabled",
    "discharge_clinical_needed",
    "no_pa_required",
    "progress_made",
    "facility_informed",
    "waiting_on_clinicals",
}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _row_to_dict(row: Any) -> dict[str, Any]:
    record = dict(row)
    decrypted = decrypt_auth_record(record)

    for field in BOOLEAN_FIELDS:
        if field in decrypted:
            decrypted[field] = bool(decrypted[field])

    return decrypted


def _prepare_payload(payload: dict[str, Any]) -> dict[str, Any]:
    prepared = payload.copy()

    for field in BOOLEAN_FIELDS:
        if field in prepared:
            prepared[field] = int(bool(prepared[field]))

    return encrypt_auth_payload(prepared)


def create_auth(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()

    now = _now()
    prepared = _prepare_payload(payload)
    prepared["created_at"] = now
    prepared["updated_at"] = now

    allowed_payload = {
        key: value
        for key, value in prepared.items()
        if key in AUTH_TABLE_COLUMNS and key != "id"
    }

    keys = list(allowed_payload)
    columns = ", ".join(keys)
    placeholders = ", ".join("?" for _ in keys)

    with get_conn() as conn:
        cursor = conn.execute(
            f"INSERT INTO auths ({columns}) VALUES ({placeholders})",
            [allowed_payload[key] for key in keys],
        )
        auth_id = int(cursor.lastrowid)

    return get_auth(auth_id)


def list_auths() -> list[dict[str, Any]]:
    init_db()

    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM auths ORDER BY auth_start_date, client_name").fetchall()

    return [_row_to_dict(row) for row in rows]


def get_auth(auth_id: int) -> dict[str, Any] | None:
    init_db()

    with get_conn() as conn:
        row = conn.execute("SELECT * FROM auths WHERE id = ?", (auth_id,)).fetchone()

    if row is None:
        return None

    return _row_to_dict(row)


def update_auth(auth_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    init_db()

    if get_auth(auth_id) is None:
        return None

    prepared = _prepare_payload(payload)
    prepared["updated_at"] = _now()

    allowed_payload = {
        key: value
        for key, value in prepared.items()
        if key in AUTH_TABLE_COLUMNS and key not in {"id", "created_at"}
    }

    if not allowed_payload:
        return get_auth(auth_id)

    assignments = ", ".join(f"{key} = ?" for key in allowed_payload)
    values = [allowed_payload[key] for key in allowed_payload]

    with get_conn() as conn:
        conn.execute(
            f"UPDATE auths SET {assignments} WHERE id = ?",
            [*values, auth_id],
        )

    return get_auth(auth_id)


def delete_auth(auth_id: int) -> bool:
    init_db()

    with get_conn() as conn:
        cursor = conn.execute("DELETE FROM auths WHERE id = ?", (auth_id,))

    return cursor.rowcount > 0

def get_analytics_summary() -> dict[str, Any]:
    records = list_auths()

    by_status: dict[str, int] = {}
    by_loc: dict[str, int] = {}
    by_auth_type: dict[str, int] = {}

    no_pa_required = 0
    waiting_on_clinicals = 0

    for record in records:
        status = record.get("status") or "Unknown"
        loc = record.get("loc") or "Unknown"
        auth_type = record.get("auth_type") or "Unknown"

        by_status[status] = by_status.get(status, 0) + 1
        by_loc[loc] = by_loc.get(loc, 0) + 1
        by_auth_type[auth_type] = by_auth_type.get(auth_type, 0) + 1

        if record.get("no_pa_required"):
            no_pa_required += 1

        if record.get("waiting_on_clinicals"):
            waiting_on_clinicals += 1

    return {
        "total_auths": len(records),
        "by_status": by_status,
        "by_loc": by_loc,
        "by_auth_type": by_auth_type,
        "no_pa_required": no_pa_required,
        "waiting_on_clinicals": waiting_on_clinicals,
    }