from __future__ import annotations

from unittest.mock import Mock, patch

import pytest
from pypdf.errors import PdfReadError

from authstatus_api.pdf_intake.extractor import (
    EncryptedPdfError,
    InvalidPdfError,
    OversizedPdfError,
    PdfFormField,
    extract_pdf_text,
)


def mock_reader_with_pages(
    page_texts: list[str | None],
    *,
    is_encrypted: bool = False,
) -> Mock:
    reader = Mock()
    reader.is_encrypted = is_encrypted

    pages = []

    for page_text in page_texts:
        page = Mock()
        page.extract_text.return_value = page_text
        page.get.return_value = []
        pages.append(page)

    reader.pages = pages

    return reader


def test_extract_pdf_text_returns_normalized_page_text():
    reader = mock_reader_with_pages(
        [
            "FACILITY:   Example Facility\nDOB:  01/02/2000",
            "PHONE NUMBER FOR AUTHORIZATION: 800-555-0100",
        ]
    )

    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        return_value=reader,
    ):
        result = extract_pdf_text(b"%PDF-1.7 test content")

    assert result.page_count == 2
    assert result.page_texts == (
        "FACILITY: Example Facility\nDOB: 01/02/2000",
        "PHONE NUMBER FOR AUTHORIZATION: 800-555-0100",
    )
    assert result.combined_text == (
        "FACILITY: Example Facility\nDOB: 01/02/2000"
        "\n\n"
        "PHONE NUMBER FOR AUTHORIZATION: 800-555-0100"
    )
    assert result.has_usable_text is True
    assert result.form_fields == ()


def test_extract_pdf_text_marks_image_only_pdf_as_not_usable():
    reader = mock_reader_with_pages([None, "  "])

    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        return_value=reader,
    ):
        result = extract_pdf_text(b"%PDF-1.7 image only")

    assert result.page_count == 2
    assert result.page_texts == ("", "")
    assert result.combined_text == ""
    assert result.has_usable_text is False
    assert result.form_fields == ()


def test_extract_pdf_text_returns_form_fields_and_regular_text():
    reader = mock_reader_with_pages(
        [
            (
                "FACILITY: Example Facility\n"
                "DOB: 01/02/2000"
            ),
        ]
    )

    widget = {
        "/Subtype": "/Widget",
        "/T": "text_1tgth",
        "/V": "Example Facility",
        "/FT": "/Tx",
        "/Rect": [100, 700, 300, 720],
    }
    annotation_reference = Mock()
    annotation_reference.get_object.return_value = widget
    reader.pages[0].get.return_value = [annotation_reference]

    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        return_value=reader,
    ):
        result = extract_pdf_text(b"%PDF-1.7 fillable")

    assert result.combined_text == (
        "FACILITY: Example Facility\n"
        "DOB: 01/02/2000"
    )
    assert result.has_usable_text is True
    assert result.form_fields == (
        PdfFormField(
            name="text_1tgth",
            value="Example Facility",
            field_type="Tx",
            page_number=1,
            rectangle=(100.0, 700.0, 300.0, 720.0),
        ),
    )


def test_extract_pdf_text_reads_inherited_form_properties():
    reader = mock_reader_with_pages(["FACILITY:"])

    parent_field = {
        "/T": "text_parent_field",
        "/V": "Example Facility",
        "/FT": "/Tx",
    }
    widget = {
        "/Subtype": "/Widget",
        "/Parent": parent_field,
        "/Rect": [100, 700, 300, 720],
    }
    annotation_reference = Mock()
    annotation_reference.get_object.return_value = widget
    reader.pages[0].get.return_value = [annotation_reference]

    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        return_value=reader,
    ):
        result = extract_pdf_text(b"%PDF-1.7 inherited field")

    assert result.form_fields == (
        PdfFormField(
            name="text_parent_field",
            value="Example Facility",
            field_type="Tx",
            page_number=1,
            rectangle=(100.0, 700.0, 300.0, 720.0),
        ),
    )


def test_extract_pdf_text_keeps_blank_form_fields():
    reader = mock_reader_with_pages(
        ["ADMIT DATE RANGE: FACILITY: DOB:"]
    )

    widget = {
        "/Subtype": "/Widget",
        "/T": "text_blank_field",
        "/FT": "/Tx",
        "/Rect": [100, 700, 300, 720],
    }
    annotation_reference = Mock()
    annotation_reference.get_object.return_value = widget
    reader.pages[0].get.return_value = [annotation_reference]

    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        return_value=reader,
    ):
        result = extract_pdf_text(b"%PDF-1.7 blank field")

    assert result.form_fields == (
        PdfFormField(
            name="text_blank_field",
            value="",
            field_type="Tx",
            page_number=1,
            rectangle=(100.0, 700.0, 300.0, 720.0),
        ),
    )


