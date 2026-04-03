"""
Agent Service
Business logic for AI agent execution.
"""

import logging
import re
from typing import AsyncIterator, List, Optional, Tuple

from app.core.providers import get_provider
from app.schemas import AgentContext, AgentRequest, AgentResponse, Message, StreamChunk
from app.schemas.rag import RetrievedChunk

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
        if context.current_date:
            substitutions["current_date"] = context.current_date

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

    async def _retrieve_rag_context(
        self,
        request: AgentRequest,
    ) -> Tuple[List[RetrievedChunk], int, Optional[str]]:
        """Retrieve RAG context if enabled. Returns (chunks, query_tokens, error_message)."""
        if not request.rag_enabled or not request.rag_knowledge_base_id:
            return [], 0, None

        try:
            from app.services.rag_service import RAGService

            rag_service = RAGService()
            chunks, query_tokens = await rag_service.retrieve(
                query=request.user_message,
                knowledge_base_id=request.rag_knowledge_base_id,
                credentials=request.credentials,
                top_k=request.rag_top_k,
                threshold=request.rag_threshold,
            )
            return chunks, query_tokens, None
        except Exception as e:
            error_msg = f"RAG retrieval failed: {e}"
            logger.error(error_msg, exc_info=True)
            return [], 0, str(e)

    def _format_rag_context(self, chunks: List[RetrievedChunk]) -> str:
        """Format retrieved chunks into a context block for the system prompt."""
        if not chunks:
            return ""

        lines = [
            "\n\n---",
            "INFORMAÇÕES DA BASE DE CONHECIMENTO:",
            "Use as informações abaixo para responder com precisão.",
            "Se a resposta não estiver nas informações fornecidas, informe que não possui essa informação.",
            "",
        ]

        for i, chunk in enumerate(chunks, 1):
            source_parts = []
            if chunk.metadata:
                if "file_name" in chunk.metadata:
                    source_parts.append(f"fonte: {chunk.metadata['file_name']}")
                if "page" in chunk.metadata:
                    source_parts.append(f"página: {chunk.metadata['page']}")

            source_info = f" ({', '.join(source_parts)})" if source_parts else ""
            lines.append(f"[{i}]{source_info}")
            lines.append(chunk.content)
            lines.append("")

        lines.append("---")
        return "\n".join(lines)

    def _build_messages(
        self,
        system_prompt: str,
        conversation_history: List[Message],
        user_message: str,
        context: AgentContext | None,
        rag_chunks: Optional[List[RetrievedChunk]] = None,
    ) -> List[Message]:
        """
        Build the full message list for the AI request.

        Args:
            system_prompt: System prompt defining agent behavior
            conversation_history: Previous messages in the conversation
            user_message: The current user message
            context: Context for variable substitution
            rag_chunks: Retrieved RAG chunks to inject into the system prompt

        Returns:
            Complete list of messages for the API call
        """
        messages = []

        processed_system_prompt = self._substitute_context(system_prompt, context)

        if rag_chunks:
            rag_context = self._format_rag_context(rag_chunks)
            processed_system_prompt += rag_context

        messages.append(Message(role="system", content=processed_system_prompt))

        for msg in conversation_history:
            messages.append(msg)

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
            f"model={request.model}, history={len(request.conversation_history)}, "
            f"rag={request.rag_enabled}"
        )

        rag_chunks, rag_query_tokens, rag_error = await self._retrieve_rag_context(request)

        messages = self._build_messages(
            system_prompt=request.system_prompt,
            conversation_history=request.conversation_history,
            user_message=request.user_message,
            context=request.context,
            rag_chunks=rag_chunks,
        )

        provider = get_provider(request.provider, request.credentials)

        chat_response = await provider.chat(
            messages=messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        rag_sources = None
        if rag_chunks:
            sources = set()
            for chunk in rag_chunks:
                if chunk.metadata and "file_name" in chunk.metadata:
                    sources.add(chunk.metadata["file_name"])
            rag_sources = list(sources) if sources else None

        logger.info(
            f"Agent execution successful: tokens={chat_response.usage.total_tokens}, "
            f"latency={chat_response.latency_ms}ms, rag_chunks={len(rag_chunks)}"
        )

        return AgentResponse(
            response=chat_response.content,
            usage=chat_response.usage,
            latency_ms=chat_response.latency_ms,
            model=chat_response.model,
            provider=chat_response.provider,
            rag_chunks_used=len(rag_chunks) if rag_chunks else None,
            rag_sources=rag_sources,
            rag_embedding_tokens=rag_query_tokens if rag_query_tokens > 0 else None,
            rag_error=rag_error,
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
            f"model={request.model}, history={len(request.conversation_history)}, "
            f"rag={request.rag_enabled}"
        )

        rag_chunks, rag_query_tokens, rag_error = await self._retrieve_rag_context(request)
        if rag_error:
            logger.warning(f"RAG failed during stream, continuing without context: {rag_error}")

        if request.rag_enabled:
            rag_sources = None
            if rag_chunks:
                sources = set()
                for chunk in rag_chunks:
                    if chunk.metadata and "file_name" in chunk.metadata:
                        sources.add(chunk.metadata["file_name"])
                rag_sources = list(sources) if sources else None

            yield StreamChunk(
                type="rag_metadata",
                rag_chunks_used=len(rag_chunks) if rag_chunks else 0,
                rag_sources=rag_sources,
                rag_embedding_tokens=rag_query_tokens if rag_query_tokens > 0 else None,
                rag_error=rag_error,
            )

        messages = self._build_messages(
            system_prompt=request.system_prompt,
            conversation_history=request.conversation_history,
            user_message=request.user_message,
            context=request.context,
            rag_chunks=rag_chunks,
        )

        provider = get_provider(request.provider, request.credentials)

        async for chunk in provider.chat_stream(
            messages=messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        ):
            yield chunk

        logger.info("Agent stream execution completed")
