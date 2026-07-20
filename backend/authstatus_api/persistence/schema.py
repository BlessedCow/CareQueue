from __future__ import annotations

from typing import Any

from authstatus_api.persistence.connections import get_conn

AUTH_TABLE_COLUMNS = {
    "id",
    "facility",
    "client_name",
    "member_id",
    "group_number",
    "date_of_birth",
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
    "requested_days",
    "approved_days",
    "auth_start_date",
    "auth_end_date",
    "programming_days",
    "review_due_date",
    "submitted_at",
    "decision_at",
    "created_at",
    "updated_at",
}

AUTH_EVENT_TABLE_COLUMNS = {
    "id",
    "auth_id",
    "event_type",
    "event_date",
    "event_time",
    "outcome",
    "notes",
    "created_at",
    "updated_at",
    "requested_days",
    "approved_days",
    "auth_start_date",
    "auth_end_date",
    "review_due_date",
}

USER_TABLE_COLUMNS = {
    "id",
    "username",
    "password_hash",
    "role",
    "is_active",
    "failed_login_count",
    "locked_until",
    "last_login_at",
    "password_changed_at",
    "must_change_password",
    "created_at",
    "updated_at",
}

SESSION_TABLE_COLUMNS = {
    "id",
    "user_id",
    "token_hash",
    "created_at",
    "last_seen_at",
    "expires_at",
    "revoked_at",
    "ip_address",
    "user_agent",
}

AUDIT_EVENT_TABLE_COLUMNS = {
    "id",
    "user_id",
    "username",
    "action",
    "resource_type",
    "resource_id",
    "metadata",
    "ip_address",
    "user_agent",
    "created_at",
}

REGISTERED_OPTION_TABLE_COLUMNS = {
    "id",
    "category",
    "name",
    "normalized_name",
    "is_protected",
    "created_at",
    "updated_at",
}


def ensure_column(
    conn: Any,
    table: str,
    column: str,
    definition: str,
) -> None:
    existing = {
        row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()
    }

    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def initialize_schema(conn: Any) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS auths (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            facility TEXT NOT NULL,
            client_name TEXT NOT NULL,
            member_id TEXT,
            group_number TEXT,
            date_of_birth TEXT,
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
            requested_days INTEGER NOT NULL DEFAULT 0,
            approved_days INTEGER NOT NULL DEFAULT 0,
            auth_start_date TEXT,
            auth_end_date TEXT,
            programming_days TEXT,
            submitted_at TEXT,
            review_due_date TEXT,
            decision_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS auth_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            auth_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            event_date TEXT NOT NULL,
            event_time TEXT,
            outcome TEXT,
            notes TEXT,
            requested_days INTEGER NOT NULL DEFAULT 0,
            approved_days INTEGER NOT NULL DEFAULT 0,
            auth_start_date TEXT,
            auth_end_date TEXT,
            review_due_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (auth_id) REFERENCES auths (id) ON DELETE CASCADE
        )
        """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'UR',
            is_active INTEGER NOT NULL DEFAULT 1,
            failed_login_count INTEGER NOT NULL DEFAULT 0,
            locked_until TEXT,
            last_login_at TEXT,
            password_changed_at TEXT NOT NULL,
            must_change_password INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            CHECK (role IN ('Admin', 'UR', 'Read Only')),
            CHECK (is_active IN (0, 1)),
            CHECK (must_change_password IN (0, 1)),
            CHECK (failed_login_count >= 0)
        )
        """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            revoked_at TEXT,
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            action TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_id INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            ip_address TEXT,
            user_agent TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
        """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS registered_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            normalized_name TEXT NOT NULL,
            is_protected INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            CHECK (
                category IN (
                    'facility',
                    'insurance',
                    'web_portal'
                )
            ),
            CHECK (is_protected IN (0, 1)),
            UNIQUE (category, normalized_name)
        )
        """)

    ensure_column(conn, "auths", "member_id", "TEXT")
    ensure_column(conn, "auths", "group_number", "TEXT")
    ensure_column(conn, "auths", "date_of_birth", "TEXT")
    ensure_column(conn, "auths", "insurance", "TEXT")
    ensure_column(conn, "auths", "insurance_fax", "TEXT")
    ensure_column(
        conn,
        "auths",
        "requested_days",
        "INTEGER NOT NULL DEFAULT 0",
    )
    ensure_column(
        conn,
        "auths",
        "approved_days",
        "INTEGER NOT NULL DEFAULT 0",
    )
    ensure_column(conn, "auths", "review_due_date", "TEXT")
    ensure_column(conn, "auths", "programming_days", "TEXT")
    ensure_column(conn, "auths", "submitted_at", "TEXT")
    ensure_column(conn, "auths", "decision_at", "TEXT")

    ensure_column(
        conn,
        "auth_events",
        "requested_days",
        "INTEGER NOT NULL DEFAULT 0",
    )
    ensure_column(
        conn,
        "auth_events",
        "approved_days",
        "INTEGER NOT NULL DEFAULT 0",
    )
    ensure_column(conn, "auth_events", "auth_start_date", "TEXT")
    ensure_column(conn, "auth_events", "auth_end_date", "TEXT")
    ensure_column(conn, "auth_events", "review_due_date", "TEXT")

    ensure_column(
        conn,
        "users",
        "failed_login_count",
        "INTEGER NOT NULL DEFAULT 0",
    )
    ensure_column(conn, "users", "locked_until", "TEXT")
    ensure_column(conn, "users", "last_login_at", "TEXT")
    ensure_column(conn, "users", "password_changed_at", "TEXT")
    ensure_column(
        conn,
        "users",
        "must_change_password",
        "INTEGER NOT NULL DEFAULT 0",
    )

    ensure_column(conn, "sessions", "ip_address", "TEXT")
    ensure_column(conn, "sessions", "user_agent", "TEXT")

    ensure_column(conn, "audit_events", "user_id", "INTEGER")
    ensure_column(conn, "audit_events", "username", "TEXT")
    ensure_column(
        conn,
        "audit_events",
        "metadata",
        "TEXT NOT NULL DEFAULT '{}'",
    )
    ensure_column(conn, "audit_events", "ip_address", "TEXT")
    ensure_column(conn, "audit_events", "user_agent", "TEXT")

    default_option_timestamp = "1970-01-01T00:00:00+00:00"

    for category in (
        "facility",
        "insurance",
        "web_portal",
    ):
        conn.execute(
            """
            INSERT OR IGNORE INTO registered_options (
                category,
                name,
                normalized_name,
                is_protected,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                category,
                "Other",
                "other",
                1,
                default_option_timestamp,
                default_option_timestamp,
            ),
        )


def init_db() -> None:
    with get_conn() as conn:
        initialize_schema(conn)
