from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from authstatus_api.crypto import generate_encryption_key
from authstatus_api.database import get_conn
from authstatus_api.main import create_app
from authstatus_api.pdf_intake.extractor import (
    EncryptedPdfError,
    InvalidPdfError,
    PdfTextExtractionResult,
)
from authstatus_api.pdf_intake.templates.standard_vob import (
    ExtractedValue,
    ExtractionSource,
    StandardVobExtraction,
)
from authstatus_api.security.repository import create_user
from authstatus_api.settings import get_settings
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def configure_test_settings(tmp_path, monkeypatch):
    monkeypatch.setenv(
        "AUTHSTATUS_ENCRYPTION_KEY",
        generate_encryption_key(),
    )
    monkeypatch.setenv(
        "AUTHSTATUS_DATABASE_PATH",
        str(tmp_path / "auth_tracker.db"),
    )
    get_settings.cache_clear()

    yield

    get_settings.cache_clear()


@pytest.fixture
def client():
    with TestClient(create_app()) as test_client:
        yield test_client


def auth_headers_for(
    client: TestClient,
    username: str,
    password: str,
) -> dict[str, str]:
    response = client.post(
        "/api/security/login",
        json={
            "username": username,
            "password": password,
        },
    )

    assert response.status_code == 200

    token = client.cookies.get("carequeue_session")

    assert token

    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/pdf",
    }


def extraction_result(
    *,
    has_usable_text: bool = True,
) -> PdfTextExtractionResult:
    return PdfTextExtractionResult(
        page_count=1,
        page_texts=("sensitive full PDF text",),
        combined_text="sensitive full PDF text",
        has_usable_text=has_usable_text,
        form_fields=(),
    )


def parsed_result() -> StandardVobExtraction:
    return StandardVobExtraction(
        template_id="standard_vob_v1",
        is_match=True,
        admit_date_range=ExtractedValue(
            value="01/15/2030 - 01/15/2030",
            source=ExtractionSource.FORM_FIELD,
        ),
        facility=ExtractedValue(
            value="Example Facility",
            source=ExtractionSource.FORM_FIELD,
        ),
        patient_name=ExtractedValue(
            value="Test Patient",
            source=ExtractionSource.FORM_FIELD,
        ),
        patient_dob=ExtractedValue(
            value="01/02/1990",
            source=ExtractionSource.FORM_FIELD,
        ),
        insurance_company=ExtractedValue(
            value="Example Health Plan",
            source=ExtractionSource.FORM_FIELD,
        ),
        insurance_phone=ExtractedValue(
            value="844-555-0101",
            source=ExtractionSource.FORM_FIELD,
        ),
        medical_member_id=ExtractedValue(
            value="TEST-MED-12345",
            source=ExtractionSource.FORM_FIELD,
        ),
        medical_group_number=ExtractedValue(
            value="TEST-GROUP-100",
            source=ExtractionSource.FORM_FIELD,
        ),
        behavioral_health_member_id=ExtractedValue(
            value="TEST-BH-67890",
            source=ExtractionSource.FORM_FIELD,
        ),
        behavioral_health_group_number=ExtractedValue(
            value="TEST-BH-GROUP-200",
            source=ExtractionSource.FORM_FIELD,
        ),
        authorization_phone=ExtractedValue(
            value="800-555-0100",
            source=ExtractionSource.FORM_FIELD,
        ),
    )


@pytest.mark.parametrize("role", ["Admin", "UR"])
def test_authorized_role_can_preview_pdf(
    client,
    role,
):
    username = f"{role.lower()}@example.com"
    create_user(
        username,
        "password value",
        role=role,
    )

    with (
        patch(
            "authstatus_api.pdf_intake.router.extract_pdf_text",
            return_value=extraction_result(),
        ) as extract_mock,
        patch(
            "authstatus_api.pdf_intake.router.parse_standard_vob",
            return_value=parsed_result(),
        ),
    ):
        response = client.post(
            "/api/pdf-intake/preview",
            content=b"%PDF-1.7 synthetic content",
            headers=auth_headers_for(
                client,
                username,
                "password value",
            ),
        )

    assert response.status_code == 200
    extract_mock.assert_called_once_with(
        b"%PDF-1.7 synthetic content"
    )

    data = response.json()

    assert data["template_id"] == "standard_vob_v1"
    assert data["template_matched"] is True
    assert data["facility"] == {
        "value": "Example Facility",
        "source": "form_field",
    }
    assert data["date_of_birth"] == {
        "value": "01/02/1990",
        "source": "form_field",
    }
    assert data["authorization_phone"] == {
        "value": "800-555-0100",
        "source": "form_field",
    }
    assert data["has_usable_text"] is True

    serialized_response = response.text

    assert "sensitive full PDF text" not in serialized_response
    assert "page_texts" not in data
    assert "combined_text" not in data
    assert "form_fields" not in data
    assert "rectangle" not in serialized_response

    assert response.headers["cache-control"] == (
        "no-store, private"
    )
    assert response.headers["pragma"] == "no-cache"
    assert response.headers["expires"] == "0"


