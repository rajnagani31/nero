from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator
from pydantic_core import Url

ChatMode = Literal["general", "code", "debug", "review"]
UserType = Literal["guest", "registered"]
ChoiceMode = Literal["auto", "manual"]
SelectorMode = Literal["auto", "manual"]
WebMode = Literal["off", "auto", "on"]
PromptName = Literal["general", "code", "debug", "review", "web_research"]
ModelName = Literal["gpt-4o-mini", "gpt-4o", "gpt-5", "gpt-5.4-mini"]


class ChoiceConfig(BaseModel):
    mode: ChoiceMode = "auto"
    model_mode: SelectorMode = "auto"
    model_name: ModelName | None = None
    prompt_mode: SelectorMode = "auto"
    prompt_name: PromptName | None = None
    web_mode: WebMode = "on"


class ResolvedChoiceConfig(BaseModel):
    mode: ChoiceMode
    model_mode: SelectorMode
    model_name: ModelName
    prompt_mode: SelectorMode
    prompt_name: PromptName
    web_mode: WebMode
    web_enabled: bool
    web_preferred: bool
    current_info_requested: bool = False
    choice_config: ChoiceConfig


class SourceSummary(BaseModel):
    title: str
    url: str
    domain: str
    snippet: str = ""
    summary: str = ""
    content_preview: str = ""
    rank: int = 0


class MessageProcessMetadata(BaseModel):
    choice_config: ChoiceConfig | None = None
    resolved_choice_config: ResolvedChoiceConfig | None = None
    execution_mode: str | None = None
    tools_used: list[str] = Field(default_factory=list)
    web_search_used: bool = False
    current_info_requested: bool = False
    model_name: str | None = None
    prompt_name: str | None = None

class MessageMetadata(BaseModel):
    process: MessageProcessMetadata | None = None
    sources: list[SourceSummary] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    web_search_run_id: int | None = None


class AuthenticatedUserResponse(BaseModel):
    id: int
    public_id: str
    session_label: str
    email: str | None = None
    display_name: str | None = None
    user_type: UserType
    auth_provider: str
    email_verified: bool
    session_id: int
    session_expires_at: datetime
    guest_message_limit: int | None = None
    guest_messages_used: int = 0
    remaining_guest_messages: int | None = None


class UserSessionResponse(BaseModel):
    token: str
    access_token: str
    session_label: str
    user_id: int
    session_id: int
    expires_at: int
    refresh_expires_at: int
    user: AuthenticatedUserResponse


class GuestSessionRequest(BaseModel):
    client_session_id: str | None = None


class SignupRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None
    client_session_id: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str
    client_session_id: str | None = None


class LogoutResponse(BaseModel):
    success: bool = True


class GoogleLoginUrlResponse(BaseModel):
    enabled: bool
    login_url: str | None = None
    detail: str | None = None


class CreateThreadRequest(BaseModel):
    title: str
    mode: ChatMode = "general"
    client_session_id: str | None = None
    # url : str

    @field_validator("mode", mode="before")
    @classmethod
    def _normalize_legacy_mode(cls, v: str) -> str:
        return "general" if v == "chat" else v


class ThreadSummaryResponse(BaseModel):
    id: int
    title: str
    mode: ChatMode
    updated_at: datetime
    last_message_at: datetime | None = None
    preview: str = ""
    message_count: int = 0

    @field_validator("mode", mode="before")
    @classmethod
    def _normalize_legacy_mode(cls, v: str) -> str:
        return "general" if v == "chat" else v


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    status: str
    created_at: datetime
    completed_at: datetime | None = None
    metadata_json: dict[str, Any] | None = None


class ChatStreamRequest(BaseModel):
    thread_id: int
    query: str
    code: str | None = None
    mode: ChatMode = "general"

    @field_validator("mode", mode="before")
    @classmethod
    def _normalize_legacy_mode(cls, v: str) -> str:
        return "general" if v == "chat" else v
    choice_config: ChoiceConfig | None = None
