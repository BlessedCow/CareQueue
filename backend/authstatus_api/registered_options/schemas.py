from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

RegisteredOptionCategory = Literal[
    "facility",
    "insurance",
    "web_portal",
]


class RegisteredOptionCreateRequest(BaseModel):
    category: RegisteredOptionCategory
    name: str

    model_config = ConfigDict(extra="forbid")


class RegisteredOptionResponse(BaseModel):
    id: int
    category: RegisteredOptionCategory
    name: str
    is_protected: bool
    created_at: str
    updated_at: str


class RegisteredOptionListResponse(BaseModel):
    options: list[RegisteredOptionResponse]


class RegisteredOptionDeleteResponse(BaseModel):
    deleted: bool