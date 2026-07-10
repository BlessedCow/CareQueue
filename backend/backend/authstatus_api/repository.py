from __future__ import annotations

from datetime import datetime
from typing import Any

from authstatus_api.crypto import decrypt_auth_record, decrypt_text, encrypt_auth_payload, encrypt_text
from authstatus_api.database import AUTH_EVENT_TABLE_COLUMNS, AUTH_TABLE_COLUMNS, get_conn, init_db

REQUEST_SUBMITTED_EVENT_TYPES = {
    "request submitted",
    "initial authorization",
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
    "completed",
    "discharged",
}

BOOLEAN_FIELDS = {
    "care_manager_enabled",
    "discharge_clinical_needed",
    "no_pa_required",
    "progress_made",
    "facility_informed",
    "waiting_on_clinicals",
}

REVIEW_SYNC_FIELDS = {
    "requested_days",
    "approved_days",
    "auth_start_date",
    "auth_end_date",
    "review_due_date",
}

def _sql_columns(
    payload: dict[str, Any],
    allowed_columns: set[str],
    excluded_columns: set[str],
) -> list[str]:
    return [
        key
        for key in payload
        if key in allowed_columns and key not in excluded_columns
    ]


def _insert_sql(table_name: str, columns: list[str]) -> str:
    column_names = ", ".join(columns)
    placeholders = ", ".join("?" for _ in columns)

    return f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})"  # nosec


def _update_assignments(columns: list[str]) -> str:
    return ", ".join(f"{column} = ?" for column in columns)

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

    for field in {
        "auth_start_date",
        "auth_end_date",
        "programming_days",
        "review_due_date",
        "submitted_at",
        "decision_at",
    }:
        if decrypted.get(field) is None:
            decrypted[field] = ""

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

    for field in {
        "auth_start_date",
        "auth_end_date",
        "review_due_date",
    }:
        if record.get(field) is None:
            record[field] = ""

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


def _status_from_timeline_event(event: dict[str, Any]) -> str | None:
    event_type = _normalize_event_label(event.get("event_type"))
    outcome = _normalize_event_label(event.get("outcome"))

    if event_type == "request submitted" or outcome == "pending":
        return "Pending"

    if outcome in {"approved", "appeal approved", "overturned"}:
        return "Approved"

    if outcome in {"denied", "denied with peer review option", "appeal denied", "upheld"}:
        return "Denied"

    if event_type == "peer review" or outcome in {"scheduled", "peer review scheduled"}:
        return "P2P"

    if event_type == "appeal" or outcome in {"appeal pending"}:
        return "Appealed"

    if outcome == "no pa required":
        return "No PA Required"
    
    if outcome == "completed":
        return "Completed"

    if outcome == "discharged":
        return "Discharged"

    if outcome == "more information needed":
        return "Pending"

    return None


def _timeline_status(events: list[dict[str, Any]]) -> str:
    for event in reversed(events):
        outcome = str(event.get("outcome") or "").strip().lower()
        event_type = str(event.get("event_type") or "").strip().lower()

        if outcome == "completed" or event_type == "authorization complete":
            return "Completed"

        if outcome == "discharged" or event_type == "discharge":
            return "Discharged"
    
    for event in reversed(events):
        status = _status_from_timeline_event(event)

        if status:
            return status

    return "Pending"

def _latest_review_event(events: list[dict[str, Any]]) -> dict[str, Any] | None:
    """
    Returns the newest timeline event that contains review information.
    """

    for event in reversed(events):
        if (
            event.get("auth_start_date")
            or event.get("auth_end_date")
            or event.get("review_due_date")
            or int(event.get("requested_days") or 0) > 0
            or int(event.get("approved_days") or 0) > 0
        ):
            return event

    return None

def _current_auth_snapshot(events: list[dict[str, Any]]) -> dict[str, Any]:
    latest_review = _latest_review_event(events)
    status = _timeline_status(events)

    return {
        "status": status,
        "requested_days": (
            latest_review.get("requested_days") if latest_review else None
        ),
        "approved_days": (
            latest_review.get("approved_days") if latest_review else None
        ),
        "auth_start_date": (
            latest_review.get("auth_start_date") if latest_review else None
        ),
        "auth_end_date": (
            latest_review.get("auth_end_date") if latest_review else None
        ),
        "review_due_date": (
            None
            if status in {"Completed", "Discharged", "No PA Required"}
            else latest_review.get("review_due_date")
            if latest_review
            else None
        ),
    }

