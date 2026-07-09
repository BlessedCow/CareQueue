from __future__ import annotations

import calendar
import re
from datetime import date, datetime, time
from typing import Any

import pandas as pd
import streamlit as st

from config import (
    AUTH_TYPE_OPTIONS,
    FACILITY_OPTIONS,
    JSON_BACKUP_PATH,
    LIVE_CALL_OPTIONS,
    LOC_OPTIONS,
    MORNING_EMAIL_TO,
    STATUS_OPTIONS,
    SUBMISSION_OPTIONS,
)
from emailer import build_morning_report, format_date, open_outlook_email, send_outlook_email
from schema import init_db
from storage import (
    add_web_portal,
    auto_import_json_if_empty,
    delete_auth,
    export_json,
    fetch_auths,
    insert_auth,
    load_web_portals,
)


def bool_to_int(value: bool) -> int:
    return 1 if value else 0


def combine_date_time(selected_date: date | None, selected_time: time | None) -> str:
    if not selected_date:
        return ""

    selected_time = selected_time or time(8, 0)
    return datetime.combine(selected_date, selected_time).isoformat(timespec="minutes")

def format_and_validate_phone(phone_input: str, field_name: str) -> str:
    """Strips formatting, validates length (must be exactly 10 digits), and formats to XXX-XXX-XXXX."""
    if not phone_input.strip():
        return ""
    
    digits = re.sub(r"\D", "", phone_input)
    
    if len(digits) == 0:
        return ""
        
    if len(digits) < 10 or len(digits) > 10:
        st.error(
            f"Invalid {field_name}. Must be exactly 10 digits "
            f"excluding dashes/spaces). You provided {len(digits)} digits."
        )
        return "INVALID"
        
    # Format to XXX-XXX-XXXX
    return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"

def render_calendar(df: pd.DataFrame) -> None:
    st.subheader("Auth Calendar")

    today = date.today()
    month_names = list(calendar.month_name)[1:]

    col_a, col_b, _ = st.columns([1, 1, 5])
    selected_month = col_a.selectbox("Month", month_names, index=today.month - 1)
    year = col_b.number_input("Year", min_value=2020, max_value=2100, value=today.year)

    month = month_names.index(selected_month) + 1
    month_days = calendar.monthcalendar(int(year), int(month))
    events_by_day: dict[int, list[str]] = {}

    if not df.empty:
        for _, row in df.iterrows():
            for date_field, label in [("auth_start_date", "Start"), ("auth_end_date", "Finish")]:
                value = row.get(date_field)

                if not value:
                    continue

                event_date = datetime.strptime(value, "%Y-%m-%d").date()

                if event_date.month == month and event_date.year == year:
                    event = f"{label}: {row['client_name']} ({row['loc']})"
                    events_by_day.setdefault(event_date.day, []).append(event)

    header_cols = st.columns(7)
    for col, label in zip(header_cols, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], strict=True):
        col.markdown(f"**{label}**")

    for week in month_days:
        cols = st.columns(7)

        for index, day_number in enumerate(week):
            with cols[index]:
                if day_number == 0:
                    st.container(height=120, border=True)
                    continue

                with st.container(height=120, border=True):
                    st.markdown(f"**{day_number:02d}**")

                    for event in events_by_day.get(day_number, []):
                        st.caption(event)


