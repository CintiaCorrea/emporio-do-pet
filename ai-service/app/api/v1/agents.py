"""
Agent Execution Endpoint
Handles AI agent execution requests.
"""

import json
import logging
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas import AgentRequest, AgentResponse, ErrorResponse, StreamChunk
from app.services import AgentService

router = APIRouter(tags=["Agents"])
logger = logging.getLogger(__name__)


async def stream_generator(request: AgentRequest) -> AsyncIterator[str]:
    """Generate Server-Sent Events from agent streaming response."""
    service = AgentService()
    try:
        async for chunk in service.execute_stream(request):
            # Format as SSE
            yield f"data: {chunk.model_dump_json()}\n\n"
    except Exception as e:
        error_chunk = StreamChunk(
            type="error",
            error=str(e),
        )
        yield f"data: {error_chunk.model_dump_json()}\n\n"


@router.post(
    "/agents/execute",
    response_model=AgentResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        401: {"model": ErrorResponse, "description": "Invalid API Key"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
)
async def execute_agent(request: AgentRequest) -> AgentResponse:
    """
    Execute an AI agent with the given configuration.

    This endpoint allows executing AI agents with custom system prompts,
    conversation history, and context variables.

    **Request Body:**
    - `provider`: The AI provider to use (openai, gemini, deepseek)
    - `model`: Model identifier
    - `system_prompt`: System prompt defining agent behavior (supports {variable} substitution)
    - `conversation_history`: Previous messages (optional)
    - `user_message`: The user's current message
    - `context`: Context variables for prompt substitution (optional)
    - `temperature`: Sampling temperature (default: 0.7)
    - `max_tokens`: Maximum tokens (default: 4096)
    - `credentials`: API credentials

    **Context Variables:**
    The system_prompt can contain variables like `{clinic_name}`, `{tutor_name}`, `{pet_name}`,
    which will be substituted with values from the context object.

    **Returns:**
    - `response`: The agent's response text
    - `usage`: Token usage information
    - `latency_ms`: Response latency in milliseconds
    - `model`: Model used
    - `provider`: Provider used
    """
    try:
        service = AgentService()
        response = await service.execute(request)
        return response

    except ValueError as e:
        logger.warning(f"Invalid request: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_request",
                "message": str(e),
            },
        )

    except Exception as e:
        error_message = str(e).lower()

        # Check for authentication errors
        if "api key" in error_message or "unauthorized" in error_message or "401" in error_message:
            logger.warning(f"Authentication error: {e}")
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "invalid_api_key",
                    "message": "The provided API key is invalid or expired",
                },
            )

        # Check for rate limiting
        if "rate limit" in error_message or "429" in error_message:
            logger.warning(f"Rate limit error: {e}")
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "rate_limit_exceeded",
                    "message": "API rate limit exceeded. Please try again later.",
                },
            )

        # Generic error
        logger.error(f"Agent execution error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": "An error occurred while executing the agent",
                "detail": str(e),
            },
        )


@router.post(
    "/agents/execute/stream",
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        401: {"model": ErrorResponse, "description": "Invalid API Key"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
)
async def execute_agent_stream(request: AgentRequest) -> StreamingResponse:
    """
    Execute an AI agent with streaming response.

    This endpoint streams the agent's response token by token using Server-Sent Events (SSE).
    Each chunk is formatted as a JSON object with the following types:

    **Stream Events:**
    - `content`: Contains a token/chunk of the response text
    - `usage`: Contains token usage information (sent at the end)
    - `done`: Signals completion with response ID
    - `error`: Contains error information if something goes wrong

    **Example Stream:**
    ```
    data: {"type": "content", "content": "Hello", "model": "gpt-4o", "provider": "openai"}
    data: {"type": "content", "content": " there", "model": "gpt-4o", "provider": "openai"}
    data: {"type": "usage", "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}, ...}
    data: {"type": "done", "id": "openai-abc123", ...}
    ```

    **Request Body:**
    Same as `/agents/execute` endpoint.
    """
    try:
        # Validate provider
        valid_providers = ["openai", "gemini", "deepseek"]
        if request.provider not in valid_providers:
            raise ValueError(f"Invalid provider: {request.provider}")

        return StreamingResponse(
            stream_generator(request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except ValueError as e:
        logger.warning(f"Invalid stream request: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_request",
                "message": str(e),
            },
        )

    except Exception as e:
        logger.error(f"Stream setup error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": "Failed to initialize streaming",
                "detail": str(e),
            },
        )
