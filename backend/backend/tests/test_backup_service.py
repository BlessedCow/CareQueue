from __future__ import annotations

import pytest
from authstatus_api.backups.service import (
    BackupConfigError,
    BackupError,
    create_encrypted_database_backup,
    decrypt_backup_file,
    encrypt_backup_bytes,
    restore_encrypted_database_backup,
)
from authstatus_api.crypto import generate_encryption_key
from authstatus_api.settings import get_settings


@pytest.fixture(autouse=True)
def configure_test_settings(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTHSTATUS_DATABASE_PATH", str(tmp_path / "auth_tracker.db"))
    monkeypatch.setenv("AUTHSTATUS_BACKUP_DIRECTORY", str(tmp_path / "backups"))
    monkeypatch.setenv("AUTHSTATUS_BACKUP_ENCRYPTION_KEY", generate_encryption_key())
    get_settings.cache_clear()

    yield

    get_settings.cache_clear()


def test_encrypt_backup_bytes_does_not_return_plaintext():
    plaintext = b"SQLite format 3\x00test database bytes"

    encrypted = encrypt_backup_bytes(plaintext)

    assert encrypted != plaintext
    assert b"SQLite format 3" not in encrypted


def test_create_encrypted_database_backup_writes_encrypted_file(tmp_path):
    database_path = tmp_path / "auth_tracker.db"
    backup_directory = tmp_path / "backups"
    database_bytes = b"SQLite format 3\x00test database bytes"

    database_path.write_bytes(database_bytes)

    backup_path = create_encrypted_database_backup(
        database_path=database_path,
        backup_directory=backup_directory,
    )

    assert backup_path.exists()
    assert backup_path.name.startswith("auth_tracker_")
    assert backup_path.name.endswith(".db.enc")
    assert database_bytes not in backup_path.read_bytes()
    assert decrypt_backup_file(backup_path) == database_bytes


def test_create_encrypted_database_backup_rejects_missing_database(tmp_path):
    missing_database_path = tmp_path / "missing.db"

    with pytest.raises(BackupError):
        create_encrypted_database_backup(database_path=missing_database_path)


def test_encrypt_backup_bytes_requires_backup_key(monkeypatch):
    monkeypatch.setenv("AUTHSTATUS_BACKUP_ENCRYPTION_KEY", "")
    get_settings.cache_clear()

    with pytest.raises(BackupConfigError):
        encrypt_backup_bytes(b"database bytes")
        
def test_restore_encrypted_database_backup_writes_safe_restore_file(tmp_path):
    database_path = tmp_path / "auth_tracker.db"
    backup_directory = tmp_path / "backups"
    restore_directory = tmp_path / "restores"
    database_bytes = b"SQLite format 3\x00test database bytes"

    database_path.write_bytes(database_bytes)

    backup_path = create_encrypted_database_backup(
        database_path=database_path,
        backup_directory=backup_directory,
    )

    restored_path = restore_encrypted_database_backup(
        backup_path=backup_path,
        restore_directory=restore_directory,
    )

    assert restored_path.exists()
    assert restored_path.parent == restore_directory
    assert restored_path.name.endswith(".restored.db")
    assert restored_path.read_bytes() == database_bytes
    assert database_path.read_bytes() == database_bytes