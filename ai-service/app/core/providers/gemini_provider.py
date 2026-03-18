"""
Gemini Provider
Implementation of the Google Gemini API provider using the new google-genai SDK.
"""

import logging
import time
import uuid
from typing import AsyncIterator, List

from google import genai
from google.genai import types

from app.schemas import ChatResponse, Credentials, Message, StreamChunk, Usage

from .base import BaseProvider

logger = logging.getLogger(__name__)


class GeminiProvider(BaseProvider):
    """Google Gemini API provider implementation."""

    def __init__(self, credentials: Credentials):
        """Initialize Gemini client with credentials."""
        super().__init__(credentials)
        self._client = genai.Client(api_key=self.api_key)

    @property
    def provider_name(self) -> str:
        return "gemini"

    def _convert_messages_to_gemini(self, messages: List[Message]) -> tuple:
        """
        Convert messages to Gemini format.

        Gemini uses a different format:
        - System prompt is set separately via config
        - Messages use 'user' and 'model' roles

        Returns:
            Tuple of (system_instruction, history, last_user_message)
        """
        system_instruction = None
        history = []
        last_user_message = None

        for msg in messages:
            if msg.role == "system":
                system_instruction = msg.content
            elif msg.role == "user":
                last_user_message = msg.content
                if len(history) > 0 or system_instruction:
                    history.append(
                        types.Content(
                            role="user",
                            parts=[types.Part.from_text(text=msg.content)],
                        )
                    )
            elif msg.role == "assistant":
                history.append(
                    types.Content(
                        role="model",
                        parts=[types.Part.from_text(text=msg.content)],
                    )
                )

        if history and history[-1].role == "user":
            history.pop()

        return system_instruction, history, last_user_message

    async def chat(
        self,
        messages: List[Message],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> ChatResponse:
        """
        Send chat completion request to Gemini.

        Args:
            messages: List of conversation messages
            model: Model identifier (e.g., gemini-2.0-flash, gemini-2.5-pro)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            ChatResponse with the generated content
        """
        logger.info(f"Gemini chat request: model={model}, messages={len(messages)}")
        start_time = time.time()

        try:
            system_instruction, history, last_user_message = (
                self._convert_messages_to_gemini(messages)
            )

            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                system_instruction=system_instruction,
            )

            contents = list(history)
            user_text = last_user_message or (
                messages[-1].content if messages else "Hello"
            )
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=user_text)],
                )
            )

            response = await self._client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )

            latency_ms = int((time.time() - start_time) * 1000)

            content = response.text or ""

            usage_metadata = getattr(response, "usage_metadata", None)
            if usage_metadata:
                prompt_tokens = getattr(usage_metadata, "prompt_token_count", 0)
                completion_tokens = getattr(
                    usage_metadata, "candidates_token_count", 0
                )
                total_tokens = getattr(
                    usage_metadata,
                    "total_token_count",
                    prompt_tokens + completion_tokens,
                )
            else:
                prompt_tokens = int(
                    sum(len(m.content.split()) * 1.3 for m in messages)
                )
                completion_tokens = int(len(content.split()) * 1.3)
                total_tokens = prompt_tokens + completion_tokens

            usage = Usage(
                prompt_tokens=int(prompt_tokens),
                completion_tokens=int(completion_tokens),
                total_tokens=int(total_tokens),
            )

            logger.info(
                f"Gemini response: tokens={usage.total_tokens}, latency={latency_ms}ms"
            )

            return ChatResponse(
                id=f"gemini-{uuid.uuid4().hex[:8]}",
                content=content,
                model=model,
                provider=self.provider_name,
                usage=usage,
                latency_ms=latency_ms,
            )

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise

    async def chat_stream(
        self,
        messages: List[Message],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream chat completion from Gemini.

        Args:
            messages: List of conversation messages
            model: Model identifier (e.g., gemini-2.0-flash, gemini-2.5-pro)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Yields:
            StreamChunk objects with content deltas
        """
        logger.info(f"Gemini stream request: model={model}, messages={len(messages)}")
        start_time = time.time()
        response_id = f"gemini-{uuid.uuid4().hex[:8]}"
        full_content = ""

        try:
            system_instruction, history, last_user_message = (
                self._convert_messages_to_gemini(messages)
            )

            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                system_instruction=system_instruction,
            )

            contents = list(history)
            user_text = last_user_message or (
                messages[-1].content if messages else "Hello"
            )
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=user_text)],
                )
            )

            async for chunk in self._client.aio.models.generate_content_stream(
                model=model,
                contents=contents,
                config=config,
            ):
                if chunk.text:
                    full_content += chunk.text
                    yield StreamChunk(
                        type="content",
                        content=chunk.text,
                        model=model,
                        provider=self.provider_name,
                    )

            latency_ms = int((time.time() - start_time) * 1000)

            prompt_tokens = int(
                sum(len(m.content.split()) * 1.3 for m in messages)
            )
            completion_tokens = int(len(full_content.split()) * 1.3)

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

            yield StreamChunk(
                type="done",
                id=response_id,
                model=model,
                provider=self.provider_name,
                latency_ms=latency_ms,
            )

            logger.info(
                f"Gemini stream complete: tokens={prompt_tokens + completion_tokens}, latency={latency_ms}ms"
            )

        except Exception as e:
            logger.error(f"Gemini stream error: {e}")
            yield StreamChunk(
                type="error",
                error=str(e),
                model=model,
                provider=self.provider_name,
            )
