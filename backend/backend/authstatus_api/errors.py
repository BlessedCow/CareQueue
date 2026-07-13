from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("authstatus_api.errors")

SAFE_VALIDATION_ERROR_MESSAGE = "Invalid request."
SAFE_INTERNAL_ERROR_MESSAGE = "An unexpected error occurred."


async def request_validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    logger.warning(
        "Request validation failed.",
        extra={
            "method": request.method,
            "path": request.url.path,
        },
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": SAFE_VALIDATION_ERROR_MESSAGE},
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    logger.error(
        "Unhandled API exception.",
        extra={
            "method": request.method,
            "path": request.url.path,
            "exception_type": type(exc).__name__,
        },
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": SAFE_INTERNAL_ERROR_MESSAGE},
    )


def register_exception_handlers(api: FastAPI) -> None:
    api.add_exception_handler(
        RequestValidationError,
        request_validation_exception_handler,
    )
    api.add_exception_handler(Exception, unhandled_exception_handler)