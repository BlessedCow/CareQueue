from __future__ import annotations

import pytest

from authstatus_api.security.temporary_passwords import (
    TEMPORARY_PASSWORD_LENGTH,
    generate_temporary_password,
)


def test_generate_temporary_password_uses_expected_default_length():
    password = generate_temporary_password()

    assert len(password) == TEMPORARY_PASSWORD_LENGTH


def test_generate_temporary_password_contains_multiple_character_classes():
    password = generate_temporary_password()

    assert any(character.islower() for character in password)
    assert any(character.isupper() for character in password)
    assert any(character.isdigit() for character in password)
    assert any(
        character in "!@#$%^&*()-_=+"
        for character in password
    )


def test_generate_temporary_password_returns_unique_values():
    passwords = {
        generate_temporary_password()
        for _ in range(25)
    }

    assert len(passwords) == 25


def test_generate_temporary_password_supports_custom_length():
    password = generate_temporary_password(length=32)

    assert len(password) == 32


def test_generate_temporary_password_rejects_short_length():
    with pytest.raises(
        ValueError,
        match="at least 16 characters",
    ):
        generate_temporary_password(length=15)