def render_add_auth() -> None:
    st.subheader("Add Auth Status")

    selected_facility = st.selectbox("Facility", FACILITY_OPTIONS)
    facility = selected_facility

    if selected_facility == "Other":
        facility = st.text_input("Enter Facility Name")

    col_name, col_member = st.columns(2)
    client_name = col_name.text_input("Client Name")
    member_id = col_member.text_input("Member ID")

    loc = st.selectbox("LOC", LOC_OPTIONS)

    col_a, col_b, col_c = st.columns(3)
    insurance = col_a.text_input("Insurance")
    insurance_phone = col_b.text_input("Insurance Phone Number")
    insurance_fax = col_c.text_input("Insurance Fax Number")

    submission_methods = st.multiselect("Submission Method", SUBMISSION_OPTIONS)

    portal_name = ""
    fax_numbers: list[str] = []
    live_call_type = ""
    scheduled_call_at = ""

    if "Web Portal" in submission_methods:
        portal_options = load_web_portals()
        selected_portal = st.selectbox("Web Portal", portal_options)

        if selected_portal == "Other":
            portal_name = st.text_input("Enter Web Portal")
        else:
            portal_name = selected_portal

    if "Fax" in submission_methods:
        fax_count = st.number_input("Number of fax numbers", min_value=1, max_value=10, value=1)

        for index in range(int(fax_count)):
            fax = st.text_input(f"Fax Number {index + 1}")

            if fax:
                fax_numbers.append(fax.strip())

    if "Live Call" in submission_methods:
        live_call_type = st.radio("Live Call Type", LIVE_CALL_OPTIONS, horizontal=True)
        call_date = st.date_input("Scheduled Live Auth Call Date", format="MM/DD/YYYY")
        call_time = st.time_input("Scheduled Live Auth Call Time", value=time(8, 0))
        scheduled_call_at = combine_date_time(call_date, call_time)

    care_manager_enabled = st.checkbox("Care Manager / Care Team")

    care_manager_details = ""
    if care_manager_enabled:
        care_manager_details = st.text_area("Care Manager Name / Phone / Extension / Fax")

    notes_links = st.text_area("Notes / Portal Links")
    auth_type = st.selectbox("Auth Type", AUTH_TYPE_OPTIONS)
    status = st.selectbox("Status", STATUS_OPTIONS)

    col_d, col_e = st.columns(2)
    auth_start_date = col_d.date_input("Auth Start Date", format="MM/DD/YYYY")
    auth_end_date = col_e.date_input("Auth Finish Date", format="MM/DD/YYYY")

    discharge_clinical_needed = st.checkbox("Discharge clinical needs to be sent")
    no_pa_required = st.checkbox("NO PA Required")
    progress_made = st.toggle("Progress Made", value=True)
    facility_informed = st.checkbox("Facility Informed")
    waiting_on_clinicals = st.checkbox("Waiting on Clinicals from Facility")

    col_f, col_g = st.columns(2)
    los_requested = col_f.text_input("Length of Stay Requested by Facility")
    days_approved = col_g.text_input("Days Approved / Asked For")

    submitted = st.button("Save Auth Status", type="primary")

    if not submitted:
        return

    if not facility.strip() or not client_name.strip() or not submission_methods:
        st.error("Facility, Client Name, and at least one Submission Method are required.")
        return

    if "Web Portal" in submission_methods and not portal_name.strip():
        st.error("Please select or enter a web portal.")
        return

    formatted_phone = format_and_validate_phone(insurance_phone, "Insurance Phone Number")
    formatted_fax = format_and_validate_phone(insurance_fax, "Insurance Fax Number")
    
    formatted_fax_numbers = []
    for idx, f_num in enumerate(fax_numbers):
        fmt = format_and_validate_phone(f_num, f"Fax Number {idx + 1}")
        if fmt == "INVALID":
            return
        if fmt:
            formatted_fax_numbers.append(fmt)

    if formatted_phone == "INVALID" or formatted_fax == "INVALID":
        return

    if "Web Portal" in submission_methods:
        add_web_portal(portal_name)
    
    payload: dict[str, Any] = {
        "facility": facility.strip(),
        "client_name": client_name.strip(),
        "member_id": member_id.strip(),
        "loc": loc,
        "insurance": insurance.strip(),
        "insurance_phone": formatted_phone,
        "insurance_fax": formatted_fax,
        "submission_methods": ", ".join(submission_methods),
        "portal_name": portal_name.strip(),
        "fax_numbers": ", ".join(formatted_fax_numbers),
        "live_call_type": live_call_type,
        "scheduled_call_at": scheduled_call_at,
        "care_manager_enabled": bool_to_int(care_manager_enabled),
        "care_manager_details": care_manager_details.strip(),
        "notes_links": notes_links.strip(),
        "auth_type": auth_type,
        "status": status,
        "discharge_clinical_needed": bool_to_int(discharge_clinical_needed),
        "no_pa_required": bool_to_int(no_pa_required),
        "progress_made": bool_to_int(progress_made),
        "facility_informed": bool_to_int(facility_informed),
        "waiting_on_clinicals": bool_to_int(waiting_on_clinicals),
        "los_requested": los_requested.strip(),
        "days_approved": days_approved.strip(),
        "auth_start_date": auth_start_date.isoformat(),
        "auth_end_date": auth_end_date.isoformat(),
    }

    insert_auth(payload)
    st.success("Auth status saved locally.")


