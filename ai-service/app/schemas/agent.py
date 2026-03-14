"""
Agent Schemas
Pydantic models for AI agent execution requests and responses.
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from .common import Credentials, Message, Usage
from .rag import RetrievedChunk


class AgentContext(BaseModel):
    """Context information to be injected into the agent's prompts."""

    clinic_name: Optional[str] = Field(None, description="Name of the veterinary clinic")
    tutor_name: Optional[str] = Field(None, description="Name of the pet owner/tutor")
    pet_name: Optional[str] = Field(None, description="Name of the pet")
    pet_species: Optional[str] = Field(None, description="Species of the pet")
    current_date: Optional[str] = Field(None, description="Current date string for prompt substitution")
    custom_data: Optional[Dict[str, Any]] = Field(
        None, description="Additional custom data for context"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "clinic_name": "Empório do Pet",
                    "tutor_name": "Maria Silva",
                    "pet_name": "Rex",
                    "pet_species": "Cachorro",
                    "custom_data": {"available_services": ["consulta", "vacina", "banho"]},
                }
            ]
        }
    }


class AgentRequest(BaseModel):
    """Request body for agent execution."""

    provider: Literal["openai", "gemini", "deepseek"] = Field(
        ..., description="AI provider to use"
    )
    model: str = Field(..., description="Model identifier")
    system_prompt: str = Field(
        ..., description="System prompt defining the agent's behavior"
    )
    conversation_history: List[Message] = Field(
        default_factory=list, description="Previous messages in the conversation"
    )
    user_message: str = Field(..., description="The user's current message")
    context: Optional[AgentContext] = Field(
        None, description="Context information to inject into prompts"
    )
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int = Field(4096, ge=1, le=128000, description="Maximum tokens")
    credentials: Credentials = Field(..., description="API credentials")

    # RAG Configuration
    rag_enabled: bool = Field(False, description="Whether RAG is enabled for this agent")
    rag_knowledge_base_id: Optional[str] = Field(None, description="Knowledge base ID to retrieve from")
    rag_top_k: int = Field(5, ge=1, le=20, description="Number of chunks to retrieve")
    rag_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Minimum similarity threshold")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "provider": "openai",
                    "model": "gpt-4o-mini",
                    "system_prompt": "Você é a assistente virtual da clínica {clinic_name}. Seja educada e prestativa.",
                    "conversation_history": [],
                    "user_message": "Quero agendar uma consulta para meu cachorro",
                    "context": {
                        "clinic_name": "Empório do Pet",
                        "tutor_name": "Maria",
                    },
                    "temperature": 0.7,
                    "max_tokens": 4096,
                    "credentials": {"api_key": "sk-..."},
                }
            ]
        }
    }


class AgentResponse(BaseModel):
    """Response from agent execution."""

    response: str = Field(..., description="The agent's response text")
    usage: Usage = Field(..., description="Token usage information")
    latency_ms: int = Field(..., description="Response latency in milliseconds")
    model: str = Field(..., description="Model used")
    provider: str = Field(..., description="Provider used")

    # RAG metadata
    rag_chunks_used: Optional[int] = Field(None, description="Number of RAG chunks injected")
    rag_sources: Optional[List[str]] = Field(None, description="Source file names used")
    rag_embedding_tokens: Optional[int] = Field(None, description="Tokens used for query embedding")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "response": "Olá! Claro, ficarei feliz em ajudá-la a agendar uma consulta para seu cachorro. Qual seria o melhor dia e horário para você?",
                    "usage": {
                        "prompt_tokens": 100,
                        "completion_tokens": 50,
                        "total_tokens": 150,
                    },
                    "latency_ms": 1500,
                    "model": "gpt-4o-mini",
                    "provider": "openai",
                }
            ]
        }
    }
