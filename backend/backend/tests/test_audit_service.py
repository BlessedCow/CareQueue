from __future__ import annotations

import json

import pytest
from authstatus_api.audit.service import audit_field_names, record_audit_event
from authstatus_api.crypto import generate_encryption_key
from authstatus_api.database import get_conn, init_db
from authstatus_api.security.repository import create_user
from authstatus_api.settings import get_settings


@pytest.fixture(autouse=True)
def configure_test_settings(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTHSTATUS_ENCRYPTION_KEY", generate_encryption_key())
    monkeypatch.setenv("AUTHSTATUS_DATABASE_PATH", str(tmp_path / "auth_tracker.db"))
    get_settings.cache_clear()

    yield

    get_settings.cache_clear()


def test_init_db_creates_audit_events_table():
    init_db()

    with get_conn() as conn:
        columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(audit_events)").fetchall()
        }

    assert {
        "id",
        "user_id",
        "username",
        "action",
        "resource_type",
        "resource_id",
        "metadata",
        "ip_address",
        "user_agent",
        "created_at",
    }.issubset(columns)


def test_record_audit_event_stores_user_and_metadata():
    user = create_user("audit@example.com", "correct horse battery staple", role="Admin")

    event = record_audit_event(
        action="auth.update",
        resource_type="auth",
        resource_id=123,
        user=user,
        metadata={"fields": ["status"]},
    )

    assert event["user_id"] == user["id"]
    assert event["username"] == "audit@example.com"
    assert event["action"] == "auth.update"
    assert event["resource_type"] == "auth"
    assert event["resource_id"] == 123
    assert json.loads(event["metadata"]) == {"fields": ["status"]}
    assert event["created_at"]


def test_audit_field_names_logs_only_field_names():
    metadata = audit_field_names(
        {
            "client_name": "Sensitive Name",
            "member_id": "ABC123",
            "status": "Approved",
        }
    )

    assert metadata == {"fields": ["client_name", "member_id", "status"]}