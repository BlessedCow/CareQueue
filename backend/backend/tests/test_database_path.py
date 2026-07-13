from __future__ import annotations

from pathlib import Path

import pytest
from authstatus_api.database import (
    BACKEND_ROOT,
    EXPECTED_DATABASE_DIRECTORY,
    DatabasePathError,
    get_database_path,
    resolve_database_path,
)
from authstatus_api.settings import get_settings


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()

    yield

    get_settings.cache_clear()


def test_default_relative_database_path_resolves_under_backend_data(monkeypatch):
    monkeypatch.delenv("AUTHSTATUS_DATABASE_PATH", raising=False)
    monkeypatch.delenv("AUTHSTATUS_ALLOW_UNSAFE_DATABASE_PATH", raising=False)
    get_settings.cache_clear()

    database_path = get_database_path()

    assert database_path == EXPECTED_DATABASE_DIRECTORY / "auth_tracker.db"


def test_absolute_database_path_is_allowed(tmp_path, monkeypatch):
    expected_path = tmp_path / "auth_tracker.db"
    monkeypatch.setenv("AUTHSTATUS_DATABASE_PATH", str(expected_path))
    get_settings.cache_clear()

    assert get_database_path() == expected_path.resolve()


def test_relative_database_path_outside_backend_data_is_rejected():
    with pytest.raises(DatabasePathError):
        resolve_database_path(Path("auth_tracker.db"))


def test_relative_database_path_outside_backend_data_can_be_explicitly_allowed():
    database_path = resolve_database_path(
        Path("auth_tracker.db"),
        allow_unsafe_database_path=True,
    )

    assert database_path == (BACKEND_ROOT / "auth_tracker.db").resolve()


def test_database_path_rejects_backup_directory():
    with pytest.raises(DatabasePathError):
        resolve_database_path(Path("../backups/auth_tracker.db"))


def test_database_path_rejects_restore_directory():
    with pytest.raises(DatabasePathError):
        resolve_database_path(Path("../restores/auth_tracker.db"))


def test_database_path_rejects_non_database_suffix(tmp_path):
    with pytest.raises(DatabasePathError):
        resolve_database_path(tmp_path / "auth_tracker.txt")