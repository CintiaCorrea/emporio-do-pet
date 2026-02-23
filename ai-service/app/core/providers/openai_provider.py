"""
OpenAI Provider
Implementation of the OpenAI API provider.
"""

import logging
import time
import uuid
from typing import AsyncIterator, List

from openai import AsyncOpenAI

from app.schemas import ChatResponse, Credentials, Message, StreamChunk, Usage

from .base import BaseProvider

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseProvider):
    """OpenAI API provider implementation."""

    def __init__(self, credentials: Credentials):
        """Initialize OpenAI client with credentials."""
        super().__init__(credentials)
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,  # None uses default OpenAI URL
        )

    @property
    def provider_name(self) -> str:
        return "openai"

    async def chat(
        self,
        messages: List[Message],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> ChatResponse:
        """
        Send chat completion request to OpenAI.

        Args:
            messages: List of conversation messages
            model: Model identifier (e.g., gpt-4o, gpt-4o-mini)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            ChatResponse with the generated content
        """
        logger.info(f"OpenAI chat request: model={model}, messages={len(messages)}")
        start_time = time.time()

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=self._convert_messages(messages),
                temperature=temperature,
                max_tokens=max_tokens,
            )

            latency_ms = int((time.time() - start_time) * 1000)

            # Extract response data
            choice = response.choices[0]
            content = choice.message.content or ""

            usage = Usage(
                prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
                completion_tokens=response.usage.completion_tokens if response.usage else 0,
                total_tokens=response.usage.total_tokens if response.usage else 0,
            )

            logger.info(
                f"OpenAI response: tokens={usage.total_tokens}, latency={latency_ms}ms"
            )

            return ChatResponse(
                id=response.id or f"openai-{uuid.uuid4().hex[:8]}",
                content=content,
                model=response.model or model,
                provider=self.provider_name,
                usage=usage,
                latency_ms=latency_ms,
            )

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    async def chat_stream(
        self,
        messages: List[Message],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream chat completion from OpenAI.

        Args:
            messages: List of conversation messages
            model: Model identifier (e.g., gpt-4o, gpt-4o-mini)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Yields:
            StreamChunk objects with content deltas
        """
        logger.info(f"OpenAI stream request: model={model}, messages={len(messages)}")
        start_time = time.time()
        response_id = f"openai-{uuid.uuid4().hex[:8]}"
        full_content = ""
        prompt_tokens = 0
        completion_tokens = 0

        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=self._convert_messages(messages),
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                stream_options={"include_usage": True},
            )

            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        full_content += delta.content
                        yield StreamChunk(
                            type="content",
                            content=delta.content,
                            model=model,
                            provider=self.provider_name,
                        )

                # OpenAI sends usage in the final chunk when stream_options.include_usage is True
                if chunk.usage:
                    prompt_tokens = chunk.usage.prompt_tokens
                    completion_tokens = chunk.usage.completion_tokens

            latency_ms = int((time.time() - start_time) * 1000)

            # Estimate tokens if not provided
            if prompt_tokens == 0:
                prompt_tokens = int(sum(len(m.content.split()) * 1.3 for m in messages))
            if completion_tokens == 0:
                completion_tokens = int(len(full_content.split()) * 1.3)

            # Send usage info
            yield StreamChunk(
                type="usage",
                usage=Usage(
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=prompt_tokens + completion_tokens,
                ),
                model=model,
                provider=self.provider_name,
                latency_ms=latency_ms,
            )

            # Send done signal
            yield StreamChunk(
                type="done",
                id=response_id,
                model=model,
                provider=self.provider_name,
                latency_ms=latency_ms,
            )

            logger.info(
                f"OpenAI stream complete: tokens={prompt_tokens + completion_tokens}, latency={latency_ms}ms"
            )

        except Exception as e:
            logger.error(f"OpenAI stream error: {e}")
            yield StreamChunk(
                type="error",
                error=str(e),
                model=model,
                provider=self.provider_name,
            )
