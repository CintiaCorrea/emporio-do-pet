"""
RAG Schemas
Pydantic models for RAG ingestion and retrieval.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .common import Credentials


class IngestRequest(BaseModel):
    """Request to ingest a document into the knowledge base."""

    document_id: str = Field(..., description="ID of the document to ingest")
    file_path: str = Field(..., description="Path to the document file on disk")
    file_type: str = Field(..., description="File type: pdf, docx, txt")
    knowledge_base_id: str = Field(..., description="Knowledge base to add document to")
    credentials: Credentials = Field(..., description="OpenAI API credentials for embedding generation")


class IngestResponse(BaseModel):
    """Response from document ingestion."""

    document_id: str
    chunks_created: int
    total_tokens: int
    status: str


class RetrieveRequest(BaseModel):
    """Request to retrieve relevant chunks for a query."""

    query: str = Field(..., description="The user query to find relevant content for")
    knowledge_base_id: str = Field(..., description="Knowledge base to search in")
    credentials: Credentials = Field(..., description="OpenAI API credentials for embedding generation")
    top_k: int = Field(5, ge=1, le=20, description="Number of chunks to retrieve")
    threshold: float = Field(0.7, ge=0.0, le=1.0, description="Minimum cosine similarity threshold")


class RetrievedChunk(BaseModel):
    """A retrieved document chunk with similarity score."""

    content: str
    metadata: Optional[Dict[str, Any]] = None
    similarity: float


class RetrieveResponse(BaseModel):
    """Response from chunk retrieval."""

    chunks: List[RetrievedChunk]
    query_tokens: int


class DeleteResponse(BaseModel):
    """Response from a delete operation."""

    success: bool
    message: str
