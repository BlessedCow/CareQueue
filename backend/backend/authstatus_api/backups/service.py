from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

from authstatus_api.database import get_database_path
from authstatus_api.settings import get_settings, resolve_project_path


class BackupConfigError(RuntimeError):
    pass


class BackupError(RuntimeError):
    pass


def _backup_timestamp() -> str:
    return datetime.now(UTC).strftime("%Y%m%d_%H%M%S_%f")


def _get_backup_fernet() -> Fernet:
    key = get_settings().backup_encryption_key.strip()

    if not key:
        raise BackupConfigError("Missing AUTHSTATUS_BACKUP_ENCRYPTION_KEY.")

    try:
        return Fernet(key.encode("utf-8"))
    except ValueError as exc:
        raise BackupConfigError("Invalid AUTHSTATUS_BACKUP_ENCRYPTION_KEY.") from exc


def encrypt_backup_bytes(database_bytes: bytes) -> bytes:
    return _get_backup_fernet().encrypt(database_bytes)


def decrypt_backup_bytes(encrypted_bytes: bytes) -> bytes:
    try:
        return _get_backup_fernet().decrypt(encrypted_bytes)
    except InvalidToken as exc:
        raise BackupError("Unable to decrypt backup file.") from exc


def create_encrypted_database_backup(
    *,
    database_path: Path | None = None,
    backup_directory: Path | None = None,
) -> Path:
    settings = get_settings()
    source_path = database_path or get_database_path()
    destination_directory = resolve_project_path(
        backup_directory or settings.backup_directory
    )

    if not source_path.exists():
        raise BackupError(f"Database file does not exist: {source_path}")

    if not source_path.is_file():
        raise BackupError(f"Database path is not a file: {source_path}")

    destination_directory.mkdir(parents=True, exist_ok=True)

    encrypted_bytes = encrypt_backup_bytes(source_path.read_bytes())
    backup_path = destination_directory / (
        f"{source_path.stem}_{_backup_timestamp()}{source_path.suffix}.enc"
    )

    backup_path.write_bytes(encrypted_bytes)

    return backup_path


def decrypt_backup_file(backup_path: Path) -> bytes:
    if not backup_path.exists():
        raise BackupError(f"Backup file does not exist: {backup_path}")

    return decrypt_backup_bytes(backup_path.read_bytes())

def restore_encrypted_database_backup(
    *,
    backup_path: Path,
    restore_directory: Path | None = None,
) -> Path:
    settings = get_settings()
    destination_directory = resolve_project_path(
        restore_directory or settings.restore_directory
    )

    if backup_path.suffix != ".enc":
        raise BackupError(f"Backup file must end with .enc: {backup_path}")

    decrypted_bytes = decrypt_backup_file(backup_path)

    destination_directory.mkdir(parents=True, exist_ok=True)

    restored_name = backup_path.name.removesuffix(".enc").replace(".db", ".restored.db")
    restored_path = destination_directory / restored_name

    if restored_path.exists():
        restored_path = destination_directory / (
            f"{Path(restored_name).stem}_{_backup_timestamp()}.db"
        )

    restored_path.write_bytes(decrypted_bytes)

    return restored_path