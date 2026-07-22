from __future__ import annotations

from authstatus_api.authorizations.analytics import (
    summarize_authorizations,
)


def test_summarize_authorizations_counts_records():
    summary = summarize_authorizations(
        [
            {
                "status": "Pending",
                "loc": "DTX",
                "auth_type": "Initial",
                "no_pa_required": False,
                "waiting_on_clinicals": True,
            },
            {
                "status": "Submitted",
                "loc": "PHP",
                "auth_type": "Initial",
                "no_pa_required": True,
                "waiting_on_clinicals": False,
            },
            {
                "status": "Pending",
                "loc": "DTX",
                "auth_type": "Concurrent",
                "no_pa_required": False,
                "waiting_on_clinicals": True,
            },
        ]
    )

    assert summary == {
        "total_auths": 3,
        "by_status": {
            "Pending": 2,
            "Submitted": 1,
        },
        "by_loc": {
            "DTX": 2,
            "PHP": 1,
        },
        "by_auth_type": {
            "Initial": 2,
            "Concurrent": 1,
        },
        "no_pa_required": 1,
        "waiting_on_clinicals": 2,
    }


def test_summarize_authorizations_uses_unknown_labels():
    summary = summarize_authorizations(
        [
            {
                "status": "",
                "loc": None,
                "auth_type": "",
            }
        ]
    )

    assert summary["by_status"] == {"Unknown": 1}
    assert summary["by_loc"] == {"Unknown": 1}
    assert summary["by_auth_type"] == {"Unknown": 1}


def test_summarize_authorizations_handles_empty_records():
    summary = summarize_authorizations([])

    assert summary == {
        "total_auths": 0,
        "by_status": {},
        "by_loc": {},
        "by_auth_type": {},
        "no_pa_required": 0,
        "waiting_on_clinicals": 0,
    }
