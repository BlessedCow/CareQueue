from __future__ import annotations

import pytest
from authstatus_api.registered_options.repository import (
    ProtectedRegisteredOptionError,
    RegisteredOptionAlreadyExistsError,
    create_registered_option,
    delete_registered_option,
    get_registered_option,
    list_registered_options,
)
from authstatus_api.settings import get_settings


@pytest.fixture(autouse=True)
def configure_test_settings(tmp_path, monkeypatch):
    monkeypatch.setenv(
        "AUTHSTATUS_DATABASE_PATH",
        str(tmp_path / "auth_tracker.db"),
    )
    get_settings.cache_clear()

    yield

    get_settings.cache_clear()


def test_list_registered_options_returns_seeded_options():
    options = list_registered_options()

    assert [
        (option["category"], option["name"], option["is_protected"])
        for option in options
    ] == [
        ("facility", "Other", True),
        ("insurance", "Other", True),
        ("web_portal", "Other", True),
    ]


def test_list_registered_options_can_filter_by_category():
    create_registered_option(
        category="facility",
        name="Example Facility",
    )
    create_registered_option(
        category="insurance",
        name="Example Insurance",
    )

    options = list_registered_options(category="facility")

    assert [option["name"] for option in options] == [
        "Example Facility",
        "Other",
    ]
    assert all(option["category"] == "facility" for option in options)


def test_create_registered_option_normalizes_display_whitespace():
    option = create_registered_option(
        category="facility",
        name="  Example   Treatment   Center  ",
    )

    assert option["name"] == "Example Treatment Center"
    assert option["normalized_name"] == "example treatment center"
    assert option["is_protected"] is False


def test_create_registered_option_prevents_case_insensitive_duplicates():
    create_registered_option(
        category="insurance",
        name="Example Insurance",
    )

    with pytest.raises(
        RegisteredOptionAlreadyExistsError,
        match="already exists",
    ):
        create_registered_option(
            category="insurance",
            name="  EXAMPLE   INSURANCE ",
        )


def test_same_name_can_exist_in_different_categories():
    facility = create_registered_option(
        category="facility",
        name="Example",
    )
    insurance = create_registered_option(
        category="insurance",
        name="Example",
    )

    assert facility["category"] == "facility"
    assert insurance["category"] == "insurance"


def test_create_registered_option_rejects_empty_name():
    with pytest.raises(
        ValueError,
        match="Option name is required",
    ):
        create_registered_option(
            category="facility",
            name="   ",
        )


def test_repository_rejects_unknown_category():
    with pytest.raises(
        ValueError,
        match="Invalid registered option category",
    ):
        create_registered_option(
            category="unknown",
            name="Example",
        )

    with pytest.raises(
        ValueError,
        match="Invalid registered option category",
    ):
        list_registered_options(category="unknown")


def test_get_registered_option_returns_created_option():
    created = create_registered_option(
        category="web_portal",
        name="Example Portal",
    )

    loaded = get_registered_option(created["id"])

    assert loaded == created


def test_get_registered_option_returns_none_for_missing_option():
    assert get_registered_option(999) is None


def test_delete_registered_option_removes_custom_option():
    option = create_registered_option(
        category="facility",
        name="Example Facility",
    )

    assert delete_registered_option(option["id"]) is True
    assert get_registered_option(option["id"]) is None


def test_delete_registered_option_returns_false_for_missing_option():
    assert delete_registered_option(999) is False


def test_delete_registered_option_rejects_protected_option():
    other_option = list_registered_options(category="facility")[0]

    with pytest.raises(
        ProtectedRegisteredOptionError,
        match="cannot be deleted",
    ):
        delete_registered_option(other_option["id"])

    assert get_registered_option(other_option["id"]) is not None