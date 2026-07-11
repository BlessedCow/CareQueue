from __future__ import annotations

import pytest
from authstatus_api.crypto import generate_encryption_key
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