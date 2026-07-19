from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

import pytest

from authstatus_api.pdf_intake.request_body import (
    PdfRequestBodyTooLargeError,
    read_pdf_request_body,
)


class FakeRequest:
    def __init__(
        self,
        chunks: list[bytes],
        *,
        headers: dict[str, str] | None = None,
    ) -> None:
        self._chunks = chunks
        self.headers = headers or {}
        self.chunks_consumed = 0

    async def stream(self) -> AsyncIterator[bytes]:
        for chunk in self._chunks:
            self.chunks_consumed += 1
            yield chunk


def read_body(
    request: FakeRequest,
    *,
    max_size_bytes: int,
) -> bytes:
    return asyncio.run(
        read_pdf_request_body(
            request,  # type: ignore[arg-type]
            max_size_bytes=max_size_bytes,
        )
    )


def test_reads_pdf_body_from_multiple_chunks():
    request = FakeRequest(
        [
            b"%PDF-",
            b"1.7 ",
            b"test content",
        ]
    )

    result = read_body(
        request,
        max_size_bytes=100,
    )

    assert result == b"%PDF-1.7 test content"
    assert request.chunks_consumed == 3


def test_ignores_empty_stream_chunks():
    request = FakeRequest(
        [
            b"",
            b"%PDF-1.7",
            b"",
        ]
    )

    result = read_body(
        request,
        max_size_bytes=100,
    )

    assert result == b"%PDF-1.7"


def test_allows_body_exactly_at_size_limit():
    request = FakeRequest(
        [
            b"%PDF-",
            b"12345",
        ]
    )

    result = read_body(
        request,
        max_size_bytes=10,
    )

    assert result == b"%PDF-12345"


def test_rejects_body_that_exceeds_streaming_limit():
    request = FakeRequest(
        [
            b"%PDF-",
            b"12345",
            b"extra",
        ]
    )

    with pytest.raises(
        PdfRequestBodyTooLargeError,
        match="exceeds",
    ):
        read_body(
            request,
            max_size_bytes=10,
        )

    assert request.chunks_consumed == 3


def test_stops_consuming_after_limit_is_exceeded():
    request = FakeRequest(
        [
            b"%PDF-",
            b"123456",
            b"must not be consumed",
        ]
    )

    with pytest.raises(PdfRequestBodyTooLargeError):
        read_body(
            request,
            max_size_bytes=10,
        )

    assert request.chunks_consumed == 2


def test_rejects_oversized_declared_content_length_before_streaming():
    request = FakeRequest(
        [b"%PDF-small"],
        headers={
            "content-length": "500",
        },
    )

    with pytest.raises(
        PdfRequestBodyTooLargeError,
        match="exceeds",
    ):
        read_body(
            request,
            max_size_bytes=100,
        )

    assert request.chunks_consumed == 0


def test_streaming_limit_applies_when_content_length_is_missing():
    request = FakeRequest(
        [
            b"%PDF-",
            b"oversized",
        ]
    )

    with pytest.raises(PdfRequestBodyTooLargeError):
        read_body(
            request,
            max_size_bytes=8,
        )


def test_streaming_limit_applies_when_content_length_is_invalid():
    request = FakeRequest(
        [
            b"%PDF-",
            b"oversized",
        ],
        headers={
            "content-length": "not-a-number",
        },
    )

    with pytest.raises(PdfRequestBodyTooLargeError):
        read_body(
            request,
            max_size_bytes=8,
        )


def test_rejects_nonpositive_size_limit():
    request = FakeRequest([b"%PDF-1.7"])

    with pytest.raises(
        ValueError,
        match="greater than zero",
    ):
        read_body(
            request,
            max_size_bytes=0,
        )

    assert request.chunks_consumed == 0


def test_returns_empty_bytes_for_empty_request_body():
    request = FakeRequest([])

    result = read_body(
        request,
        max_size_bytes=100,
    )

    assert result == b""