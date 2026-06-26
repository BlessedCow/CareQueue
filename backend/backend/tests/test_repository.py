from __future__ import annotations

import sqlite3

import pytest
from authstatus_api import crypto
from authstatus_api.repository import (
    create_auth,
    delete_auth,
    get_analytics_summary,
    get_auth,
    list_auths,
    update_auth,
)
from authstatus_api.settings import get_settings


@pytest.fixture(autouse=True)
def configure_test_settings(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTHSTATUS_ENCRYPTION_KEY", crypto.generate_encryption_key())
    monkeypatch.setenv("AUTHSTATUS_DATABASE_PATH", str(tmp_path / "auth_tracker.db"))
    get_settings.cache_clear()

    yield

    get_settings.cache_clear()


def make_payload() -> dict:
    return {
        "facility": "Facility A",
        "client_name": "John Smith",
        "member_id": "ABC123",
        "loc": "RTC",
        "insurance": "Test Plan",
        "insurance_phone": "555-123-4567",
        "insurance_fax": "555-987-6543",
        "submission_methods": "Fax",
        "portal_name": "",
        "fax_numbers": "555-111-2222",
        "live_call_type": "",
        "scheduled_call_at": "",
        "care_manager_enabled": True,
        "care_manager_details": "Jane CM 555-000-0000",
        "notes_links": "Internal note",
        "auth_type": "Concurrent",
        "status": "In Progress",
        "discharge_clinical_needed": False,
        "no_pa_required": False,
        "progress_made": True,
        "facility_informed": False,
        "waiting_on_clinicals": True,
        "los_requested": "7",
        "days_approved": "",
        "auth_start_date": "2026-06-25",
        "auth_end_date": "",
    }


def test_create_auth_returns_decrypted_record():
    created = create_auth(make_payload())

    assert created["id"] == 1
    assert created["client_name"] == "John Smith"
    assert created["member_id"] == "ABC123"
    assert created["facility"] == "Facility A"
    assert created["care_manager_enabled"] is True
    assert created["progress_made"] is True
    assert created["waiting_on_clinicals"] is True


def test_create_auth_stores_selected_fields_encrypted():
    created = create_auth(make_payload())

    database_path = get_settings().database_path

    with sqlite3.connect(database_path) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM auths WHERE id = ?", (created["id"],)).fetchone()

    assert row is not None
    assert row["client_name"].startswith(crypto.ENCRYPTED_TEXT_PREFIX)
    assert row["member_id"].startswith(crypto.ENCRYPTED_TEXT_PREFIX)
    assert row["insurance_phone"].startswith(crypto.ENCRYPTED_TEXT_PREFIX)
    assert row["facility"] == "Facility A"
    assert row["loc"] == "RTC"


def test_list_auths_returns_decrypted_records():
    create_auth(make_payload())

    records = list_auths()

    assert len(records) == 1
    assert records[0]["client_name"] == "John Smith"
    assert records[0]["member_id"] == "ABC123"


def test_get_auth_returns_none_for_missing_record():
    assert get_auth(999) is None


def test_delete_auth_removes_record():
    created = create_auth(make_payload())

    assert delete_auth(created["id"]) is True
    assert get_auth(created["id"]) is None


def test_delete_auth_returns_false_for_missing_record():
    assert delete_auth(999) is False
    
def test_update_auth_updates_selected_fields():
    created = create_auth(make_payload())

    updated = update_auth(
        created["id"],
        {
            "status": "Submitted",
            "days_approved": "4",
            "facility_informed": True,
        },
    )

    assert updated is not None
    assert updated["id"] == created["id"]
    assert updated["status"] == "Submitted"
    assert updated["days_approved"] == "4"
    assert updated["facility_informed"] is True
    assert updated["client_name"] == "John Smith"


def test_update_auth_encrypts_updated_sensitive_fields():
    created = create_auth(make_payload())

    updated = update_auth(
        created["id"],
        {
            "client_name": "Jane Smith",
            "member_id": "XYZ789",
        },
    )

    assert updated is not None
    assert updated["client_name"] == "Jane Smith"
    assert updated["member_id"] == "XYZ789"

    database_path = get_settings().database_path

    with sqlite3.connect(database_path) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM auths WHERE id = ?", (created["id"],)).fetchone()

    assert row is not None
    assert row["client_name"].startswith(crypto.ENCRYPTED_TEXT_PREFIX)
    assert row["member_id"].startswith(crypto.ENCRYPTED_TEXT_PREFIX)
    assert "Jane Smith" not in row["client_name"]
    assert "XYZ789" not in row["member_id"]


def test_update_auth_returns_none_for_missing_record():
    assert update_auth(999, {"status": "Submitted"}) is None


def test_update_auth_with_empty_payload_returns_existing_record():
    created = create_auth(make_payload())

    updated = update_auth(created["id"], {})

    assert updated is not None
    assert updated["id"] == created["id"]
    assert updated["client_name"] == "John Smith"
    

def test_get_analytics_summary_counts_records():
    first_payload = make_payload()
    second_payload = make_payload()
    second_payload["client_name"] = "Jane Smith"
    second_payload["member_id"] = "XYZ789"
    second_payload["loc"] = "PHP"
    second_payload["auth_type"] = "Initial"
    second_payload["status"] = "Submitted"
    second_payload["no_pa_required"] = True
    second_payload["waiting_on_clinicals"] = False

    create_auth(first_payload)
    create_auth(second_payload)

    summary = get_analytics_summary()

    assert summary == {
        "total_auths": 2,
        "by_status": {
            "In Progress": 1,
            "Submitted": 1,
        },
        "by_loc": {
            "RTC": 1,
            "PHP": 1,
        },
        "by_auth_type": {
            "Concurrent": 1,
            "Initial": 1,
        },
        "no_pa_required": 1,
        "waiting_on_clinicals": 1,
    }