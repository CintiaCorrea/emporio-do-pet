"""
Chat Service
Business logic for chat completion operations.
"""

import logging

from app.core.providers import get_provider
from app.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)


class ChatService:
    """Service for handling chat completion requests."""

    async def complete(self, request: ChatRequest) -> ChatResponse:
        """
        Process a chat completion request.

        Args:
            request: ChatRequest containing provider, model, messages, and credentials

        Returns:
            ChatResponse with the generated content and metadata

        Raises:
            ValueError: If the provider is not supported
            Exception: If the API call fails
        """
        logger.info(
            f"Processing chat completion: provider={request.provider}, "
            f"model={request.model}, messages={len(request.messages)}"
        )

        # Get the appropriate provider
        provider = get_provider(request.provider, request.credentials)

        # Execute the chat completion
        response = await provider.chat(
            messages=request.messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        logger.info(
            f"Chat completion successful: tokens={response.usage.total_tokens}, "
            f"latency={response.latency_ms}ms"
        )

        return response