def _initial_timeline_event_payload(auth_record: dict[str, Any]) -> dict[str, Any]:
    event_date = str(auth_record.get("auth_start_date") or "").strip()

    if not event_date:
        event_date = str(auth_record.get("created_at") or _now())[:10]

    return {
        "event_type": "Initial Authorization",
        "event_date": event_date,
        "event_time": "",
        "outcome": str(auth_record.get("status") or "Pending"),
        "notes": "Initial authorization created from auth entry.",
        "requested_days": int(auth_record.get("requested_days") or 0),
        "approved_days": int(auth_record.get("approved_days") or 0),
        "auth_start_date": str(auth_record.get("auth_start_date") or ""),
        "auth_end_date": str(auth_record.get("auth_end_date") or ""),
        "review_due_date": str(auth_record.get("review_due_date") or ""),
    }


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
        
        snapshot = _current_auth_snapshot(events)

        conn.execute(
            """
            UPDATE auths
            SET
                submitted_at = ?,
                decision_at = ?,
                status = ?,
                requested_days = COALESCE(?, requested_days),
                approved_days = COALESCE(?, approved_days),
                auth_start_date = COALESCE(?, auth_start_date),
                auth_end_date = COALESCE(?, auth_end_date),
                review_due_date = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                submitted_at,
                decision_at,
                snapshot["status"],
                snapshot["requested_days"],
                snapshot["approved_days"],
                snapshot["auth_start_date"],
                snapshot["auth_end_date"],
                snapshot["review_due_date"],
                _now(),
                auth_id,
            ),
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

    keys = _sql_columns(
        prepared,
        set(AUTH_TABLE_COLUMNS),
        {"id"},
    )
    values = [prepared[key] for key in keys]

    with get_conn() as conn:
        cursor = conn.execute(
            _insert_sql("auths", keys),
            values,
        )
    
        auth_id = int(cursor.lastrowid)

    created_auth = get_auth(auth_id)

    if created_auth is not None:
        create_auth_event(auth_id, _initial_timeline_event_payload(created_auth))
        return get_auth(auth_id)

    return None


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

    keys = _sql_columns(
        prepared,
        set(AUTH_TABLE_COLUMNS),
        {"id", "created_at"},
    )

    if not keys:
        return get_auth(auth_id)

    assignments = _update_assignments(keys)
    values = [prepared[key] for key in keys]

    with get_conn() as conn:
        conn.execute(
            f"UPDATE auths SET {assignments} WHERE id = ?",    # nosec
            [*values, auth_id],
        )

    updated_auth = get_auth(auth_id)

    old_status = str(existing_auth.get("status") or "").strip()
    new_status = str(updated_auth.get("status") or "").strip() if updated_auth else ""

    if old_status == "Pending" and new_status == "Approved":
        create_auth_event(
            auth_id,
            {
                "event_type": "Payer Response",
                "event_date": str(updated_auth.get("decision_at") or _now())[:10],
                "event_time": "",
                "outcome": "Approved",
                "notes": "Authorization marked approved.",
            },
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

    keys = _sql_columns(
        prepared,
        set(AUTH_EVENT_TABLE_COLUMNS),
        {"id"},
    )
    values = [prepared[key] for key in keys]

    with get_conn() as conn:
        cursor = conn.execute(
            _insert_sql("auth_events", keys),
            values,
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

    keys = _sql_columns(
        prepared,
        set(AUTH_EVENT_TABLE_COLUMNS),
        {"id", "auth_id", "created_at"},
    )

    if not keys:
        _sync_auth_timeline_fields(auth_id)
        return get_auth_event(auth_id, event_id)

    assignments = _update_assignments(keys)
    values = [prepared[key] for key in keys]

    with get_conn() as conn:
        conn.execute(
            f"UPDATE auth_events SET {assignments} WHERE auth_id = ? AND id = ?",    # nosec
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