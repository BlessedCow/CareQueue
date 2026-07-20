from __future__ import annotations

import pytest

from authstatus_api.authorizations.timeline import (
    current_auth_snapshot,
    event_datetime_value,
    is_request_submitted_event,
    is_terminal_event,
    status_from_timeline_event,
    timeline_status,
)


@pytest.mark.parametrize(
    ("event", "expected"),
    [
        (
            {
                "event_date": "2026-07-19",
                "event_time": "",
            },
            "2026-07-19T00:00:00",
        ),
        (
            {
                "event_date": "2026-07-19",
                "event_time": "14:30",
            },
            "2026-07-19T14:30:00",
        ),
        (
            {
                "event_date": "2026-07-19",
                "event_time": "14:30:15",
            },
            "2026-07-19T14:30:15",
        ),
        (
            {
                "event_date": "",
                "event_time": "14:30",
            },
            "",
        ),
    ],
)
def test_event_datetime_value(event, expected):
    assert event_datetime_value(event) == expected


@pytest.mark.parametrize(
    "event_type",
    [
        "Request Submitted",
        "request submitted",
        "Initial Authorization",
    ],
)
def test_request_submitted_events_are_detected(
    event_type,
):
    assert is_request_submitted_event(
        {
            "event_type": event_type,
        }
    )


@pytest.mark.parametrize(
    "event",
    [
        {
            "event_type": "Payer Response",
        },
        {
            "event_type": "Peer Review",
        },
        {
            "outcome": "Approved",
        },
        {
            "outcome": "Discharged",
        },
    ],
)
def test_terminal_events_are_detected(event):
    assert is_terminal_event(event)


@pytest.mark.parametrize(
    ("event", "expected"),
    [
        (
            {
                "event_type": "Request Submitted",
            },
            "Pending",
        ),
        (
            {
                "outcome": "Approved",
            },
            "Approved",
        ),
        (
            {
                "outcome": "Denied",
            },
            "Denied",
        ),
        (
            {
                "event_type": "Peer Review",
            },
            "P2P",
        ),
        (
            {
                "event_type": "Appeal",
            },
            "Appealed",
        ),
        (
            {
                "outcome": "No PA Required",
            },
            "No PA Required",
        ),
    ],
)
def test_status_is_derived_from_timeline_event(
    event,
    expected,
):
    assert status_from_timeline_event(event) == expected


def test_terminal_completion_overrides_later_pending_event():
    events = [
        {
            "event_type": "Authorization Complete",
            "outcome": "",
        },
        {
            "event_type": "Request Submitted",
            "outcome": "Pending",
        },
    ]

    assert timeline_status(events) == "Completed"


def test_snapshot_uses_latest_review_values():
    events = [
        {
            "event_type": "Initial Authorization",
            "outcome": "Pending",
            "requested_days": 5,
            "approved_days": 0,
            "auth_start_date": "2026-07-01",
            "auth_end_date": "",
            "review_due_date": "2026-07-05",
        },
        {
            "event_type": "Payer Response",
            "outcome": "Approved",
            "requested_days": 5,
            "approved_days": 3,
            "auth_start_date": "2026-07-01",
            "auth_end_date": "2026-07-03",
            "review_due_date": "2026-07-04",
        },
    ]

    assert current_auth_snapshot(events) == {
        "status": "Approved",
        "requested_days": 5,
        "approved_days": 3,
        "auth_start_date": "2026-07-01",
        "auth_end_date": "2026-07-03",
        "review_due_date": "2026-07-04",
    }


@pytest.mark.parametrize(
    "terminal_status",
    [
        "Completed",
        "Discharged",
        "No PA Required",
    ],
)
def test_terminal_snapshot_clears_review_due_date(
    terminal_status,
):
    events = [
        {
            "event_type": "Initial Authorization",
            "outcome": "Pending",
            "review_due_date": "2026-07-05",
        },
        {
            "event_type": "Status Update",
            "outcome": terminal_status,
        },
    ]

    snapshot = current_auth_snapshot(events)

    assert snapshot["status"] == terminal_status
    assert snapshot["review_due_date"] is None
