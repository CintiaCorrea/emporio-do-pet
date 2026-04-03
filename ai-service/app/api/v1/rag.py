"""
RAG Endpoints
Handles document ingestion, retrieval, and deletion for RAG.
"""

import base64
import logging

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.schemas import (
    DeleteResponse,
    ErrorResponse,
    IngestRequest,
    IngestResponse,
    RetrieveRequest,
    RetrieveResponse,
)
from app.services.rag_service import RAGService

router = APIRouter(tags=["RAG"])
logger = logging.getLogger(__name__)
settings = get_settings()


@router.post(
    "/rag/ingest",
    response_model=IngestResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def ingest_document(request: IngestRequest) -> IngestResponse:
    """Ingest a document: parse, chunk, generate embeddings, and store."""
    if request.file_content:
        max_bytes = settings.max_upload_size_mb * 1024 * 1024
        decoded_size = len(base64.b64decode(request.file_content))
        if decoded_size > max_bytes:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "file_too_large",
                    "message": f"File exceeds {settings.max_upload_size_mb}MB limit ({decoded_size / 1024 / 1024:.1f}MB)",
                },
            )
    try:
        service = RAGService()
        return await service.ingest_document(
            document_id=request.document_id,
            file_type=request.file_type,
            knowledge_base_id=request.knowledge_base_id,
            credentials=request.credentials,
            file_path=request.file_path,
            file_content=request.file_content,
            file_name=request.file_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": "invalid_request", "message": str(e)})
    except Exception as e:
        logger.error(f"Ingestion error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "ingestion_error", "message": str(e)},
        )


@router.post(
    "/rag/retrieve",
    response_model=RetrieveResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def retrieve_chunks(request: RetrieveRequest) -> RetrieveResponse:
    """Retrieve relevant document chunks for a query."""
    try:
        service = RAGService()
        chunks, query_tokens = await service.retrieve(
            query=request.query,
            knowledge_base_id=request.knowledge_base_id,
            credentials=request.credentials,
            top_k=request.top_k,
            threshold=request.threshold,
        )
        return RetrieveResponse(chunks=chunks, query_tokens=query_tokens)
    except Exception as e:
        logger.error(f"Retrieval error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "retrieval_error", "message": str(e)},
        )


@router.delete(
    "/rag/documents/{document_id}",
    response_model=DeleteResponse,
)
async def delete_document_chunks(document_id: str) -> DeleteResponse:
    """Delete all chunks for a specific document."""
    try:
        service = RAGService()
        await service.delete_document_chunks(document_id)
        return DeleteResponse(success=True, message=f"Chunks deleted for document {document_id}")
    except Exception as e:
        logger.error(f"Delete error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "delete_error", "message": str(e)},
        )


@router.delete(
    "/rag/knowledge-bases/{knowledge_base_id}",
    response_model=DeleteResponse,
)
async def delete_knowledge_base_chunks(knowledge_base_id: str) -> DeleteResponse:
    """Delete all chunks for all documents in a knowledge base."""
    try:
        service = RAGService()
        await service.delete_knowledge_base_chunks(knowledge_base_id)
        return DeleteResponse(
            success=True,
            message=f"All chunks deleted for knowledge base {knowledge_base_id}",
        )
    except Exception as e:
        logger.error(f"Delete error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "delete_error", "message": str(e)},
        )
