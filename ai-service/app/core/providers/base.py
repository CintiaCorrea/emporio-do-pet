"""
Base Provider
Abstract base class for all AI providers.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, List

from app.schemas import ChatResponse, Credentials, Message, StreamChunk


class BaseProvider(ABC):
    """Abstract base class for AI providers."""

    def __init__(self, credentials: Credentials):
        """
        Initialize the provider with credentials.

        Args:
            credentials: API credentials including api_key and optional base_url
        """
        self.credentials = credentials
        self.api_key = credentials.api_key
        self.base_url = credentials.base_url

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of the provider."""
        pass

    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> ChatResponse:
        """
        Send a chat completion request to the provider.

        Args:
            messages: List of conversation messages
            model: Model identifier to use
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate

        Returns:
            ChatResponse with the generated content and metadata
        """
        pass

    @abstractmethod
    async def chat_stream(
        self,
        messages: List[Message],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream a chat completion request from the provider.

        Args:
            messages: List of conversation messages
            model: Model identifier to use
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate

        Yields:
            StreamChunk objects with content deltas or final usage info
        """
        pass

    def _convert_messages(self, messages: List[Message]) -> List[dict]:
        """
        Convert Message objects to dictionaries for API calls.

        Args:
            messages: List of Message objects

        Returns:
            List of message dictionaries
        """
        return [{"role": msg.role, "content": msg.content} for msg in messages]
