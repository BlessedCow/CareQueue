from __future__ import annotations

import sqlite3
from pathlib import Path

from authstatus_api.settings import get_settings

AUTH_TABLE_COLUMNS = {
    "id",
    "facility",
    "client_name",
    "member_id",
    "loc",
    "insurance",
    "insurance_phone",
    "insurance_fax",
    "submission_methods",
    "portal_name",
    "fax_numbers",
    "live_call_type",
    "scheduled_call_at",
    "care_manager_enabled",
    "care_manager_details",
    "notes_links",
    "auth_type",
    "status",
    "discharge_clinical_needed",
    "no_pa_required",
    "progress_made",
    "facility_informed",
    "waiting_on_clinicals",
    "los_requested",
    "days_approved",
    "auth_start_date",
    "auth_end_date",
    "created_at",
    "updated_at",
}


def get_database_path() -> Path:
    return get_settings().database_path


def get_conn() -> sqlite3.Connection:
    database_path = get_database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(database_path)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}

    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS auths (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                facility TEXT NOT NULL,
                client_name TEXT NOT NULL,
                member_id TEXT,
                loc TEXT NOT NULL,
                insurance TEXT,
                insurance_phone TEXT,
                insurance_fax TEXT,
                submission_methods TEXT NOT NULL,
                portal_name TEXT,
                fax_numbers TEXT,
                live_call_type TEXT,
                scheduled_call_at TEXT,
                care_manager_enabled INTEGER NOT NULL DEFAULT 0,
                care_manager_details TEXT,
                notes_links TEXT,
                auth_type TEXT NOT NULL,
                status TEXT NOT NULL,
                discharge_clinical_needed INTEGER NOT NULL DEFAULT 0,
                no_pa_required INTEGER NOT NULL DEFAULT 0,
                progress_made INTEGER NOT NULL DEFAULT 0,
                facility_informed INTEGER NOT NULL DEFAULT 0,
                waiting_on_clinicals INTEGER NOT NULL DEFAULT 0,
                los_requested TEXT,
                days_approved TEXT,
                auth_start_date TEXT,
                auth_end_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        ensure_column(conn, "auths", "member_id", "TEXT")
        ensure_column(conn, "auths", "insurance", "TEXT")
        ensure_column(conn, "auths", "insurance_fax", "TEXT")