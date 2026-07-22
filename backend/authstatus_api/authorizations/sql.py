from __future__ import annotations

from typing import Any


def sql_columns(
    payload: dict[str, Any],
    allowed_columns: set[str],
    excluded_columns: set[str],
) -> list[str]:
    return [
        key for key in payload if key in allowed_columns and key not in excluded_columns
    ]


def insert_sql(
    table_name: str,
    columns: list[str],
) -> str:
    column_names = ", ".join(columns)
    placeholders = ", ".join("?" for _ in columns)

    return f"INSERT INTO {table_name} " f"({column_names}) VALUES ({placeholders})"


def update_assignments(columns: list[str]) -> str:
    return ", ".join(f"{column} = ?" for column in columns)
