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
    monkeypatch.setenv("AUTHSTATUS_ENCRYPTION_KEY", generate_encryption_key())
    monkeypatch.setenv("AUTHSTATUS_DATABASE_PATH", str(tmp_path / "auth_tracker.db"))
    get_settings.cache_clear()

    yield

    get_settings.cache_clear()


@pytest.fixture
def client():
    with TestClient(create_app()) as test_client:
        yield test_client


def auth_headers_for(client: TestClient, username: str, password: str) -> dict[str, str]:
    response = client.post(
        "/api/security/login",
        json={
            "username": username,
            "password": password,
        },
    )

    assert response.status_code == 200

    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


def test_login_returns_bearer_token_and_user(client):
    create_user("user@example.com", "correct horse battery staple", role="Admin")

    response = client.post(
        "/api/security/login",
        json={
            "username": "user@example.com",
            "password": "correct horse battery staple",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["expires_at"]
    assert data["user"]["username"] == "user@example.com"
    assert data["user"]["role"] == "Admin"
    assert "password_hash" not in data["user"]


def test_login_rejects_wrong_password(client):
    create_user("user@example.com", "correct horse battery staple", role="UR")

    response = client.post(
        "/api/security/login",
        json={
            "username": "user@example.com",
            "password": "wrong password",
        },
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid username or password."}
    
    
def test_failed_login_writes_audit_event(client):
    create_user("user@example.com", "correct horse battery staple", role="UR")

    response = client.post(
        "/api/security/login",
        json={
            "username": "user@example.com",
            "password": "wrong password",
        },
    )

    assert response.status_code == 401

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT action, username, metadata
            FROM audit_events
            """
        ).fetchone()

    assert row["action"] == "security.login_failed"
    assert row["username"] == "user@example.com"


def test_login_rejects_unknown_user(client):
    response = client.post(
        "/api/security/login",
        json={
            "username": "missing@example.com",
            "password": "password",
        },
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid username or password."}


def test_me_returns_current_user(client):
    create_user("user@example.com", "correct horse battery staple", role="UR")

    login_response = client.post(
        "/api/security/login",
        json={
            "username": "user@example.com",
            "password": "correct horse battery staple",
        },
    )

    token = login_response.json()["access_token"]

    response = client.get(
        "/api/security/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["user"]["username"] == "user@example.com"
    assert data["user"]["role"] == "UR"


def test_admin_can_list_users(client):
    create_user("admin@example.com", "correct horse battery staple", role="Admin")
    create_user("ur@example.com", "correct horse battery staple", role="UR")

    response = client.get(
        "/api/security/users",
        headers=auth_headers_for(
            client,
            "admin@example.com",
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 200

    data = response.json()

    assert [user["username"] for user in data["users"]] == [
        "admin@example.com",
        "ur@example.com",
    ]
    assert "password_hash" not in data["users"][0]


def test_ur_user_cannot_list_users(client):
    create_user("ur@example.com", "correct horse battery staple", role="UR")

    response = client.get(
        "/api/security/users",
        headers=auth_headers_for(
            client,
            "ur@example.com",
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 403


def test_admin_can_create_user(client):
    create_user("admin@example.com", "correct horse battery staple", role="Admin")

    response = client.post(
        "/api/security/users",
        json={
            "username": "new-user@example.com",
            "password": "correct horse battery staple",
            "role": "Read Only",
        },
        headers=auth_headers_for(
            client,
            "admin@example.com",
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 201

    data = response.json()

    assert data["username"] == "new-user@example.com"
    assert data["role"] == "Read Only"
    assert data["is_active"] is True
    assert "password_hash" not in data


def test_create_user_writes_audit_event(client):
    create_user("admin@example.com", "correct horse battery staple", role="Admin")

    response = client.post(
        "/api/security/users",
        json={
            "username": "new-user@example.com",
            "password": "correct horse battery staple",
            "role": "UR",
        },
        headers=auth_headers_for(
            client,
            "admin@example.com",
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 201

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT action, resource_type, resource_id, metadata
            FROM audit_events
            WHERE action = 'user.create'
            """
        ).fetchone()

    assert row["action"] == "user.create"
    assert row["resource_type"] == "user"
    assert row["resource_id"] == response.json()["id"]
    assert "correct horse battery staple" not in row["metadata"]
    assert "new-user@example.com" not in row["metadata"]


def test_admin_can_update_user_role_and_active_status(client):
    admin = create_user("admin@example.com", "correct horse battery staple", role="Admin")
    user = create_user("user@example.com", "correct horse battery staple", role="UR")

    response = client.patch(
        f"/api/security/users/{user['id']}",
        json={
            "role": "Read Only",
            "is_active": False,
        },
        headers=auth_headers_for(
            client,
            admin["username"],
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["role"] == "Read Only"
    assert data["is_active"] is False


def test_update_user_writes_audit_event_without_sensitive_values(client):
    admin = create_user("admin@example.com", "correct horse battery staple", role="Admin")
    user = create_user("user@example.com", "correct horse battery staple", role="UR")

    response = client.patch(
        f"/api/security/users/{user['id']}",
        json={"role": "Read Only"},
        headers=auth_headers_for(
            client,
            admin["username"],
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 200

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT action, metadata
            FROM audit_events
            WHERE action = 'user.update'
            """
        ).fetchone()

    assert row["action"] == "user.update"
    assert "role" in row["metadata"]
    assert "user@example.com" not in row["metadata"]
    assert "correct horse battery staple" not in row["metadata"]


def test_admin_cannot_remove_own_admin_access(client):
    admin = create_user("admin@example.com", "correct horse battery staple", role="Admin")

    response = client.patch(
        f"/api/security/users/{admin['id']}",
        json={"role": "UR"},
        headers=auth_headers_for(
            client,
            admin["username"],
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Admins cannot remove their own admin access.",
    }


def test_admin_can_list_audit_events(client):
    admin = create_user("admin@example.com", "correct horse battery staple", role="Admin")

    headers = auth_headers_for(
        client,
        admin["username"],
        "correct horse battery staple",
    )

    response = client.get(
        "/api/security/audit-events?page=1&page_size=10",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total"] >= 1
    assert isinstance(data["events"], list)


def test_ur_user_cannot_list_audit_events(client):
    create_user("ur@example.com", "correct horse battery staple", role="UR")

    response = client.get(
        "/api/security/audit-events",
        headers=auth_headers_for(
            client,
            "ur@example.com",
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 403


def test_audit_events_endpoint_supports_action_filter(client):
    admin = create_user("admin@example.com", "correct horse battery staple", role="Admin")

    headers = auth_headers_for(
        client,
        admin["username"],
        "correct horse battery staple",
    )

    response = client.get(
        "/api/security/audit-events?action=login",
        headers=headers,
    )

    assert response.status_code == 200

    events = response.json()["events"]

    assert events
    assert all(event["action"] == "security.login" for event in events)
    

def test_audit_events_endpoint_supports_partial_username_filter(client):
    admin = create_user(
        "admin@example.com",
        "correct horse battery staple",
        role="Admin",
    )
    create_user(
        "readonly@example.com",
        "correct horse battery staple",
        role="Read Only",
    )

    readonly_headers = auth_headers_for(
        client,
        "readonly@example.com",
        "correct horse battery staple",
    )

    client.post("/api/security/logout", headers=readonly_headers)

    response = client.get(
        "/api/security/audit-events?username=read",
        headers=auth_headers_for(
            client,
            admin["username"],
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 200

    events = response.json()["events"]

    assert events
    assert all(
        event["username"] == "readonly@example.com"
        for event in events
    )


def test_update_user_returns_404_for_missing_user(client):
    create_user("admin@example.com", "correct horse battery staple", role="Admin")

    response = client.patch(
        "/api/security/users/999",
        json={"role": "UR"},
        headers=auth_headers_for(
            client,
            "admin@example.com",
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 404
    
    
def test_me_rejects_missing_token(client):
    response = client.get("/api/security/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required."}


def test_me_rejects_invalid_token(client):
    response = client.get(
        "/api/security/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required."}


def test_logout_revokes_session(client):
    create_user("user@example.com", "correct horse battery staple", role="UR")

    login_response = client.post(
        "/api/security/login",
        json={
            "username": "user@example.com",
            "password": "correct horse battery staple",
        },
    )

    token = login_response.json()["access_token"]

    logout_response = client.post(
        "/api/security/logout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert logout_response.status_code == 200
    assert logout_response.json() == {"logged_out": True}

    me_response = client.get(
        "/api/security/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert me_response.status_code == 401


def test_login_and_logout_write_audit_events(client):
    create_user("user@example.com", "correct horse battery staple", role="UR")

    login_response = client.post(
        "/api/security/login",
        json={
            "username": "user@example.com",
            "password": "correct horse battery staple",
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    logout_response = client.post(
        "/api/security/logout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert logout_response.status_code == 200

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT action, username
            FROM audit_events
            ORDER BY id
            """
        ).fetchall()

    assert [(row["action"], row["username"]) for row in rows] == [
        ("security.login", "user@example.com"),
        ("security.logout", "user@example.com"),
    ]