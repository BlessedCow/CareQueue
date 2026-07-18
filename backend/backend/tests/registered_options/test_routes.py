from __future__ import annotations

import pytest
from authstatus_api.crypto import generate_encryption_key
from authstatus_api.database import get_conn
from authstatus_api.main import create_app
from authstatus_api.security.repository import create_user
from authstatus_api.settings import get_settings
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def configure_test_settings(tmp_path, monkeypatch):
    monkeypatch.setenv(
        "AUTHSTATUS_ENCRYPTION_KEY",
        generate_encryption_key(),
    )
    monkeypatch.setenv(
        "AUTHSTATUS_DATABASE_PATH",
        str(tmp_path / "auth_tracker.db"),
    )
    get_settings.cache_clear()

    yield

    get_settings.cache_clear()


@pytest.fixture
def client():
    with TestClient(create_app()) as test_client:
        yield test_client


def auth_headers_for(
    client: TestClient,
    username: str,
    password: str,
) -> dict[str, str]:
    response = client.post(
        "/api/security/login",
        json={
            "username": username,
            "password": password,
        },
    )

    assert response.status_code == 200

    token = client.cookies.get("carequeue_session")

    assert token

    return {
        "Authorization": f"Bearer {token}",
    }


def test_authenticated_user_can_list_registered_options(client):
    create_user(
        "user@example.com",
        "password value",
        role="Read Only",
    )

    response = client.get(
        "/api/registered-options",
        headers=auth_headers_for(
            client,
            "user@example.com",
            "password value",
        ),
    )

    assert response.status_code == 200

    assert [
        (option["category"], option["name"], option["is_protected"])
        for option in response.json()["options"]
    ] == [
        ("facility", "Other", True),
        ("insurance", "Other", True),
        ("web_portal", "Other", True),
    ]


def test_registered_options_list_can_filter_by_category(client):
    create_user(
        "user@example.com",
        "password value",
        role="UR",
    )

    response = client.get(
        "/api/registered-options?category=facility",
        headers=auth_headers_for(
            client,
            "user@example.com",
            "password value",
        ),
    )

    assert response.status_code == 200
    assert response.json()["options"] == [
        {
            "id": response.json()["options"][0]["id"],
            "category": "facility",
            "name": "Other",
            "is_protected": True,
            "created_at": "1970-01-01T00:00:00+00:00",
            "updated_at": "1970-01-01T00:00:00+00:00",
        },
    ]


def test_registered_options_require_authentication(client):
    response = client.get("/api/registered-options")

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Authentication required.",
    }


def test_admin_can_create_registered_option(client):
    create_user(
        "admin@example.com",
        "password value",
        role="Admin",
    )

    response = client.post(
        "/api/registered-options",
        json={
            "category": "facility",
            "name": "  Example   Facility  ",
        },
        headers=auth_headers_for(
            client,
            "admin@example.com",
            "password value",
        ),
    )

    assert response.status_code == 201

    data = response.json()

    assert data["category"] == "facility"
    assert data["name"] == "Example Facility"
    assert data["is_protected"] is False
    assert "normalized_name" not in data


def test_non_admin_cannot_create_registered_option(client):
    create_user(
        "user@example.com",
        "password value",
        role="UR",
    )

    response = client.post(
        "/api/registered-options",
        json={
            "category": "facility",
            "name": "Example Facility",
        },
        headers=auth_headers_for(
            client,
            "user@example.com",
            "password value",
        ),
    )

    assert response.status_code == 403


def test_create_registered_option_rejects_duplicate_name(client):
    create_user(
        "admin@example.com",
        "password value",
        role="Admin",
    )
    headers = auth_headers_for(
        client,
        "admin@example.com",
        "password value",
    )

    first_response = client.post(
        "/api/registered-options",
        json={
            "category": "insurance",
            "name": "Example Insurance",
        },
        headers=headers,
    )
    duplicate_response = client.post(
        "/api/registered-options",
        json={
            "category": "insurance",
            "name": "  EXAMPLE   INSURANCE ",
        },
        headers=headers,
    )

    assert first_response.status_code == 201
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {
        "detail": (
            "A registered option with this name already exists."
        ),
    }


