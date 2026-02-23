"""
Common Schemas
Shared Pydantic models used across the application.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    """Chat message with role and content."""

    role: Literal["system", "user", "assistant"] = Field(
        ..., description="The role of the message author"
    )
    content: str = Field(..., description="The content of the message")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"role": "user", "content": "Olá, como posso agendar uma consulta?"}
            ]
        }
    }


class Usage(BaseModel):
    """Token usage information from the AI provider."""

    prompt_tokens: int = Field(..., description="Number of tokens in the prompt")
    completion_tokens: int = Field(
        ..., description="Number of tokens in the completion"
    )
    total_tokens: int = Field(..., description="Total tokens used")


class Credentials(BaseModel):
    """API credentials for the AI provider."""

    api_key: str = Field(..., description="API key for the provider")
    base_url: Optional[str] = Field(
        None, description="Custom base URL for the API (optional)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [{"api_key": "sk-...", "base_url": None}]
        }
    }


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    detail: Optional[str] = Field(None, description="Additional error details")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "error": "invalid_api_key",
                    "message": "The provided API key is invalid",
                    "detail": None,
                }
            ]
        }
    }
