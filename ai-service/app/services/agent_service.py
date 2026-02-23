"""
Agent Service
Business logic for AI agent execution.
"""

import logging
import re
from typing import AsyncIterator, List

from app.core.providers import get_provider
from app.schemas import AgentContext, AgentRequest, AgentResponse, Message, StreamChunk

logger = logging.getLogger(__name__)


class AgentService:
    """Service for handling AI agent execution requests."""

    def _substitute_context(self, text: str, context: AgentContext | None) -> str:
        """
        Substitute context variables in the text.

        Variables are in the format {variable_name}.

        Args:
            text: Text containing variables to substitute
            context: Context with values for substitution

        Returns:
            Text with variables substituted
        """
        if not context:
            return text

        # Build substitution dictionary
        substitutions = {}

        if context.clinic_name:
            substitutions["clinic_name"] = context.clinic_name
        if context.tutor_name:
            substitutions["tutor_name"] = context.tutor_name
        if context.pet_name:
            substitutions["pet_name"] = context.pet_name
        if context.pet_species:
            substitutions["pet_species"] = context.pet_species

        # Add custom data
        if context.custom_data:
            for key, value in context.custom_data.items():
                if isinstance(value, str):
                    substitutions[key] = value
                elif isinstance(value, (list, dict)):
                    substitutions[key] = str(value)

        # Perform substitutions
        result = text
        for key, value in substitutions.items():
            result = result.replace(f"{{{key}}}", value)

        return result

    def _build_messages(
        self,
        system_prompt: str,
        conversation_history: List[Message],
        user_message: str,
        context: AgentContext | None,
    ) -> List[Message]:
        """
        Build the full message list for the AI request.

        Args:
            system_prompt: System prompt defining agent behavior
            conversation_history: Previous messages in the conversation
            user_message: The current user message
            context: Context for variable substitution

        Returns:
            Complete list of messages for the API call
        """
        messages = []

        # Add system message with context substitution
        processed_system_prompt = self._substitute_context(system_prompt, context)
        messages.append(Message(role="system", content=processed_system_prompt))

        # Add conversation history
        for msg in conversation_history:
            messages.append(msg)

        # Add current user message
        messages.append(Message(role="user", content=user_message))

        return messages

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute an AI agent with the given request.

        Args:
            request: AgentRequest containing provider, model, prompts, and credentials

        Returns:
            AgentResponse with the agent's response and metadata

        Raises:
            ValueError: If the provider is not supported
            Exception: If the API call fails
        """
        logger.info(
            f"Executing agent: provider={request.provider}, "
            f"model={request.model}, history={len(request.conversation_history)}"
        )

        # Build messages with context substitution
        messages = self._build_messages(
            system_prompt=request.system_prompt,
            conversation_history=request.conversation_history,
            user_message=request.user_message,
            context=request.context,
        )

        # Get the appropriate provider
        provider = get_provider(request.provider, request.credentials)

        # Execute the chat completion
        chat_response = await provider.chat(
            messages=messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        logger.info(
            f"Agent execution successful: tokens={chat_response.usage.total_tokens}, "
            f"latency={chat_response.latency_ms}ms"
        )

        return AgentResponse(
            response=chat_response.content,
            usage=chat_response.usage,
            latency_ms=chat_response.latency_ms,
            model=chat_response.model,
            provider=chat_response.provider,
        )

    async def execute_stream(self, request: AgentRequest) -> AsyncIterator[StreamChunk]:
        """
        Execute an AI agent with streaming response.

        Args:
            request: AgentRequest containing provider, model, prompts, and credentials

        Yields:
            StreamChunk objects with response tokens as they arrive

        Raises:
            ValueError: If the provider is not supported
            Exception: If the API call fails
        """
        logger.info(
            f"Executing agent (stream): provider={request.provider}, "
            f"model={request.model}, history={len(request.conversation_history)}"
        )

        # Build messages with context substitution
        messages = self._build_messages(
            system_prompt=request.system_prompt,
            conversation_history=request.conversation_history,
            user_message=request.user_message,
            context=request.context,
        )

        # Get the appropriate provider
        provider = get_provider(request.provider, request.credentials)

        # Execute the streaming chat completion
        async for chunk in provider.chat_stream(
            messages=messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        ):
            yield chunk

        logger.info("Agent stream execution completed")
