from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import pandas as pd

from config import DEFAULT_WEB_PORTALS, JSON_BACKUP_PATH, WEB_PORTALS_PATH
from schema import get_conn


def fetch_auths() -> pd.DataFrame:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM auths ORDER BY auth_start_date, client_name").fetchall()

    return pd.DataFrame([dict(row) for row in rows])


def auth_count() -> int:
    with get_conn() as conn:
        row = conn.execute("SELECT COUNT(*) AS count FROM auths").fetchone()

    return int(row["count"])


def insert_auth(payload: dict[str, Any]) -> None:
    now = datetime.now().isoformat(timespec="seconds")
    payload["created_at"] = now
    payload["updated_at"] = now

    keys = list(payload)
    columns = ", ".join(keys)
    placeholders = ", ".join("?" for _ in keys)

    with get_conn() as conn:
        conn.execute(
            f"INSERT INTO auths ({columns}) VALUES ({placeholders})",
            [payload[key] for key in keys],
        )

    export_json()

def delete_auth(auth_id: int) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM auths WHERE id = ?", (auth_id,))

    export_json()

def export_json() -> None:
    df = fetch_auths()
    records = df.to_dict(orient="records") if not df.empty else []
    JSON_BACKUP_PATH.write_text(json.dumps(records, indent=2), encoding="utf-8")


def auto_import_json_if_empty() -> None:
    if auth_count() > 0 or not JSON_BACKUP_PATH.exists():
        return

    data = json.loads(JSON_BACKUP_PATH.read_text(encoding="utf-8"))
    records = data if isinstance(data, list) else data.get("auths", [])

    with get_conn() as conn:
        for record in records:
            clean_record = {key: value for key, value in record.items() if key != "id"}
            keys = list(clean_record)
            columns = ", ".join(keys)
            placeholders = ", ".join("?" for _ in keys)

            conn.execute(
                f"INSERT INTO auths ({columns}) VALUES ({placeholders})",
                [clean_record[key] for key in keys],
            )

def load_web_portals() -> list[str]:
    if not WEB_PORTALS_PATH.exists():
        save_web_portals(DEFAULT_WEB_PORTALS)
        return DEFAULT_WEB_PORTALS.copy()

    portals = json.loads(WEB_PORTALS_PATH.read_text(encoding="utf-8"))

    if not isinstance(portals, list):
        save_web_portals(DEFAULT_WEB_PORTALS)
        return DEFAULT_WEB_PORTALS.copy()

    cleaned = sorted(
    {
        str(portal).strip()
        for portal in portals
        if str(portal).strip() and portal != "Other"
    }
)
    return [*cleaned, "Other"]


def save_web_portals(portals: list[str]) -> None:
    cleaned = sorted({portal.strip() for portal in portals if portal.strip() and portal != "Other"})
    WEB_PORTALS_PATH.write_text(json.dumps([*cleaned, "Other"], indent=2), encoding="utf-8")


def add_web_portal(portal_name: str) -> None:
    portal_name = portal_name.strip()

    if not portal_name:
        return

    portals = load_web_portals()

    if portal_name not in portals:
        save_web_portals([*portals, portal_name])