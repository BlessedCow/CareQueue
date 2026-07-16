from __future__ import annotations

import secrets
import string

TEMPORARY_PASSWORD_LENGTH = 24

_PASSWORD_ALPHABET = (
    string.ascii_letters
    + string.digits
    + "!@#$%^&*()-_=+"
)


def generate_temporary_password(
    length: int = TEMPORARY_PASSWORD_LENGTH,
) -> str:
    if length < 16:
        raise ValueError("Temporary passwords must be at least 16 characters.")

    while True:
        password = "".join(
            secrets.choice(_PASSWORD_ALPHABET)
            for _ in range(length)
        )

        if (
            any(character.islower() for character in password)
            and any(character.isupper() for character in password)
            and any(character.isdigit() for character in password)
            and any(
                character in "!@#$%^&*()-_=+"
                for character in password
            )
        ):
            return password