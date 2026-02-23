"""
Chat Schemas
Pydantic models for chat completion requests and responses.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from .common import Credentials, Message, Usage


class StreamChunk(BaseModel):
    """A single chunk in a streaming response."""

    type: Literal["content", "usage", "done", "error"] = Field(
        ..., description="Type of the chunk"
    )
    content: Optional[str] = Field(None, description="Content delta for 'content' type")
    usage: Optional[Usage] = Field(None, description="Token usage for 'usage' type")
    id: Optional[str] = Field(None, description="Response ID for 'done' type")
    error: Optional[str] = Field(None, description="Error message for 'error' type")
    model: Optional[str] = Field(None, description="Model used")
    provider: Optional[str] = Field(None, description="Provider name")
    latency_ms: Optional[int] = Field(None, description="Total latency in ms")


class ChatRequest(BaseModel):
    """Request body for chat completion."""

    provider: Literal["openai", "gemini", "deepseek"] = Field(
        ..., description="AI provider to use"
    )
    model: str = Field(..., description="Model identifier (e.g., gpt-4o, gemini-pro)")
    messages: List[Message] = Field(
        ..., description="List of messages in the conversation"
    )
    temperature: float = Field(
        0.7, ge=0.0, le=2.0, description="Sampling temperature (0-2)"
    )
    max_tokens: int = Field(
        4096, ge=1, le=128000, description="Maximum tokens to generate"
    )
    credentials: Credentials = Field(..., description="API credentials for the provider")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "provider": "openai",
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "Você é um assistente veterinário."},
                        {"role": "user", "content": "Meu cachorro está com febre."},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 4096,
                    "credentials": {"api_key": "sk-..."},
                }
            ]
        }
    }


class ChatResponse(BaseModel):
    """Response from chat completion."""

    id: str = Field(..., description="Unique response identifier")
    content: str = Field(..., description="Generated text content")
    model: str = Field(..., description="Model used for generation")
    provider: str = Field(..., description="Provider that generated the response")
    usage: Usage = Field(..., description="Token usage information")
    latency_ms: int = Field(..., description="Response latency in milliseconds")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "chatcmpl-abc123",
                    "content": "Sinto muito que seu cachorro esteja doente. A febre em cães pode ter várias causas...",
                    "model": "gpt-4o-mini",
                    "provider": "openai",
                    "usage": {
                        "prompt_tokens": 50,
                        "completion_tokens": 150,
                        "total_tokens": 200,
                    },
                    "latency_ms": 1234,
                }
            ]
        }
    }