def render_in_progress(df: pd.DataFrame) -> None:
    st.subheader("Auth Statuses In Progress")

    if df.empty:
        st.info("No auth statuses saved yet.")
        return

    col_a, col_b, col_c = st.columns(3)
    show_fax = col_a.checkbox("Fax", value=True)
    show_live_call = col_b.checkbox("Live Call", value=True)
    show_web_portal = col_c.checkbox("Web Portal / Availity", value=True)

    filtered = df[df["status"].isin(["In Progress", "Submitted"])].copy()

    method_filters = []

    if show_fax:
        method_filters.append("Fax")

    if show_live_call:
        method_filters.append("Live Call")

    if show_web_portal:
        method_filters.extend(["Web Portal", "Availity"])

    if method_filters:
        mask = filtered["submission_methods"].fillna("").apply(
            lambda value: any(method in value for method in method_filters)
        )
        filtered = filtered[mask]
    else:
        filtered = filtered.iloc[0:0]

    display_columns = [
        "facility",
        "client_name",
        "member_id",
        "loc",
        "insurance",
        "insurance_phone",
        "insurance_fax",
        "status",
        "auth_type",
        "submission_methods",
        "portal_name",
        "fax_numbers",
        "live_call_type",
        "scheduled_call_at",
        "auth_start_date",
        "auth_end_date",
        "waiting_on_clinicals",
        "facility_informed",
        "progress_made",
    ]

    visible = filtered[display_columns].copy()
    visible["auth_start_date"] = visible["auth_start_date"].apply(format_date)
    visible["auth_end_date"] = visible["auth_end_date"].apply(format_date)

    st.dataframe(visible, width="stretch", hide_index=True)

    if filtered.empty:
        return

    st.divider()
    st.subheader("Delete Entry")

    delete_options = {
        f"{row['client_name']} | {row['facility']} | {row['loc']} | ID {row['id']}": int(row["id"])
        for _, row in filtered.iterrows()
    }

    selected_delete = st.selectbox("Select entry to delete", list(delete_options))

    confirm_delete = st.checkbox("I understand this will permanently delete this entry.")

    if st.button("Delete Selected Entry", type="secondary"):
        if not confirm_delete:
            st.error("Check the confirmation box before deleting.")
            return

        delete_auth(delete_options[selected_delete])
        st.success("Entry deleted and JSON backup updated.")
        st.rerun()

    report = build_morning_report(df)

    st.download_button(
        "Export Morning Report TXT",
        data=report,
        file_name="morning_auth_report.txt",
        mime="text/plain",
    )

    recipient = st.text_input("Morning Email Recipient", value=MORNING_EMAIL_TO)

    col_d, col_e = st.columns(2)

    if col_d.button("Open Outlook Draft"):
        try:
            open_outlook_email(report, recipient=recipient)
            st.success("Outlook draft opened.")
        except RuntimeError as exc:
            st.error(str(exc))

    if col_e.button("Send Outlook Email"):
        try:
            message = send_outlook_email(report, recipient=recipient)
            st.success(message)
        except RuntimeError as exc:
            st.error(str(exc))

def render_backup_sidebar() -> None:
    st.sidebar.subheader("Local Backup")

    if st.sidebar.button("Export JSON Backup"):
        export_json()
        st.sidebar.success(f"Exported to {JSON_BACKUP_PATH}")

    if JSON_BACKUP_PATH.exists():
        st.sidebar.download_button(
            "Download JSON Backup",
            data=JSON_BACKUP_PATH.read_text(encoding="utf-8"),
            file_name=JSON_BACKUP_PATH.name,
            mime="application/json",
        )


def main() -> None:
    st.set_page_config(page_title="Local Auth Status Tracker", layout="wide")

    if 'disclaimer_accepted' not in st.session_state:
        st.warning("⚠️ **Disclaimer**: This tool is not HIPAA-compliant out-of-box. "
                   "See DISCLAIMER.md before handling PHI.")
        if st.button("I Understand"):
            st.session_state.disclaimer_accepted = True
            st.rerun()
        st.stop()

    
    init_db()
    auto_import_json_if_empty()

    st.title("Local Auth Status Tracker")
    st.caption("Strict local-only SQLite storage. No cloud database, external API, or telemetry.")

    df = fetch_auths()

    tab_calendar, tab_add, tab_progress = st.tabs(
        ["Calendar", "Add Auth Status", "Auth Statuses In Progress"]
    )

    with tab_calendar:
        render_calendar(df)

    with tab_add:
        render_add_auth()

    with tab_progress:
        render_in_progress(df)

    render_backup_sidebar()


if __name__ == "__main__":
    main()
