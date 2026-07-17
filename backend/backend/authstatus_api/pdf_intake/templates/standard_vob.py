from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum

from authstatus_api.pdf_intake.extractor import (
    PdfTextExtractionResult,
)

STANDARD_VOB_TEMPLATE_ID = "standard_vob_v1"

STANDARD_VOB_REQUIRED_LABELS = (
    "ADMIT DATE RANGE:",
    "FACILITY:",
    "PATIENT INFORMATION",
    "INSURANCE COMPANY:",
    "MEDICAL ID#:",
    "PHONE NUMBER FOR AUTHORIZATION:",
)

STANDARD_VOB_FORM_FIELD_NAMES = {
    "admit_date_range": "text_1tgth",
    "facility": "text_2mfsh",
    "patient_name": "text_4cvll",
    "patient_dob": "text_5vani",
    "insurance_company": "text_18cnrm",
    "insurance_phone": "text_19jkwv",
    "medical_member_id": "text_27yesv",
    "medical_group_number": "text_26rjsk",
    "behavioral_health_member_id": "text_25attw",
    "behavioral_health_group_number": "text_23ikpt",
    "authorization_phone": "text_47lxxj",
}

STANDARD_VOB_TEXT_PATTERNS = {
    "admit_date_range": re.compile(
        r"^ADMIT DATE RANGE:[ \t]*(.*?)"
        r"(?=[ \t]*NUMBER OF ADMIT:|$)",
        re.IGNORECASE | re.MULTILINE,
    ),
    "facility": re.compile(
        r"^FACILITY:[ \t]*(.*?)"
        r"(?=[ \t]*CALLER:|$)",
        re.IGNORECASE | re.MULTILINE,
    ),
    "patient_name": re.compile(
        r"^PATIENT:[ \t]*(.*?)$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "patient_dob": re.compile(
        r"^DOB:[ \t]*(.*?)"
        r"(?=[ \t]*GENDER:|$)",
        re.IGNORECASE | re.MULTILINE,
    ),
    "insurance_company": re.compile(
        r"^INSURANCE COMPANY:[ \t]*(.*?)"
        r"(?=[ \t]*PHONE NUMBER:|$)",
        re.IGNORECASE | re.MULTILINE,
    ),
    "insurance_phone": re.compile(
        r"^INSURANCE COMPANY:[^\r\n]*?"
        r"\bPHONE NUMBER:[ \t]*(.*?)$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "medical_member_id": re.compile(
        r"^MEDICAL ID#:[ \t]*(.*?)"
        r"(?=[ \t]*MEDICAL GROUP#:|$)",
        re.IGNORECASE | re.MULTILINE,
    ),
    "medical_group_number": re.compile(
        r"^MEDICAL ID#:[^\r\n]*?"
        r"\bMEDICAL GROUP#:[ \t]*(.*?)"
        r"(?=[ \t]*BH ID#:|$)",
        re.IGNORECASE | re.MULTILINE,
    ),
    "behavioral_health_member_id": re.compile(
        r"^MEDICAL ID#:[^\r\n]*?"
        r"\bBH ID#:[ \t]*(.*?)"
        r"(?=[ \t]*BH GROUP#:|$)",
        re.IGNORECASE | re.MULTILINE,
    ),
    "behavioral_health_group_number": re.compile(
        r"^MEDICAL ID#:[^\r\n]*?"
        r"\bBH GROUP#:[ \t]*(.*?)$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "authorization_phone": re.compile(
        r"^PHONE NUMBER FOR AUTHORIZATION:[ \t]*(.*?)"
        r"(?=[ \t]*NO AUTH PENALTY:|$)",
        re.IGNORECASE | re.MULTILINE,
    ),
}

class ExtractionSource(StrEnum):
    FORM_FIELD = "form_field"
    EMBEDDED_TEXT = "embedded_text"


@dataclass(frozen=True)
class ExtractedValue:
    value: str
    source: ExtractionSource


