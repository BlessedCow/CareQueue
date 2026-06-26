from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from authstatus_api.repository import create_auth, delete_auth, get_auth, list_auths, update_auth
from authstatus_api.schemas import (
    AuthCreate,
    AuthListResponse,
    AuthRecord,
    AuthUpdate,
    DeleteResponse,
)

router = APIRouter(prefix="/api/auths", tags=["auths"])


@router.get("", response_model=AuthListResponse)
def read_auths() -> AuthListResponse:
    return AuthListResponse(auths=list_auths())


@router.post("", response_model=AuthRecord, status_code=status.HTTP_201_CREATED)
def create_auth_record(payload: AuthCreate) -> AuthRecord:
    return AuthRecord(**create_auth(payload.model_dump()))


@router.get("/{auth_id}", response_model=AuthRecord)
def read_auth(auth_id: int) -> AuthRecord:
    record = get_auth(auth_id)

    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth record not found.")

    return AuthRecord(**record)


@router.patch("/{auth_id}", response_model=AuthRecord)
def update_auth_record(auth_id: int, payload: AuthUpdate) -> AuthRecord:
    record = update_auth(auth_id, payload.model_dump(exclude_unset=True))

    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth record not found.")

    return AuthRecord(**record)


@router.delete("/{auth_id}", response_model=DeleteResponse)
def delete_auth_record(auth_id: int) -> DeleteResponse:
    deleted = delete_auth(auth_id)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth record not found.")

    return DeleteResponse(deleted=True, id=auth_id)