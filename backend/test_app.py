from datetime import date

import pandas as pd

from app import bool_to_int, combine_date_time, format_and_validate_phone
from emailer import build_morning_report, format_date


def test_format_date_mm_dd_yyyy():
    assert format_date("2026-06-19") == "06/19/2026"

def test_format_date_none():
    assert format_date(None) == ""

def test_format_date_empty_string():
    assert format_date("") == ""

def test_morning_report_empty_dataframe():
    assert build_morning_report(pd.DataFrame()) == "No active authorizations found."
    
def test_morning_report_no_active_auths():
    df = pd.DataFrame(
        [
            {
                "client_name": "John",
                "facility": "Facility A",
                "loc": "RTC",
                "status": "Discharge",
                "auth_type": "Concurrent",
                "submission_methods": "Fax",
                "auth_start_date": "2026-06-01",
                "auth_end_date": "2026-06-10",
            }
        ]
    )

    assert (
        build_morning_report(df)
        == "No in-progress or submitted authorizations found."
    )


def test_morning_report_filters_only_active_auths():
    df = pd.DataFrame(
        [
            {
                "client_name": "John Smith",
                "facility": "Facility A",
                "loc": "RTC",
                "status": "In Progress",
                "auth_type": "Concurrent",
                "submission_methods": "Fax",
                "auth_start_date": "2026-06-01",
                "auth_end_date": "2026-06-10",
            },
            {
                "client_name": "Jane Doe",
                "facility": "Facility B",
                "loc": "PHP",
                "status": "Discharge",
                "auth_type": "Concurrent",
                "submission_methods": "Fax",
                "auth_start_date": "2026-06-01",
                "auth_end_date": "2026-06-10",
            },
        ]
    )

    report = build_morning_report(df)

    assert "John Smith" in report
    assert "Jane Doe" not in report


def test_morning_report_includes_optional_fields():
    df = pd.DataFrame(
        [
            {
                "client_name": "John Smith",
                "facility": "Facility A",
                "loc": "RTC",
                "status": "In Progress",
                "auth_type": "Concurrent",
                "submission_methods": "Web Portal",
                "auth_start_date": "2026-06-01",
                "auth_end_date": "2026-06-10",
                "member_id": "ABC123",
                "insurance": "Aetna",
                "insurance_phone": "800-111-2222",
                "insurance_fax": "800-333-4444",
                "portal_name": "Availity",
                "fax_numbers": "555-1234",
                "live_call_type": "Dedicated CM",
                "scheduled_call_at": "2026-06-19T08:00",
                "care_manager_enabled": 1,
                "care_manager_details": "Jane CM",
                "waiting_on_clinicals": 1,
                "discharge_clinical_needed": 1,
                "facility_informed": 1,
                "no_pa_required": 1,
                "notes_links": "Important notes",
            }
        ]
    )

    report = build_morning_report(df)

    assert "Member ID: ABC123" in report
    assert "Insurance: Aetna" in report
    assert "Insurance Phone: 800-111-2222" in report
    assert "Insurance Fax: 800-333-4444" in report
    assert "Portal: Availity" in report
    assert "Fax: 800-555-1234" in report
    assert "Live Call Type: Dedicated CM" in report
    assert "Scheduled Call: 2026-06-19T08:00" in report
    assert "Care Manager / Team: Jane CM" in report
    assert "Waiting on clinicals from facility." in report
    assert "Discharge clinical needs to be sent." in report
    assert "Facility has been informed." in report
    assert "NO PA required." in report
    assert "Notes/Links: Important notes" in report


def test_bool_to_int_true():
    assert bool_to_int(True) == 1


def test_bool_to_int_false():
    assert bool_to_int(False) == 0


def test_combine_date_time_no_date():
    assert combine_date_time(None, None) == ""


def test_combine_date_time_default_time():
    result = combine_date_time(date(2026, 6, 19), None)

    assert result == "2026-06-19T08:00"


def test_combine_date_time_custom_time():
    from datetime import time

    result = combine_date_time(
        date(2026, 6, 19),
        time(14, 30),
    )

    assert result == "2026-06-19T14:30"
    
def test_phone_formatting_messy_input():
    assert format_and_validate_phone("1234567890", "Test Phone") == "123-456-7890"
    assert format_and_validate_phone("(123) 456-7890", "Test Phone") == "123-456-7890"

def test_phone_validation_too_short_or_long():
    assert format_and_validate_phone("123456789", "Test Phone") == "INVALID"       # 9 digits
    assert format_and_validate_phone("123456789012", "Test Phone") == "INVALID"   # 12 digits