def test_malformed_form_metadata_does_not_block_text_fallback():
    reader = mock_reader_with_pages(
        [
            (
                "FACILITY: Example Facility\n"
                "DOB: 01/02/2000"
            ),
        ]
    )

    malformed_annotation = Mock()
    malformed_annotation.get_object.side_effect = ValueError(
        "sensitive form metadata"
    )
    reader.pages[0].get.return_value = [malformed_annotation]

    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        return_value=reader,
    ):
        result = extract_pdf_text(
            b"%PDF-1.7 malformed form metadata"
        )

    assert result.combined_text == (
        "FACILITY: Example Facility\n"
        "DOB: 01/02/2000"
    )
    assert result.has_usable_text is True
    assert result.form_fields == ()


def test_non_widget_annotations_are_ignored():
    reader = mock_reader_with_pages(
        ["FACILITY: Example Facility"]
    )

    annotation = {
        "/Subtype": "/Link",
        "/T": "not-a-form-field",
        "/V": "ignored value",
        "/Rect": [100, 700, 300, 720],
    }
    annotation_reference = Mock()
    annotation_reference.get_object.return_value = annotation
    reader.pages[0].get.return_value = [annotation_reference]

    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        return_value=reader,
    ):
        result = extract_pdf_text(b"%PDF-1.7 annotation")

    assert result.form_fields == ()
    assert result.combined_text == "FACILITY: Example Facility"


def test_duplicate_form_widgets_are_returned_once():
    reader = mock_reader_with_pages(
        ["FACILITY: Example Facility"]
    )

    widget = {
        "/Subtype": "/Widget",
        "/T": "text_duplicate",
        "/V": "Example Facility",
        "/FT": "/Tx",
        "/Rect": [100, 700, 300, 720],
    }

    first_reference = Mock()
    first_reference.get_object.return_value = widget
    second_reference = Mock()
    second_reference.get_object.return_value = widget

    reader.pages[0].get.return_value = [
        first_reference,
        second_reference,
    ]

    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        return_value=reader,
    ):
        result = extract_pdf_text(b"%PDF-1.7 duplicate widgets")

    assert len(result.form_fields) == 1


def test_extract_pdf_text_rejects_empty_upload():
    with pytest.raises(
        InvalidPdfError,
        match="empty",
    ):
        extract_pdf_text(b"")


def test_extract_pdf_text_rejects_non_pdf_file():
    with pytest.raises(
        InvalidPdfError,
        match="not a valid PDF",
    ):
        extract_pdf_text(b"plain text file")


def test_extract_pdf_text_rejects_oversized_pdf():
    with pytest.raises(
        OversizedPdfError,
        match="exceeds",
    ):
        extract_pdf_text(
            b"%PDF-" + b"x" * 20,
            max_size_bytes=10,
        )


def test_extract_pdf_text_rejects_encrypted_pdf():
    reader = mock_reader_with_pages(
        [],
        is_encrypted=True,
    )

    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        return_value=reader,
    ):
        with pytest.raises(
            EncryptedPdfError,
            match="Encrypted PDFs",
        ):
            extract_pdf_text(b"%PDF-1.7 encrypted")


def test_extract_pdf_text_converts_reader_failure_to_safe_error():
    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        side_effect=PdfReadError("sensitive parser details"),
    ):
        with pytest.raises(
            InvalidPdfError,
            match="could not be read",
        ) as error_info:
            extract_pdf_text(b"%PDF-1.7 malformed")

    assert "sensitive parser details" not in str(error_info.value)


def test_extract_pdf_text_converts_page_failure_to_safe_error():
    reader = mock_reader_with_pages(["placeholder"])
    reader.pages[0].extract_text.side_effect = PdfReadError(
        "sensitive page details"
    )

    with patch(
        "authstatus_api.pdf_intake.extractor.PdfReader",
        return_value=reader,
    ):
        with pytest.raises(
            InvalidPdfError,
            match="Text could not be extracted",
        ) as error_info:
            extract_pdf_text(b"%PDF-1.7 malformed page")

    assert "sensitive page details" not in str(error_info.value)