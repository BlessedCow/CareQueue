from __future__ import annotations

import sqlite3

import pytest
from authstatus_api.crypto import ENCRYPTED_TEXT_PREFIX, generate_encryption_key
from authstatus_api.main import create_app
from authstatus_api.security.repository import create_user
from authstatus_api.settings import get_settings
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def configure_test_settings(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTHSTATUS_ENCRYPTION_KEY", generate_encryption_key())
    monkeypatch.setenv("AUTHSTATUS_DATABASE_PATH", str(tmp_path / "auth_tracker.db"))
    get_settings.cache_clear()

    yield

    get_settings.cache_clear()

@pytest.fixture
def auth_headers(client):
    create_user("ur@example.com", "correct horse battery staple", role="UR")

    response = client.post(
        "/api/security/login",
        json={
            "username": "ur@example.com",
            "password": "correct horse battery staple",
        },
    )

    assert response.status_code == 200

    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def client():
    with TestClient(create_app()) as test_client:
        yield test_client


def make_payload() -> dict:
    return {
        "facility": "Facility A",
        "client_name": "John Smith",
        "member_id": "ABC123",
        "group_number": "GRP456",
        "date_of_birth": "1990-01-15",
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


def test_health_endpoint(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "app": "AuthStatus API",
        "version": "0.1.0",
    }


def test_create_auth_endpoint_returns_decrypted_record(client, auth_headers):
    response = client.post("/api/auths", json=make_payload(), headers=auth_headers)

    assert response.status_code == 201

    data = response.json()

    assert data["id"] == 1
    assert data["client_name"] == "John Smith"
    assert data["member_id"] == "ABC123"
    assert data["group_number"] == "GRP456"
    assert data["date_of_birth"] == "1990-01-15"
    assert data["facility"] == "Facility A"
    assert data["care_manager_enabled"] is True
    assert data["progress_made"] is True
    assert data["waiting_on_clinicals"] is True


def test_create_auth_endpoint_stores_selected_fields_encrypted(client, auth_headers):
    response = client.post("/api/auths", json=make_payload(), headers=auth_headers)

    assert response.status_code == 201

    database_path = get_settings().database_path

    with sqlite3.connect(database_path) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM auths WHERE id = 1").fetchone()

    assert row is not None
    assert row["client_name"].startswith(ENCRYPTED_TEXT_PREFIX)
    assert row["member_id"].startswith(ENCRYPTED_TEXT_PREFIX)
    assert row["group_number"].startswith(ENCRYPTED_TEXT_PREFIX)
    assert row["date_of_birth"].startswith(ENCRYPTED_TEXT_PREFIX)
    assert row["insurance_phone"].startswith(ENCRYPTED_TEXT_PREFIX)
    assert row["insurance_fax"].startswith(ENCRYPTED_TEXT_PREFIX)
    assert row["fax_numbers"].startswith(ENCRYPTED_TEXT_PREFIX)
    assert row["facility"] == "Facility A"
    assert row["loc"] == "RTC"


def test_list_auths_endpoint_returns_decrypted_records(client, auth_headers):
    create_response = client.post("/api/auths", json=make_payload(), headers=auth_headers)

    assert create_response.status_code == 201

    response = client.get("/api/auths", headers=auth_headers)

    assert response.status_code == 200

    data = response.json()

    assert len(data["auths"]) == 1
    assert data["auths"][0]["client_name"] == "John Smith"
    assert data["auths"][0]["member_id"] == "ABC123"
    assert data["auths"][0]["group_number"] == "GRP456"
    assert data["auths"][0]["date_of_birth"] == "1990-01-15"


def test_get_auth_endpoint_returns_decrypted_record(client, auth_headers):
    create_response = client.post("/api/auths", json=make_payload(), headers=auth_headers)

    assert create_response.status_code == 201

    response = client.get("/api/auths/1", headers=auth_headers)

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == 1
    assert data["client_name"] == "John Smith"
    assert data["member_id"] == "ABC123"


def test_get_auth_endpoint_returns_404_for_missing_record(client, auth_headers):
    response = client.get("/api/auths/999", headers=auth_headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Auth record not found."}


def test_delete_auth_endpoint_removes_record(client, auth_headers):
    create_response = client.post("/api/auths", json=make_payload(), headers=auth_headers)

    assert create_response.status_code == 201

    delete_response = client.delete("/api/auths/1", headers=auth_headers)

    assert delete_response.status_code == 200
    assert delete_response.json() == {"deleted": True, "id": 1}

    get_response = client.get("/api/auths/1", headers=auth_headers)

    assert get_response.status_code == 404


def test_delete_auth_endpoint_returns_404_for_missing_record(client, auth_headers):
    response = client.delete("/api/auths/999", headers=auth_headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Auth record not found."}


def test_create_auth_endpoint_rejects_unknown_fields(client, auth_headers):
    payload = make_payload()
    payload["unexpected_field"] = "not allowed"

    response = client.post("/api/auths", json=payload, headers=auth_headers)

    assert response.status_code == 422
    
def test_patch_auth_endpoint_updates_selected_fields(client, auth_headers):
    create_response = client.post("/api/auths", json=make_payload(), headers=auth_headers)

    assert create_response.status_code == 201

    response = client.patch(
        "/api/auths/1",
        json={
            "status": "Submitted",
            "days_approved": "4",
            "facility_informed": True,
        },
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == 1
    assert data["status"] == "Submitted"
    assert data["days_approved"] == "4"
    assert data["facility_informed"] is True
    assert data["client_name"] == "John Smith"


def test_patch_auth_endpoint_encrypts_updated_sensitive_fields(client, auth_headers):
    create_response = client.post("/api/auths", json=make_payload(), headers=auth_headers)

    assert create_response.status_code == 201

    response = client.patch(
        "/api/auths/1",
        json={
            "client_name": "Jane Smith",
            "member_id": "XYZ789",
        },
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["client_name"] == "Jane Smith"
    assert data["member_id"] == "XYZ789"

    database_path = get_settings().database_path

    with sqlite3.connect(database_path) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM auths WHERE id = 1").fetchone()

    assert row is not None
    assert row["client_name"].startswith(ENCRYPTED_TEXT_PREFIX)
    assert row["member_id"].startswith(ENCRYPTED_TEXT_PREFIX)
    assert "Jane Smith" not in row["client_name"]
    assert "XYZ789" not in row["member_id"]


def test_patch_auth_endpoint_returns_404_for_missing_record(client, auth_headers):
    response = client.patch(
        "/api/auths/999",
        json={"status": "Submitted"},
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Auth record not found."}


def test_patch_auth_endpoint_rejects_unknown_fields(client, auth_headers):
    create_response = client.post("/api/auths", json=make_payload(), headers=auth_headers)

    assert create_response.status_code == 201

    response = client.patch(
        "/api/auths/1",
        json={"unexpected_field": "not allowed"},
        headers=auth_headers,
    )

    assert response.status_code == 422
    

def test_auth_routes_require_authentication(client):
    response = client.get("/api/auths")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required."}


def test_read_only_user_can_view_auths(client):
    create_user("readonly@example.com", "correct horse battery staple", role="Read Only")

    login_response = client.post(
        "/api/security/login",
        json={
            "username": "readonly@example.com",
            "password": "correct horse battery staple",
        },
    )

    token = login_response.json()["access_token"]

    response = client.get(
        "/api/auths",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_read_only_user_cannot_create_auth(client):
    create_user("readonly@example.com", "correct horse battery staple", role="Read Only")

    login_response = client.post(
        "/api/security/login",
        json={
            "username": "readonly@example.com",
            "password": "correct horse battery staple",
        },
    )

    token = login_response.json()["access_token"]

    response = client.post(
        "/api/auths",
        json=make_payload(),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Operation not permitted for this role."}

def test_analytics_summary_endpoint_counts_records(client, auth_headers):
    first_payload = make_payload()
    second_payload = make_payload()
    second_payload["client_name"] = "Jane Smith"
    second_payload["member_id"] = "XYZ789"
    second_payload["loc"] = "PHP"
    second_payload["auth_type"] = "Initial"
    second_payload["status"] = "Submitted"
    second_payload["no_pa_required"] = True
    second_payload["waiting_on_clinicals"] = False

    assert (
        client.post("/api/auths", json=first_payload, headers=auth_headers).status_code
        == 201
    )
    assert (
        client.post("/api/auths", json=second_payload, headers=auth_headers).status_code
        == 201
    )

    response = client.get("/api/analytics/summary", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {
        "total_auths": 2,
        "by_status": {
            "Pending": 2,
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