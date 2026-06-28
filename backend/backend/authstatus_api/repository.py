from __future__ import annotations

from datetime import datetime
from typing import Any

from authstatus_api.crypto import decrypt_auth_record, decrypt_text, encrypt_auth_payload, encrypt_text
from authstatus_api.database import AUTH_EVENT_TABLE_COLUMNS, AUTH_TABLE_COLUMNS, get_conn, init_db

REQUEST_SUBMITTED_EVENT_TYPES = {
    "request submitted",
}

TERMINAL_EVENT_TYPES = {
    "payer response",
    "peer review",
    "appeal",
}

TERMINAL_OUTCOMES = {
    "approved",
    "denied",
    "denied with peer review option",
    "more information needed",
    "no pa required",
    "appeal approved",
    "appeal denied",
    "upheld",
    "overturned",
}

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

def _has_decision(payload: dict[str, Any]) -> bool:
    status = str(payload.get("status") or "").strip().lower()
    approved_days = payload.get("approved_days")

    if status in {"approved", "denied", "appealed", "p2p"}:
        return True

    if approved_days is None:
        return False

    try:
        return int(approved_days) > 0
    except (TypeError, ValueError):
        return False


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


def _row_to_event_dict(row: Any) -> dict[str, Any]:
    record = dict(row)

    if "notes" in record:
        record["notes"] = decrypt_text(record["notes"])

    return record


def _prepare_event_payload(payload: dict[str, Any]) -> dict[str, Any]:
    prepared = payload.copy()

    if "notes" in prepared:
        prepared["notes"] = encrypt_text(prepared["notes"])

    return prepared


def _normalize_event_label(value: Any) -> str:
    return str(value or "").strip().lower()


def _event_datetime_value(event: dict[str, Any]) -> str:
    event_date = str(event.get("event_date") or "").strip()
    event_time = str(event.get("event_time") or "").strip()

    if not event_date:
        return ""

    if not event_time:
        return f"{event_date}T00:00:00"

    if len(event_time) == 5:
        return f"{event_date}T{event_time}:00"

    return f"{event_date}T{event_time}"


def _is_request_submitted_event(event: dict[str, Any]) -> bool:
    return _normalize_event_label(event.get("event_type")) in REQUEST_SUBMITTED_EVENT_TYPES


def _is_terminal_event(event: dict[str, Any]) -> bool:
    event_type = _normalize_event_label(event.get("event_type"))
    outcome = _normalize_event_label(event.get("outcome"))

    return event_type in TERMINAL_EVENT_TYPES or outcome in TERMINAL_OUTCOMES


def _sync_auth_timeline_fields(auth_id: int) -> None:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM auth_events
            WHERE auth_id = ?
            ORDER BY event_date, event_time, id
            """,
            (auth_id,),
        ).fetchall()

        events = [_row_to_event_dict(row) for row in rows]

        submitted_at = next(
            (_event_datetime_value(event) for event in events if _is_request_submitted_event(event)),
            None,
        )

        if submitted_at is None and events:
            submitted_at = _event_datetime_value(events[0]) or None

        decision_at = next(
            (_event_datetime_value(event) for event in events if _is_terminal_event(event)),
            None,
        )

        conn.execute(
            """
            UPDATE auths
            SET submitted_at = ?, decision_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (submitted_at, decision_at, _now(), auth_id),
        )

def create_auth(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()

    now = _now()
    prepared = _prepare_payload(payload)
    prepared["created_at"] = now
    prepared["updated_at"] = now

    if not prepared.get("submitted_at"):
        prepared["submitted_at"] = now

    if _has_decision(prepared) and not prepared.get("decision_at"):
        prepared["decision_at"] = now

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

    existing_auth = get_auth(auth_id)

    if existing_auth is None:
        return None

    prepared = _prepare_payload(payload)
    now = _now()
    prepared["updated_at"] = now

    if not existing_auth.get("decision_at") and _has_decision(prepared):
        prepared["decision_at"] = now
    elif not prepared.get("decision_at"):
        prepared.pop("decision_at", None)

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


def create_auth_event(auth_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    init_db()

    if get_auth(auth_id) is None:
        return None

    now = _now()
    prepared = _prepare_event_payload(payload)
    prepared["auth_id"] = auth_id
    prepared["created_at"] = now
    prepared["updated_at"] = now

    allowed_payload = {
        key: value
        for key, value in prepared.items()
        if key in AUTH_EVENT_TABLE_COLUMNS and key != "id"
    }

    keys = list(allowed_payload)
    columns = ", ".join(keys)
    placeholders = ", ".join("?" for _ in keys)

    with get_conn() as conn:
        cursor = conn.execute(
            f"INSERT INTO auth_events ({columns}) VALUES ({placeholders})",
            [allowed_payload[key] for key in keys],
        )
        event_id = int(cursor.lastrowid)

    _sync_auth_timeline_fields(auth_id)

    return get_auth_event(auth_id, event_id)


def list_auth_events(auth_id: int) -> list[dict[str, Any]] | None:
    init_db()

    if get_auth(auth_id) is None:
        return None

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM auth_events
            WHERE auth_id = ?
            ORDER BY event_date, event_time, id
            """,
            (auth_id,),
        ).fetchall()

    return [_row_to_event_dict(row) for row in rows]


def get_auth_event(auth_id: int, event_id: int) -> dict[str, Any] | None:
    init_db()

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM auth_events
            WHERE auth_id = ? AND id = ?
            """,
            (auth_id, event_id),
        ).fetchone()

    if row is None:
        return None

    return _row_to_event_dict(row)


def update_auth_event(
    auth_id: int,
    event_id: int,
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    init_db()

    if get_auth_event(auth_id, event_id) is None:
        return None

    prepared = _prepare_event_payload(payload)
    prepared["updated_at"] = _now()

    allowed_payload = {
        key: value
        for key, value in prepared.items()
        if key in AUTH_EVENT_TABLE_COLUMNS and key not in {"id", "auth_id", "created_at"}
    }

    if not allowed_payload:
        _sync_auth_timeline_fields(auth_id)
        return get_auth_event(auth_id, event_id)

    assignments = ", ".join(f"{key} = ?" for key in allowed_payload)
    values = [allowed_payload[key] for key in allowed_payload]

    with get_conn() as conn:
        conn.execute(
            f"UPDATE auth_events SET {assignments} WHERE auth_id = ? AND id = ?",
            [*values, auth_id, event_id],
        )

    _sync_auth_timeline_fields(auth_id)

    return get_auth_event(auth_id, event_id)


def delete_auth_event(auth_id: int, event_id: int) -> bool:
    init_db()

    with get_conn() as conn:
        cursor = conn.execute(
            "DELETE FROM auth_events WHERE auth_id = ? AND id = ?",
            (auth_id, event_id),
        )
        deleted = cursor.rowcount > 0

    if deleted:
        _sync_auth_timeline_fields(auth_id)

    return deleted


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