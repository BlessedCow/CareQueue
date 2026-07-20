from __future__ import annotations

from typing import Any

from authstatus_api.crypto import (
    decrypt_auth_record,
    decrypt_text,
    encrypt_auth_payload,
    encrypt_text,
)

BOOLEAN_FIELDS = {
    "care_manager_enabled",
    "discharge_clinical_needed",
    "no_pa_required",
    "progress_made",
    "facility_informed",
    "waiting_on_clinicals",
}

OPTIONAL_AUTH_DATE_FIELDS = {
    "auth_start_date",
    "auth_end_date",
    "programming_days",
    "review_due_date",
    "submitted_at",
    "decision_at",
}

OPTIONAL_EVENT_DATE_FIELDS = {
    "auth_start_date",
    "auth_end_date",
    "review_due_date",
}


def auth_row_to_dict(row: Any) -> dict[str, Any]:
    record = dict(row)
    decrypted = decrypt_auth_record(record)

    for field in BOOLEAN_FIELDS:
        if field in decrypted:
            decrypted[field] = bool(decrypted[field])

    for field in OPTIONAL_AUTH_DATE_FIELDS:
        if decrypted.get(field) is None:
            decrypted[field] = ""

    return decrypted


def prepare_auth_payload(
    payload: dict[str, Any],
) -> dict[str, Any]:
    prepared = payload.copy()

    for field in BOOLEAN_FIELDS:
        if field in prepared:
            prepared[field] = int(bool(prepared[field]))

    return encrypt_auth_payload(prepared)


def auth_event_row_to_dict(row: Any) -> dict[str, Any]:
    record = dict(row)

    if "notes" in record:
        record["notes"] = decrypt_text(record["notes"])

    for field in OPTIONAL_EVENT_DATE_FIELDS:
        if record.get(field) is None:
            record[field] = ""

    return record


def prepare_auth_event_payload(
    payload: dict[str, Any],
) -> dict[str, Any]:
    prepared = payload.copy()

    if "notes" in prepared:
        prepared["notes"] = encrypt_text(prepared["notes"])

    return prepared
