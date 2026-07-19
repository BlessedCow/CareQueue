from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Any

from authstatus_api.backups.service import create_encrypted_database_backup
from authstatus_api.database_encryption.sqlcipher_probe import (
    SQLCipherProbeError,
    migrate_plaintext_sqlite_to_sqlcipher,
    verify_sqlcipher_database,
)

CAREQUEUE_REQUIRED_TABLES = {
    "auth_events",
    "auths",
    "audit_events",
    "sessions",
    "users",
}


class SQLCipherCutoverError(RuntimeError):
    pass


def default_sqlcipher_path(source_path: Path) -> Path:
    return source_path.with_name(f"{source_path.stem}.sqlcipher{source_path.suffix}")


def environment_database_path(database_path: Path, *, backend_root: Path) -> str:
    relative_path = os.path.relpath(database_path, backend_root)
    return relative_path.replace("\\", "/")


def prepare_sqlcipher_cutover(
    *,
    source_path: Path,
    destination_path: Path | None,
    sqlcipher_key: str,
    backend_root: Path,
    backup_directory: Path | None = None,
    force: bool = False,
    required_tables: set[str] | None = None,
) -> dict[str, Any]:
    if not sqlcipher_key.strip():
        raise SQLCipherCutoverError("Missing AUTHSTATUS_SQLCIPHER_KEY.")

    if not source_path.exists():
        raise SQLCipherCutoverError(f"Source database does not exist: {source_path}")

    encrypted_destination = destination_path or default_sqlcipher_path(source_path)

    if encrypted_destination.exists():
        if not force:
            raise SQLCipherCutoverError(
                f"Destination already exists: {encrypted_destination}. "
                "Use --force to recreate it."
            )

        encrypted_destination.unlink()

    backup_path = create_encrypted_database_backup(
        database_path=source_path,
        backup_directory=backup_directory,
    )

    try:
        migrated_path = migrate_plaintext_sqlite_to_sqlcipher(
            source_path=source_path,
            destination_path=encrypted_destination,
            passphrase=sqlcipher_key,
        )
        verification = verify_sqlcipher_database(
            database_path=migrated_path,
            passphrase=sqlcipher_key,
            required_tables=required_tables or CAREQUEUE_REQUIRED_TABLES,
        )
    except (SQLCipherProbeError, sqlite3.DatabaseError) as exc:
        raise SQLCipherCutoverError(
            "Unable to migrate plaintext database to SQLCipher. "
            f"Confirm the source path points to a plaintext SQLite database: {source_path}"
        ) from exc

    return {
        "backup_path": backup_path,
        "sqlcipher_path": migrated_path,
        "verification": verification,
        "env_values": {
            "AUTHSTATUS_DATABASE_PATH": environment_database_path(
                migrated_path,
                backend_root=backend_root,
            ),
            "AUTHSTATUS_DATABASE_ENCRYPTION": "sqlcipher",
        },
    }