"""
Chat Completion Endpoint
Handles chat completion requests for multiple AI providers.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.schemas import ChatRequest, ChatResponse, ErrorResponse
from app.services import ChatService

router = APIRouter(tags=["Chat"])
logger = logging.getLogger(__name__)


@router.post(
    "/chat/completions",
    response_model=ChatResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        401: {"model": ErrorResponse, "description": "Invalid API Key"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
)
async def chat_completion(request: ChatRequest) -> ChatResponse:
    """
    Send a chat completion request to the specified AI provider.

    This endpoint provides a unified interface for chat completions
    across multiple providers (OpenAI, Gemini, DeepSeek).

    **Request Body:**
    - `provider`: The AI provider to use (openai, gemini, deepseek)
    - `model`: Model identifier (e.g., gpt-4o-mini, gemini-pro, deepseek-chat)
    - `messages`: List of conversation messages
    - `temperature`: Sampling temperature (0-2, default: 0.7)
    - `max_tokens`: Maximum tokens to generate (default: 4096)
    - `credentials`: API credentials for the provider

    **Returns:**
    - `id`: Unique response identifier
    - `content`: Generated text
    - `model`: Model used
    - `provider`: Provider used
    - `usage`: Token usage information
    - `latency_ms`: Response latency in milliseconds
    """
    try:
        service = ChatService()
        response = await service.complete(request)
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
        logger.error(f"Chat completion error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": "An error occurred while processing the request",
                "detail": str(e),
            },
        )
