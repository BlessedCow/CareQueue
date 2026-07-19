from __future__ import annotations

from fastapi import Request

from authstatus_api.pdf_intake.extractor import (
    DEFAULT_MAX_PDF_SIZE_BYTES,
)


class PdfRequestBodyError(ValueError):
    pass


class PdfRequestBodyTooLargeError(PdfRequestBodyError):
    pass


async def read_pdf_request_body(
    request: Request,
    *,
    max_size_bytes: int = DEFAULT_MAX_PDF_SIZE_BYTES,
) -> bytes:
    if max_size_bytes <= 0:
        raise ValueError(
            "max_size_bytes must be greater than zero."
        )

    content_length = request.headers.get("content-length")

    if content_length is not None:
        try:
            declared_size = int(content_length)
        except ValueError:
            declared_size = None

        if (
            declared_size is not None
            and declared_size > max_size_bytes
        ):
            raise PdfRequestBodyTooLargeError(
                "The uploaded PDF exceeds the allowed file size."
            )

    body = bytearray()

    try:
        async for chunk in request.stream():
            if not chunk:
                continue

            if len(body) + len(chunk) > max_size_bytes:
                body.clear()
                raise PdfRequestBodyTooLargeError(
                    "The uploaded PDF exceeds the allowed file size."
                )

            body.extend(chunk)

        return bytes(body)
    finally:
        body.clear()