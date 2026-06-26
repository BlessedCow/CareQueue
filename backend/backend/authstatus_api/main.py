from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from authstatus_api.crypto import generate_encryption_key
from authstatus_api.database import init_db
from authstatus_api.routers.analytics import router as analytics_router
from authstatus_api.routers.auths import router as auths_router
from authstatus_api.settings import get_settings


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    api = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    api.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @api.get("/api/health")
    def health_check() -> dict[str, str]:
        return {
            "status": "ok",
            "app": settings.app_name,
            "version": settings.app_version,
        }

    @api.get("/api/dev/encryption-key")
    def create_dev_encryption_key() -> dict[str, str]:
        return {
            "AUTHSTATUS_ENCRYPTION_KEY": generate_encryption_key(),
        }

    api.include_router(auths_router)
    api.include_router(analytics_router)

    return api


app = create_app()