def test_create_registered_option_rejects_blank_name(client):
    create_user(
        "admin@example.com",
        "password value",
        role="Admin",
    )

    response = client.post(
        "/api/registered-options",
        json={
            "category": "web_portal",
            "name": "   ",
        },
        headers=auth_headers_for(
            client,
            "admin@example.com",
            "password value",
        ),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Option name is required.",
    }


def test_admin_can_delete_custom_registered_option(client):
    create_user(
        "admin@example.com",
        "password value",
        role="Admin",
    )
    headers = auth_headers_for(
        client,
        "admin@example.com",
        "password value",
    )

    create_response = client.post(
        "/api/registered-options",
        json={
            "category": "web_portal",
            "name": "Example Portal",
        },
        headers=headers,
    )

    option_id = create_response.json()["id"]

    delete_response = client.delete(
        f"/api/registered-options/{option_id}",
        headers=headers,
    )

    assert delete_response.status_code == 200
    assert delete_response.json() == {"deleted": True}

    list_response = client.get(
        "/api/registered-options?category=web_portal",
        headers=headers,
    )

    assert [
        option["name"]
        for option in list_response.json()["options"]
    ] == ["Other"]


def test_protected_registered_option_cannot_be_deleted(client):
    create_user(
        "admin@example.com",
        "password value",
        role="Admin",
    )
    headers = auth_headers_for(
        client,
        "admin@example.com",
        "password value",
    )

    list_response = client.get(
        "/api/registered-options?category=facility",
        headers=headers,
    )
    protected_option_id = list_response.json()["options"][0]["id"]

    delete_response = client.delete(
        f"/api/registered-options/{protected_option_id}",
        headers=headers,
    )

    assert delete_response.status_code == 400
    assert delete_response.json() == {
        "detail": "Protected registered options cannot be deleted.",
    }


def test_non_admin_cannot_delete_registered_option(client):
    admin = create_user(
        "admin@example.com",
        "admin password value",
        role="Admin",
    )
    create_user(
        "user@example.com",
        "user password value",
        role="UR",
    )

    create_response = client.post(
        "/api/registered-options",
        json={
            "category": "facility",
            "name": "Example Facility",
        },
        headers=auth_headers_for(
            client,
            admin["username"],
            "admin password value",
        ),
    )

    response = client.delete(
        f"/api/registered-options/{create_response.json()['id']}",
        headers=auth_headers_for(
            client,
            "user@example.com",
            "user password value",
        ),
    )

    assert response.status_code == 403


def test_registered_option_changes_write_safe_audit_events(client):
    create_user(
        "admin@example.com",
        "password value",
        role="Admin",
    )
    headers = auth_headers_for(
        client,
        "admin@example.com",
        "password value",
    )

    create_response = client.post(
        "/api/registered-options",
        json={
            "category": "facility",
            "name": "Sensitive Facility Name",
        },
        headers=headers,
    )
    option_id = create_response.json()["id"]

    delete_response = client.delete(
        f"/api/registered-options/{option_id}",
        headers=headers,
    )

    assert create_response.status_code == 201
    assert delete_response.status_code == 200

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT action, resource_id, metadata
            FROM audit_events
            WHERE resource_type = 'registered_option'
            ORDER BY id
            """
        ).fetchall()

    assert [
        (row["action"], row["resource_id"])
        for row in rows
    ] == [
        ("registered_option.create", option_id),
        ("registered_option.delete", option_id),
    ]
    assert all(
        "Sensitive Facility Name" not in row["metadata"]
        for row in rows
    )
    assert all(
        '"category": "facility"' in row["metadata"]
        for row in rows
    )