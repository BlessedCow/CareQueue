from __future__ import annotations

from pathlib import Path

from authstatus_api.settings import (
    PROJECT_ROOT,
    get_settings,
    resolve_project_path,
)

EXPECTED_DATABASE_DIRECTORY = (PROJECT_ROOT / "backend" / "data").resolve()
DATABASE_FILE_SUFFIXES = {".db", ".sqlite", ".sqlite3"}


class DatabasePathError(RuntimeError):
    pass


def path_is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False

    return True


def resolve_database_path(
    database_path: Path,
    *,
    allow_unsafe_database_path: bool = False,
) -> Path:
    resolved_path = resolve_project_path(database_path)

    if resolved_path.suffix.lower() not in DATABASE_FILE_SUFFIXES:
        raise DatabasePathError(
            f"Database path must end with one of "
            f"{sorted(DATABASE_FILE_SUFFIXES)}: {resolved_path}"
        )

    if "backups" in resolved_path.parts or "restores" in resolved_path.parts:
        raise DatabasePathError(
            "Database path cannot point inside a backup or restore "
            f"directory: {resolved_path}"
        )

    if (
        not database_path.is_absolute()
        and not allow_unsafe_database_path
        and not path_is_relative_to(
            resolved_path,
            EXPECTED_DATABASE_DIRECTORY,
        )
    ):
        raise DatabasePathError(
            "Relative database paths must resolve under backend/data. "
            f"Resolved path: {resolved_path}"
        )

    return resolved_path


def get_database_path() -> Path:
    settings = get_settings()

    return resolve_database_path(
        settings.database_path,
        allow_unsafe_database_path=(settings.allow_unsafe_database_path),
    )
