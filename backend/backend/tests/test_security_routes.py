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


def test_admin_can_create_user_with_generated_temporary_password(client):
    create_user("admin@example.com", "correct horse battery staple", role="Admin")

    response = client.post(
        "/api/security/users",
        json={
            "username": "new-user@example.com",
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
    created_user = data["user"]

    assert created_user["username"] == "new-user@example.com"
    assert created_user["role"] == "Read Only"
    assert created_user["is_active"] is True
    assert created_user["must_change_password"] is True
    assert len(data["temporary_password"]) == 24
    assert "password_hash" not in created_user

    login_response = client.post(
        "/api/security/login",
        json={
            "username": created_user["username"],
            "password": data["temporary_password"],
        },
    )

    assert login_response.status_code == 200
    assert login_response.json()["user"]["must_change_password"] is True


def test_create_user_writes_safe_audit_event(client):
    create_user("admin@example.com", "correct horse battery staple", role="Admin")

    response = client.post(
        "/api/security/users",
        json={
            "username": "new-user@example.com",
            "role": "UR",
        },
        headers=auth_headers_for(
            client,
            "admin@example.com",
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 201

    temporary_password = response.json()["temporary_password"]
    created_user = response.json()["user"]

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
    assert row["resource_id"] == created_user["id"]
    assert temporary_password not in row["metadata"]
    assert "new-user@example.com" not in row["metadata"]
    assert "must_change_password" in row["metadata"]


def test_create_user_rejects_admin_supplied_password(client):
    create_user("admin@example.com", "correct horse battery staple", role="Admin")

    response = client.post(
        "/api/security/users",
        json={
            "username": "new-user@example.com",
            "password": "admin selected password",
            "role": "UR",
        },
        headers=auth_headers_for(
            client,
            "admin@example.com",
            "correct horse battery staple",
        ),
    )

    assert response.status_code == 422


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


def test_user_can_change_own_password(client):
    create_user(
        "user@example.com",
        "old password value",
        role="UR",
    )

    headers = auth_headers_for(
        client,
        "user@example.com",
        "old password value",
    )

    response = client.post(
        "/api/security/change-password",
        json={
            "current_password": "old password value",
            "new_password": "new password value",
        },
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["password_changed"] is True
    assert response.json()["sessions_revoked"] >= 1

    old_login = client.post(
        "/api/security/login",
        json={
            "username": "user@example.com",
            "password": "old password value",
        },
    )
    new_login = client.post(
        "/api/security/login",
        json={
            "username": "user@example.com",
            "password": "new password value",
        },
    )

    assert old_login.status_code == 401
    assert new_login.status_code == 200
    assert new_login.json()["user"]["must_change_password"] is False


def test_change_password_rejects_incorrect_current_password(client):
    create_user(
        "user@example.com",
        "old password value",
        role="UR",
    )

    response = client.post(
        "/api/security/change-password",
        json={
            "current_password": "wrong password",
            "new_password": "new password value",
        },
        headers=auth_headers_for(
            client,
            "user@example.com",
            "old password value",
        ),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Current password is incorrect.",
    }


def test_change_password_clears_forced_change_state(client):
    create_user(
        "temporary@example.com",
        "temporary password value",
        role="UR",
        must_change_password=True,
    )

    response = client.post(
        "/api/security/change-password",
        json={
            "current_password": "temporary password value",
            "new_password": "permanent password value",
        },
        headers=auth_headers_for(
            client,
            "temporary@example.com",
            "temporary password value",
        ),
    )

    assert response.status_code == 200

    login_response = client.post(
        "/api/security/login",
        json={
            "username": "temporary@example.com",
            "password": "permanent password value",
        },
    )

    assert login_response.status_code == 200
    assert login_response.json()["user"]["must_change_password"] is False


def test_change_password_revokes_all_existing_sessions(client):
    user = create_user(
        "user@example.com",
        "old password value",
        role="UR",
    )

    first_login = client.post(
        "/api/security/login",
        json={
            "username": user["username"],
            "password": "old password value",
        },
    )
    second_login = client.post(
        "/api/security/login",
        json={
            "username": user["username"],
            "password": "old password value",
        },
    )

    first_token = first_login.json()["access_token"]
    second_token = second_login.json()["access_token"]

    response = client.post(
        "/api/security/change-password",
        json={
            "current_password": "old password value",
            "new_password": "new password value",
        },
        headers={"Authorization": f"Bearer {first_token}"},
    )

    assert response.status_code == 200

    first_me = client.get(
        "/api/security/me",
        headers={"Authorization": f"Bearer {first_token}"},
    )
    second_me = client.get(
        "/api/security/me",
        headers={"Authorization": f"Bearer {second_token}"},
    )

    assert first_me.status_code == 401
    assert second_me.status_code == 401


def test_admin_reset_returns_temporary_password_once(client):
    admin = create_user(
        "admin@example.com",
        "admin password value",
        role="Admin",
    )
    user = create_user(
        "user@example.com",
        "old password value",
        role="UR",
    )

    response = client.post(
        f"/api/security/users/{user['id']}/reset-password",
        headers=auth_headers_for(
            client,
            admin["username"],
            "admin password value",
        ),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["password_reset"] is True
    assert data["must_change_password"] is True
    assert data["sessions_revoked"] >= 0
    assert len(data["temporary_password"]) == 24

    old_login = client.post(
        "/api/security/login",
        json={
            "username": user["username"],
            "password": "old password value",
        },
    )
    temporary_login = client.post(
        "/api/security/login",
        json={
            "username": user["username"],
            "password": data["temporary_password"],
        },
    )

    assert old_login.status_code == 401
    assert temporary_login.status_code == 200
    assert temporary_login.json()["user"]["must_change_password"] is True


def test_admin_reset_revokes_existing_user_sessions(client):
    admin = create_user(
        "admin@example.com",
        "admin password value",
        role="Admin",
    )
    user = create_user(
        "user@example.com",
        "old password value",
        role="UR",
    )

    user_login = client.post(
        "/api/security/login",
        json={
            "username": user["username"],
            "password": "old password value",
        },
    )
    user_token = user_login.json()["access_token"]

    response = client.post(
        f"/api/security/users/{user['id']}/reset-password",
        headers=auth_headers_for(
            client,
            admin["username"],
            "admin password value",
        ),
    )

    assert response.status_code == 200

    previous_session = client.get(
        "/api/security/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert previous_session.status_code == 401


def test_ur_user_cannot_reset_passwords(client):
    first_user = create_user(
        "first@example.com",
        "password value",
        role="UR",
    )
    second_user = create_user(
        "second@example.com",
        "password value",
        role="UR",
    )

    response = client.post(
        f"/api/security/users/{second_user['id']}/reset-password",
        headers=auth_headers_for(
            client,
            first_user["username"],
            "password value",
        ),
    )

    assert response.status_code == 403


def test_admin_cannot_use_reset_endpoint_for_self(client):
    admin = create_user(
        "admin@example.com",
        "password value",
        role="Admin",
    )

    response = client.post(
        f"/api/security/users/{admin['id']}/reset-password",
        headers=auth_headers_for(
            client,
            admin["username"],
            "password value",
        ),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Use change password to update your own password.",
    }


def test_password_reset_audit_event_does_not_store_temporary_password(client):
    admin = create_user(
        "admin@example.com",
        "admin password value",
        role="Admin",
    )
    user = create_user(
        "user@example.com",
        "old password value",
        role="UR",
    )

    response = client.post(
        f"/api/security/users/{user['id']}/reset-password",
        headers=auth_headers_for(
            client,
            admin["username"],
            "admin password value",
        ),
    )

    assert response.status_code == 200

    temporary_password = response.json()["temporary_password"]

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT action, resource_id, metadata
            FROM audit_events
            WHERE action = 'user.password_reset'
            """
        ).fetchone()

    assert row is not None
    assert row["resource_id"] == user["id"]
    assert temporary_password not in row["metadata"]


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


def test_forced_change_user_can_access_me(client):
    user = create_user(
        "temporary@example.com",
        "temporary password value",
        role="UR",
        must_change_password=True,
    )

    headers = auth_headers_for(
        client,
        user["username"],
        "temporary password value",
    )

    response = client.get(
        "/api/security/me",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["user"]["must_change_password"] is True


def test_forced_change_user_can_log_out(client):
    user = create_user(
        "temporary@example.com",
        "temporary password value",
        role="UR",
        must_change_password=True,
    )

    headers = auth_headers_for(
        client,
        user["username"],
        "temporary password value",
    )

    response = client.post(
        "/api/security/logout",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == {"logged_out": True}

    me_response = client.get(
        "/api/security/me",
        headers=headers,
    )

    assert me_response.status_code == 401


def test_forced_change_admin_cannot_access_admin_routes(client):
    admin = create_user(
        "temporary-admin@example.com",
        "temporary password value",
        role="Admin",
        must_change_password=True,
    )

    response = client.get(
        "/api/security/users",
        headers=auth_headers_for(
            client,
            admin["username"],
            "temporary password value",
        ),
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Password change required.",
    }


def test_forced_change_admin_cannot_access_audit_events(client):
    admin = create_user(
        "temporary-admin@example.com",
        "temporary password value",
        role="Admin",
        must_change_password=True,
    )

    response = client.get(
        "/api/security/audit-events",
        headers=auth_headers_for(
            client,
            admin["username"],
            "temporary password value",
        ),
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Password change required.",
    }


def test_forced_change_user_can_change_password(client):
    user = create_user(
        "temporary@example.com",
        "temporary password value",
        role="UR",
        must_change_password=True,
    )

    response = client.post(
        "/api/security/change-password",
        json={
            "current_password": "temporary password value",
            "new_password": "permanent password value",
        },
        headers=auth_headers_for(
            client,
            user["username"],
            "temporary password value",
        ),
    )

    assert response.status_code == 200
    assert response.json()["password_changed"] is True


def test_user_regains_protected_access_after_required_password_change(client):
    admin = create_user(
        "temporary-admin@example.com",
        "temporary password value",
        role="Admin",
        must_change_password=True,
    )

    temporary_headers = auth_headers_for(
        client,
        admin["username"],
        "temporary password value",
    )

    blocked_response = client.get(
        "/api/security/users",
        headers=temporary_headers,
    )

    assert blocked_response.status_code == 403
    assert blocked_response.json() == {
        "detail": "Password change required.",
    }

    change_response = client.post(
        "/api/security/change-password",
        json={
            "current_password": "temporary password value",
            "new_password": "permanent password value",
        },
        headers=temporary_headers,
    )

    assert change_response.status_code == 200

    permanent_headers = auth_headers_for(
        client,
        admin["username"],
        "permanent password value",
    )

    allowed_response = client.get(
        "/api/security/users",
        headers=permanent_headers,
    )

    assert allowed_response.status_code == 200
    assert allowed_response.json()["users"][0]["must_change_password"] is False
    