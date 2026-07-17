from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from authstatus_api.pdf_intake.extractor import (  # noqa: E402
    PdfExtractionError,
    extract_pdf_text,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Inspect embedded text and fillable form fields from a local PDF."
        ),
    )
    parser.add_argument(
        "pdf_path",
        type=Path,
        help="Path to the PDF to inspect.",
    )
    parser.add_argument(
        "--show-text",
        action="store_true",
        help="Print extracted embedded page text.",
    )

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    pdf_path = args.pdf_path.expanduser().resolve()

    if not pdf_path.is_file():
        print("PDF file not found.", file=sys.stderr)
        return 1

    try:
        result = extract_pdf_text(pdf_path.read_bytes())
    except OSError:
        print("Unable to read the PDF file.", file=sys.stderr)
        return 1
    except PdfExtractionError as error:
        print(str(error), file=sys.stderr)
        return 1

    summary = {
        "page_count": result.page_count,
        "has_usable_text": result.has_usable_text,
        "form_field_count": len(result.form_fields),
    }

    print(json.dumps(summary, indent=2))

    if args.show_text:
        print("\nEmbedded text")
        print("-------------")

        for page_number, page_text in enumerate(
            result.page_texts,
            start=1,
        ):
            print(f"\nPage {page_number}")
            print(page_text or "[No embedded text extracted]")

    print("\nForm fields")
    print("-----------")

    if not result.form_fields:
        print("[No fillable form fields found]")
        return 0

    for field in result.form_fields:
        field_data = {
            "name": field.name,
            "value": field.value,
            "field_type": field.field_type,
            "page_number": field.page_number,
            "rectangle": field.rectangle,
        }

        print(json.dumps(field_data, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())