def test_pdf_preview_requires_authentication(client):
    response = client.post(
        "/api/pdf-intake/preview",
        content=b"%PDF-1.7 synthetic content",
        headers={
            "Content-Type": "application/pdf",
        },
    )

    assert response.status_code == 401


def test_read_only_user_cannot_preview_pdf(client):
    create_user(
        "readonly@example.com",
        "password value",
        role="Read Only",
    )

    response = client.post(
        "/api/pdf-intake/preview",
        content=b"%PDF-1.7 synthetic content",
        headers=auth_headers_for(
            client,
            "readonly@example.com",
            "password value",
        ),
    )

    assert response.status_code == 403


def test_pdf_preview_requires_pdf_content_type(client):
    create_user(
        "user@example.com",
        "password value",
        role="UR",
    )

    headers = auth_headers_for(
        client,
        "user@example.com",
        "password value",
    )
    headers["Content-Type"] = "text/plain"

    response = client.post(
        "/api/pdf-intake/preview",
        content=b"%PDF-1.7 synthetic content",
        headers=headers,
    )

    assert response.status_code == 415
    assert response.json() == {
        "detail": "The request must contain a PDF.",
    }
    assert response.headers["cache-control"] == (
        "no-store, private"
    )


def test_pdf_preview_rejects_invalid_pdf_safely(client):
    create_user(
        "user@example.com",
        "password value",
        role="UR",
    )

    with patch(
        "authstatus_api.pdf_intake.router.extract_pdf_text",
        side_effect=InvalidPdfError(
            "sensitive parser internals"
        ),
    ):
        response = client.post(
            "/api/pdf-intake/preview",
            content=b"%PDF-invalid",
            headers=auth_headers_for(
                client,
                "user@example.com",
                "password value",
            ),
        )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "The uploaded PDF could not be read.",
    }
    assert "sensitive parser internals" not in response.text
    assert response.headers["cache-control"] == (
        "no-store, private"
    )


def test_pdf_preview_rejects_encrypted_pdf_safely(client):
    create_user(
        "user@example.com",
        "password value",
        role="UR",
    )

    with patch(
        "authstatus_api.pdf_intake.router.extract_pdf_text",
        side_effect=EncryptedPdfError(
            "sensitive encryption details"
        ),
    ):
        response = client.post(
            "/api/pdf-intake/preview",
            content=b"%PDF-encrypted",
            headers=auth_headers_for(
                client,
                "user@example.com",
                "password value",
            ),
        )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Encrypted PDFs are not supported.",
    }
    assert "sensitive encryption details" not in response.text


def test_pdf_preview_audit_metadata_contains_no_phi(client):
    create_user(
        "user@example.com",
        "password value",
        role="UR",
    )

    with (
        patch(
            "authstatus_api.pdf_intake.router.extract_pdf_text",
            return_value=extraction_result(),
        ),
        patch(
            "authstatus_api.pdf_intake.router.parse_standard_vob",
            return_value=parsed_result(),
        ),
    ):
        response = client.post(
            "/api/pdf-intake/preview",
            content=b"%PDF-1.7 synthetic content",
            headers=auth_headers_for(
                client,
                "user@example.com",
                "password value",
            ),
        )

    assert response.status_code == 200

    with get_conn() as conn:
        audit_row = conn.execute(
            """
            SELECT action, resource_type, metadata
            FROM audit_events
            WHERE action = 'pdf_intake.preview'
            ORDER BY id DESC
            LIMIT 1
            """
        ).fetchone()

    assert audit_row is not None
    assert audit_row["resource_type"] == "pdf_intake"

    metadata = json.loads(audit_row["metadata"])

    assert metadata == {
        "candidate_count": 11,
        "has_usable_text": True,
        "template_matched": True,
    }

    serialized_metadata = audit_row["metadata"]

    for sensitive_value in (
        "Test Patient",
        "01/02/1990",
        "TEST-MED-12345",
        "TEST-GROUP-100",
        "TEST-BH-67890",
        "TEST-BH-GROUP-200",
        "Example Facility",
        "Example Health Plan",
        "800-555-0100",
        "844-555-0101",
        "sensitive full PDF text",
    ):
        assert sensitive_value not in serialized_metadata