from __future__ import annotations

import os
import smtplib
from datetime import datetime
from email.message import EmailMessage

import pandas as pd

from config import (
    MORNING_EMAIL_SUBJECT,
    MORNING_EMAIL_TO,
    SMTP_BACKUP_ENABLED,
    SMTP_HOST,
    SMTP_PASSWORD_ENV,
    SMTP_PORT,
    SMTP_USERNAME_ENV,
)
from storage import fetch_auths


def format_date(value: str | None) -> str:
    if not value:
        return ""

    return datetime.strptime(value, "%Y-%m-%d").strftime("%m/%d/%Y")


def build_morning_report(df: pd.DataFrame | None = None) -> str:
    df = fetch_auths() if df is None else df

    if df.empty:
        return "No active authorizations found."

    active = df[df["status"].isin(["In Progress", "Submitted"])]

    if active.empty:
        return "No in-progress or submitted authorizations found."

    lines = ["Morning Auth Workflow Report", ""]

    for _, row in active.iterrows():
        start_date = format_date(row.get("auth_start_date"))
        end_date = format_date(row.get("auth_end_date"))

        lines.append(f"{row['client_name']} - {row['facility']} - {row['loc']}")
        lines.append(f"Status: {row['status']} | Type: {row['auth_type']}")
        lines.append(f"Method: {row['submission_methods']}")
        lines.append(f"Auth Dates: {start_date} to {end_date}")

        if row.get("member_id"):
            lines.append(f"Member ID: {row['member_id']}")

        if row.get("insurance"):
            lines.append(f"Insurance: {row['insurance']}")

        if row.get("insurance_phone"):
            lines.append(f"Insurance Phone: {row['insurance_phone']}")

        if row.get("insurance_fax"):
            lines.append(f"Insurance Fax: {row['insurance_fax']}")

        if row.get("portal_name"):
            lines.append(f"Portal: {row['portal_name']}")

        if row.get("fax_numbers"):
            lines.append(f"Fax: {row['fax_numbers']}")

        if row.get("live_call_type"):
            lines.append(f"Live Call Type: {row['live_call_type']}")

        if row.get("scheduled_call_at"):
            lines.append(f"Scheduled Call: {row['scheduled_call_at']}")

        if row.get("care_manager_enabled") and row.get("care_manager_details"):
            lines.append(f"Care Manager / Team: {row['care_manager_details']}")

        if row.get("waiting_on_clinicals"):
            lines.append("Waiting on clinicals from facility.")

        if row.get("discharge_clinical_needed"):
            lines.append("Discharge clinical needs to be sent.")

        if row.get("facility_informed"):
            lines.append("Facility has been informed.")

        if row.get("no_pa_required"):
            lines.append("NO PA required.")

        if row.get("notes_links"):
            lines.append(f"Notes/Links: {row['notes_links']}")

        lines.append("")

    return "\n".join(lines)


def open_outlook_email(
    body: str,
    subject: str = MORNING_EMAIL_SUBJECT,
    recipient: str = MORNING_EMAIL_TO,
) -> None:
    recipient = recipient.strip()

    try:
        import pythoncom
        import win32com.client
    except ImportError as exc:
        raise RuntimeError("pywin32 is not installed. Run: pip install pywin32") from exc

    try:
        pythoncom.CoInitialize()
        outlook = win32com.client.DispatchEx("Outlook.Application")
    except Exception as exc:
        raise RuntimeError(
            "Outlook desktop is not available on this machine. "
            "Install/configure classic Outlook, or use Send Outlook Email with SMTP backup."
        ) from exc

    mail = outlook.CreateItem(0)

    if recipient:
        mail.To = recipient

    mail.Subject = subject
    mail.Body = body
    mail.Display()


def send_outlook_email(
    body: str,
    subject: str = MORNING_EMAIL_SUBJECT,
    recipient: str = MORNING_EMAIL_TO,
) -> str:
    recipient = recipient.strip()

    if not recipient:
        raise RuntimeError("No email recipient was provided.")

    try:
        send_with_outlook(body=body, subject=subject, recipient=recipient)
        return "Email sent through Outlook."
    except Exception as outlook_error:
        if not SMTP_BACKUP_ENABLED:
            raise RuntimeError(
                f"Outlook failed and SMTP backup is disabled: {outlook_error}"
            ) from outlook_error
        send_with_smtp_backup(body=body, subject=subject, recipient=recipient)
        return "Outlook failed, so the email was sent through SMTP backup."


def send_with_outlook(body: str, subject: str, recipient: str) -> None:
    try:
        import pythoncom
        import win32com.client
    except ImportError as exc:
        raise RuntimeError("pywin32 is not installed. Run: pip install pywin32") from exc

    pythoncom.CoInitialize()

    outlook = win32com.client.DispatchEx("Outlook.Application")
    mail = outlook.CreateItem(0)

    mail.To = recipient
    mail.Subject = subject
    mail.Body = body
    mail.Send()


def send_with_smtp_backup(body: str, subject: str, recipient: str) -> None:
    username = os.getenv(SMTP_USERNAME_ENV, "").strip()
    password = os.getenv(SMTP_PASSWORD_ENV, "").strip()

    if not username or not password:
        raise RuntimeError(
            "Outlook failed, and SMTP backup is missing credentials. "
            f"Set {SMTP_USERNAME_ENV} and {SMTP_PASSWORD_ENV} as environment variables."
        )

    message = EmailMessage()
    message["From"] = username
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(username, password)
        server.send_message(message)