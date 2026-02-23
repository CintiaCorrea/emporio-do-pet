"""
Gemini Provider
Implementation of the Google Gemini API provider.
"""

import logging
import time
import uuid
from typing import AsyncIterator, List

import google.generativeai as genai

from app.schemas import ChatResponse, Credentials, Message, StreamChunk, Usage

from .base import BaseProvider

logger = logging.getLogger(__name__)


class GeminiProvider(BaseProvider):
    """Google Gemini API provider implementation."""

    def __init__(self, credentials: Credentials):
        """Initialize Gemini client with credentials."""
        super().__init__(credentials)
        # Configure per-request to avoid global state race conditions
        # between concurrent users with different API keys.
        self._api_key = self.api_key

    @property
    def provider_name(self) -> str:
        return "gemini"

    def _convert_messages_to_gemini(self, messages: List[Message]) -> tuple:
        """
        Convert messages to Gemini format.

        Gemini uses a different format:
        - System prompt is set separately
        - Messages are in a history format with 'user' and 'model' roles

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
                    history.append({"role": "user", "parts": [msg.content]})
            elif msg.role == "assistant":
                history.append({"role": "model", "parts": [msg.content]})

        # Remove the last user message from history since we'll send it separately
        if history and history[-1]["role"] == "user":
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
            model: Model identifier (e.g., gemini-pro, gemini-1.5-pro)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            ChatResponse with the generated content
        """
        logger.info(f"Gemini chat request: model={model}, messages={len(messages)}")
        start_time = time.time()

        try:
            # Configure API key per-request to handle concurrent users safely
            genai.configure(api_key=self._api_key)

            system_instruction, history, last_user_message = (
                self._convert_messages_to_gemini(messages)
            )

            # Create model with configuration
            generation_config = genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )

            gemini_model = genai.GenerativeModel(
                model_name=model,
                generation_config=generation_config,
                system_instruction=system_instruction,
            )

            # Start or continue chat
            chat = gemini_model.start_chat(history=history if history else [])

            # Send message
            if last_user_message:
                response = await chat.send_message_async(last_user_message)
            else:
                # If no user message, use the last message content
                response = await chat.send_message_async(
                    messages[-1].content if messages else "Hello"
                )

            latency_ms = int((time.time() - start_time) * 1000)

            # Extract content
            content = response.text if response.text else ""

            # Try to get real token counts from Gemini's usage_metadata
            usage_metadata = getattr(response, 'usage_metadata', None)
            if usage_metadata:
                prompt_tokens = getattr(usage_metadata, 'prompt_token_count', 0)
                completion_tokens = getattr(usage_metadata, 'candidates_token_count', 0)
                total_tokens = getattr(usage_metadata, 'total_token_count', prompt_tokens + completion_tokens)
            else:
                # Fallback: estimate based on word count
                prompt_tokens = int(sum(len(m.content.split()) * 1.3 for m in messages))
                completion_tokens = int(len(content.split()) * 1.3)
                total_tokens = prompt_tokens + completion_tokens

            usage = Usage(
                prompt_tokens=int(prompt_tokens),
                completion_tokens=int(completion_tokens),
                total_tokens=int(total_tokens),
            )

            logger.info(
                f"Gemini response: estimated_tokens={usage.total_tokens}, latency={latency_ms}ms"
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
            model: Model identifier (e.g., gemini-pro, gemini-1.5-pro)
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
            # Configure API key per-request
            genai.configure(api_key=self._api_key)

            system_instruction, history, last_user_message = (
                self._convert_messages_to_gemini(messages)
            )

            # Create model with configuration
            generation_config = genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )

            gemini_model = genai.GenerativeModel(
                model_name=model,
                generation_config=generation_config,
                system_instruction=system_instruction,
            )

            # Start or continue chat
            chat = gemini_model.start_chat(history=history if history else [])

            # Send message with streaming
            message_to_send = last_user_message or (
                messages[-1].content if messages else "Hello"
            )

            # Use sync streaming and wrap it
            response = chat.send_message(message_to_send, stream=True)

            for chunk in response:
                if chunk.text:
                    full_content += chunk.text
                    yield StreamChunk(
                        type="content",
                        content=chunk.text,
                        model=model,
                        provider=self.provider_name,
                    )

            latency_ms = int((time.time() - start_time) * 1000)

            # Estimate tokens
            prompt_tokens = int(sum(len(m.content.split()) * 1.3 for m in messages))
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
                f"Gemini stream complete: estimated_tokens={prompt_tokens + completion_tokens}, latency={latency_ms}ms"
            )

        except Exception as e:
            logger.error(f"Gemini stream error: {e}")
            yield StreamChunk(
                type="error",
                error=str(e),
                model=model,
                provider=self.provider_name,
            )