@dataclass(frozen=True)
class StandardVobExtraction:
    template_id: str | None
    is_match: bool
    admit_date_range: ExtractedValue | None
    facility: ExtractedValue | None
    patient_name: ExtractedValue | None
    patient_dob: ExtractedValue | None
    insurance_company: ExtractedValue | None
    insurance_phone: ExtractedValue | None
    medical_member_id: ExtractedValue | None
    medical_group_number: ExtractedValue | None
    behavioral_health_member_id: ExtractedValue | None
    behavioral_health_group_number: ExtractedValue | None
    authorization_phone: ExtractedValue | None


def is_standard_vob(
    result: PdfTextExtractionResult,
) -> bool:
    normalized_text = result.combined_text.upper()

    return all(
        label in normalized_text
        for label in STANDARD_VOB_REQUIRED_LABELS
    )


def _normalize_extracted_value(value: str) -> str:
    return " ".join(value.split()).strip()


def _form_values(
    result: PdfTextExtractionResult,
) -> dict[str, str]:
    values_by_field_name = {
        field.name: _normalize_extracted_value(field.value)
        for field in result.form_fields
        if field.value.strip()
    }

    return {
        target_name: values_by_field_name[field_name]
        for target_name, field_name in (
            STANDARD_VOB_FORM_FIELD_NAMES.items()
        )
        if values_by_field_name.get(field_name)
    }


def _embedded_text_values(
    combined_text: str,
) -> dict[str, str]:
    extracted: dict[str, str] = {}

    for field_name, pattern in (
        STANDARD_VOB_TEXT_PATTERNS.items()
    ):
        match = pattern.search(combined_text)

        if match is None:
            continue

        value = _normalize_extracted_value(match.group(1))

        if value:
            extracted[field_name] = value

    return extracted


def _candidate(
    field_name: str,
    *,
    form_values: dict[str, str],
    text_values: dict[str, str],
) -> ExtractedValue | None:
    form_value = form_values.get(field_name)

    if form_value:
        return ExtractedValue(
            value=form_value,
            source=ExtractionSource.FORM_FIELD,
        )

    text_value = text_values.get(field_name)

    if text_value:
        return ExtractedValue(
            value=text_value,
            source=ExtractionSource.EMBEDDED_TEXT,
        )

    return None


def _empty_extraction() -> StandardVobExtraction:
    return StandardVobExtraction(
        template_id=None,
        is_match=False,
        admit_date_range=None,
        facility=None,
        patient_name=None,
        patient_dob=None,
        insurance_company=None,
        insurance_phone=None,
        medical_member_id=None,
        medical_group_number=None,
        behavioral_health_member_id=None,
        behavioral_health_group_number=None,
        authorization_phone=None,
    )


def parse_standard_vob(
    result: PdfTextExtractionResult,
) -> StandardVobExtraction:
    if not is_standard_vob(result):
        return _empty_extraction()

    form_values = _form_values(result)
    text_values = _embedded_text_values(
        result.combined_text
    )

    return StandardVobExtraction(
        template_id=STANDARD_VOB_TEMPLATE_ID,
        is_match=True,
        admit_date_range=_candidate(
            "admit_date_range",
            form_values=form_values,
            text_values=text_values,
        ),
        facility=_candidate(
            "facility",
            form_values=form_values,
            text_values=text_values,
        ),
        patient_name=_candidate(
            "patient_name",
            form_values=form_values,
            text_values=text_values,
        ),
        patient_dob=_candidate(
            "patient_dob",
            form_values=form_values,
            text_values=text_values,
        ),
        insurance_company=_candidate(
            "insurance_company",
            form_values=form_values,
            text_values=text_values,
        ),
        insurance_phone=_candidate(
            "insurance_phone",
            form_values=form_values,
            text_values=text_values,
        ),
        medical_member_id=_candidate(
            "medical_member_id",
            form_values=form_values,
            text_values=text_values,
        ),
        medical_group_number=_candidate(
            "medical_group_number",
            form_values=form_values,
            text_values=text_values,
        ),
        behavioral_health_member_id=_candidate(
            "behavioral_health_member_id",
            form_values=form_values,
            text_values=text_values,
        ),
        behavioral_health_group_number=_candidate(
            "behavioral_health_group_number",
            form_values=form_values,
            text_values=text_values,
        ),
        authorization_phone=_candidate(
            "authorization_phone",
            form_values=form_values,
            text_values=text_values,
        ),
    )