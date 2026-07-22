from __future__ import annotations

from authstatus_api.authorizations.state import (
    has_decision,
    initial_timeline_event_payload,
)


def test_has_decision_accepts_terminal_status():
    assert has_decision({"status": "Approved"}) is True
    assert has_decision({"status": "Denied"}) is True
    assert has_decision({"status": "Appealed"}) is True
    assert has_decision({"status": "P2P"}) is True


def test_has_decision_accepts_positive_approved_days():
    assert (
        has_decision(
            {
                "status": "Pending",
                "approved_days": 3,
            }
        )
        is True
    )


def test_has_decision_rejects_pending_record():
    assert (
        has_decision(
            {
                "status": "Pending",
                "approved_days": 0,
            }
        )
        is False
    )


def test_has_decision_handles_invalid_approved_days():
    assert (
        has_decision(
            {
                "status": "Pending",
                "approved_days": "unknown",
            }
        )
        is False
    )


def test_initial_timeline_event_uses_auth_start_date():
    payload = initial_timeline_event_payload(
        {
            "status": "Pending",
            "auth_start_date": "2026-07-20",
            "created_at": "2026-07-19T12:00:00",
            "requested_days": 7,
            "approved_days": 0,
            "auth_end_date": "",
            "review_due_date": "2026-07-27",
        }
    )

    assert payload["event_type"] == ("Initial Authorization")
    assert payload["event_date"] == "2026-07-20"
    assert payload["outcome"] == "Pending"
    assert payload["requested_days"] == 7
    assert payload["review_due_date"] == "2026-07-27"


def test_initial_timeline_event_falls_back_to_created_date():
    payload = initial_timeline_event_payload(
        {
            "status": "Submitted",
            "auth_start_date": "",
            "created_at": "2026-07-19T12:00:00",
        }
    )

    assert payload["event_date"] == "2026-07-19"
    assert payload["outcome"] == "Submitted"
