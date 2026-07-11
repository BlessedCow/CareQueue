from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from authstatus_api.repository import (
    create_auth,
    create_auth_event,
    delete_auth,
    delete_auth_event,
    get_auth,
    list_auth_events,
    list_auths,
    update_auth,
    update_auth_event,
)
from authstatus_api.schemas import (
    AuthCreate,
    AuthEventCreate,
    AuthEventListResponse,
    AuthEventRecord,
    AuthEventUpdate,
    AuthListResponse,
    AuthRecord,
    AuthUpdate,
    DeleteResponse,
)
from authstatus_api.security.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/auths", tags=["auths"])
ReadAuthUser = Depends(get_current_user)
WriteAuthUser = Depends(require_role("Admin", "UR"))

@router.get("", response_model=AuthListResponse)
def read_auths(current_user: dict = ReadAuthUser) -> AuthListResponse:
    return AuthListResponse(auths=list_auths())


@router.post("", response_model=AuthRecord, status_code=status.HTTP_201_CREATED)
def create_auth_record(
    payload: AuthCreate,
    current_user: dict = WriteAuthUser,
) -> AuthRecord:
    return AuthRecord(**create_auth(payload.model_dump()))


@router.get("/{auth_id}", response_model=AuthRecord)
def read_auth(auth_id: int, current_user: dict = ReadAuthUser) -> AuthRecord:
    record = get_auth(auth_id)

    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth record not found.")

    return AuthRecord(**record)


@router.patch("/{auth_id}", response_model=AuthRecord)
def update_auth_record(
    auth_id: int,
    payload: AuthUpdate,
    current_user: dict = WriteAuthUser,
) -> AuthRecord:
    record = update_auth(auth_id, payload.model_dump(exclude_unset=True))

    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth record not found.")

    return AuthRecord(**record)


@router.get("/{auth_id}/events", response_model=AuthEventListResponse)
def read_auth_events(
    auth_id: int,
    current_user: dict = ReadAuthUser,
) -> AuthEventListResponse:
    events = list_auth_events(auth_id)

    if events is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth record not found.")

    return AuthEventListResponse(events=[AuthEventRecord(**event) for event in events])


@router.post("/{auth_id}/events", response_model=AuthEventRecord, status_code=status.HTTP_201_CREATED)
def create_auth_event_record(
    auth_id: int,
    payload: AuthEventCreate,
    current_user: dict = WriteAuthUser,
) -> AuthEventRecord:
    event = create_auth_event(auth_id, payload.model_dump())

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth record not found.")

    return AuthEventRecord(**event)


@router.patch("/{auth_id}/events/{event_id}", response_model=AuthEventRecord)
def update_auth_event_record(
    auth_id: int,
    event_id: int,
    payload: AuthEventUpdate,
    current_user: dict = WriteAuthUser,
) -> AuthEventRecord:
    event = update_auth_event(auth_id, event_id, payload.model_dump(exclude_unset=True))

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth event not found.")

    return AuthEventRecord(**event)


@router.delete("/{auth_id}/events/{event_id}", response_model=DeleteResponse)
def delete_auth_event_record(
    auth_id: int,
    event_id: int,
    current_user: dict = WriteAuthUser,
) -> DeleteResponse:
    deleted = delete_auth_event(auth_id, event_id)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth event not found.")

    return DeleteResponse(deleted=True, id=event_id)


@router.delete("/{auth_id}", response_model=DeleteResponse)
def delete_auth_record(
    auth_id: int,
    current_user: dict = WriteAuthUser,
) -> DeleteResponse:
    deleted = delete_auth(auth_id)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth record not found.")

    return DeleteResponse(deleted=True, id=auth_id)