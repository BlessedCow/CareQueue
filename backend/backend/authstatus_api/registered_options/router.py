from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from authstatus_api.audit.service import record_audit_event
from authstatus_api.registered_options.repository import (
    ProtectedRegisteredOptionError,
    RegisteredOptionAlreadyExistsError,
    create_registered_option,
    delete_registered_option,
    get_registered_option,
    list_registered_options,
)
from authstatus_api.registered_options.schemas import (
    RegisteredOptionCategory,
    RegisteredOptionCreateRequest,
    RegisteredOptionDeleteResponse,
    RegisteredOptionListResponse,
    RegisteredOptionResponse,
)
from authstatus_api.security.dependencies import get_current_user, require_role

router = APIRouter(
    prefix="/api/registered-options",
    tags=["registered-options"],
)

AuthenticatedUser = Depends(get_current_user)
AdminUser = Depends(require_role("Admin"))
RegisteredOptionCategoryQuery = Query(default=None)

def _option_response(option: dict) -> RegisteredOptionResponse:
    return RegisteredOptionResponse(
        id=option["id"],
        category=option["category"],
        name=option["name"],
        is_protected=option["is_protected"],
        created_at=option["created_at"],
        updated_at=option["updated_at"],
    )


@router.get("", response_model=RegisteredOptionListResponse)
def read_registered_options(
    category: RegisteredOptionCategory | None = RegisteredOptionCategoryQuery,
    current_user: dict = AuthenticatedUser,
) -> RegisteredOptionListResponse:
    options = list_registered_options(category=category)

    return RegisteredOptionListResponse(
        options=[
            _option_response(option)
            for option in options
        ],
    )


@router.post(
    "",
    response_model=RegisteredOptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_registered_option_record(
    payload: RegisteredOptionCreateRequest,
    request: Request,
    current_user: dict = AdminUser,
) -> RegisteredOptionResponse:
    try:
        option = create_registered_option(
            category=payload.category,
            name=payload.name,
        )
    except RegisteredOptionAlreadyExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    record_audit_event(
        action="registered_option.create",
        resource_type="registered_option",
        resource_id=option["id"],
        user=current_user,
        metadata={
            "category": option["category"],
        },
        request=request,
    )

    return _option_response(option)


@router.delete(
    "/{option_id}",
    response_model=RegisteredOptionDeleteResponse,
)
def delete_registered_option_record(
    option_id: int,
    request: Request,
    current_user: dict = AdminUser,
) -> RegisteredOptionDeleteResponse:
    option = get_registered_option(option_id)

    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registered option not found.",
        )

    try:
        deleted = delete_registered_option(option_id)
    except ProtectedRegisteredOptionError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registered option not found.",
        )

    record_audit_event(
        action="registered_option.delete",
        resource_type="registered_option",
        resource_id=option_id,
        user=current_user,
        metadata={
            "category": option["category"],
        },
        request=request,
    )

    return RegisteredOptionDeleteResponse(deleted=True)