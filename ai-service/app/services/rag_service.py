"""
RAG Service
Handles document ingestion (parse, chunk, embed, store) and retrieval.
"""

import logging
import re
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import tiktoken

from app.config import get_settings
from app.core.database import get_db_pool
from app.schemas.common import Credentials
from app.schemas.rag import IngestResponse, RetrievedChunk
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class RAGService:
    """Service for RAG document ingestion and retrieval."""

    def __init__(self):
        self.settings = get_settings()
        self.embedding_service = EmbeddingService()
        try:
            self._encoder = tiktoken.encoding_for_model("gpt-4o")
        except KeyError:
            self._encoder = tiktoken.get_encoding("cl100k_base")

    # ── Document Parsing ──────────────────────────────────────────────

    def _parse_pdf(self, file_path: str) -> List[Tuple[str, dict]]:
        """Parse PDF and return list of (text, metadata) per page."""
        from pypdf import PdfReader

        reader = PdfReader(file_path)
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages.append((text, {"page": i + 1}))
        return pages

    def _parse_docx(self, file_path: str) -> List[Tuple[str, dict]]:
        """Parse DOCX and return list of (text, metadata)."""
        from docx import Document

        doc = Document(file_path)
        full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        if full_text.strip():
            return [(full_text, {})]
        return []

    def _parse_txt(self, file_path: str) -> List[Tuple[str, dict]]:
        """Parse plain text file."""
        text = Path(file_path).read_text(encoding="utf-8", errors="ignore")
        if text.strip():
            return [(text, {})]
        return []

    def _parse_document(self, file_path: str, file_type: str) -> List[Tuple[str, dict]]:
        """Parse a document based on its type."""
        parsers = {
            "pdf": self._parse_pdf,
            "docx": self._parse_docx,
            "txt": self._parse_txt,
            "text": self._parse_txt,
            "csv": self._parse_txt,
        }

        parser = parsers.get(file_type.lower())
        if not parser:
            raise ValueError(f"Unsupported file type: {file_type}")

        return parser(file_path)

    # ── Chunking ──────────────────────────────────────────────────────

    def _chunk_text(
        self,
        text: str,
        metadata: dict,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> List[Tuple[str, dict, int]]:
        """Split text into overlapping chunks based on token count.
        
        Returns list of (chunk_text, chunk_metadata, token_count).
        """
        chunk_size = chunk_size or self.settings.chunk_size
        chunk_overlap = chunk_overlap or self.settings.chunk_overlap

        paragraphs = re.split(r"\n\s*\n", text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]

        chunks: List[Tuple[str, dict, int]] = []
        current_chunk: List[str] = []
        current_tokens = 0

        for paragraph in paragraphs:
            para_tokens = len(self._encoder.encode(paragraph))

            if para_tokens > chunk_size:
                if current_chunk:
                    chunk_text = "\n\n".join(current_chunk)
                    chunks.append((chunk_text, {**metadata}, current_tokens))
                    current_chunk = []
                    current_tokens = 0

                sentences = re.split(r"(?<=[.!?])\s+", paragraph)
                for sentence in sentences:
                    sent_tokens = len(self._encoder.encode(sentence))
                    if current_tokens + sent_tokens > chunk_size and current_chunk:
                        chunk_text = " ".join(current_chunk)
                        chunks.append((chunk_text, {**metadata}, current_tokens))

                        overlap_tokens = 0
                        overlap_parts: List[str] = []
                        for part in reversed(current_chunk):
                            part_tokens = len(self._encoder.encode(part))
                            if overlap_tokens + part_tokens > chunk_overlap:
                                break
                            overlap_parts.insert(0, part)
                            overlap_tokens += part_tokens

                        current_chunk = overlap_parts
                        current_tokens = overlap_tokens

                    current_chunk.append(sentence)
                    current_tokens += sent_tokens
                continue

            if current_tokens + para_tokens > chunk_size and current_chunk:
                chunk_text = "\n\n".join(current_chunk)
                chunks.append((chunk_text, {**metadata}, current_tokens))

                overlap_tokens = 0
                overlap_parts: List[str] = []
                for part in reversed(current_chunk):
                    part_tokens = len(self._encoder.encode(part))
                    if overlap_tokens + part_tokens > chunk_overlap:
                        break
                    overlap_parts.insert(0, part)
                    overlap_tokens += part_tokens

                current_chunk = overlap_parts
                current_tokens = overlap_tokens

            current_chunk.append(paragraph)
            current_tokens += para_tokens

        if current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            chunks.append((chunk_text, {**metadata}, current_tokens))

        return chunks

    # ── Ingestion ─────────────────────────────────────────────────────

    async def ingest_document(
        self,
        document_id: str,
        file_path: str,
        file_type: str,
        knowledge_base_id: str,
        credentials: Credentials,
    ) -> IngestResponse:
        """Ingest a document: parse, chunk, embed, and store."""
        pool = get_db_pool()

        await pool.execute(
            'UPDATE "knowledge_documents" SET status = $1 WHERE id = $2',
            "PROCESSING",
            document_id,
        )

        try:
            pages = self._parse_document(file_path, file_type)
            if not pages:
                await pool.execute(
                    'UPDATE "knowledge_documents" SET status = $1, "errorMessage" = $2 WHERE id = $3',
                    "ERROR", "No text content found in document", document_id,
                )
                return IngestResponse(
                    document_id=document_id,
                    chunks_created=0,
                    total_tokens=0,
                    status="ERROR",
                )

            file_name = Path(file_path).name
            all_chunks: List[Tuple[str, dict, int]] = []
            for text, meta in pages:
                meta["file_name"] = file_name
                chunks = self._chunk_text(text, meta)
                all_chunks.extend(chunks)

            if not all_chunks:
                await pool.execute(
                    'UPDATE "knowledge_documents" SET status = $1, "errorMessage" = $2 WHERE id = $3',
                    "ERROR", "No chunks generated from document", document_id,
                )
                return IngestResponse(
                    document_id=document_id,
                    chunks_created=0,
                    total_tokens=0,
                    status="ERROR",
                )

            logger.info(f"Generated {len(all_chunks)} chunks, generating embeddings...")

            texts = [c[0] for c in all_chunks]
            embeddings = await self.embedding_service.generate_embeddings_batch(
                texts, credentials
            )

            total_tokens = sum(c[2] for c in all_chunks)

            async with pool.acquire() as conn:
                async with conn.transaction():
                    for i, (chunk_text, chunk_meta, token_count) in enumerate(all_chunks):
                        embedding = np.array(embeddings[i], dtype=np.float32)
                        import json

                        await conn.execute(
                            """
                            INSERT INTO "document_chunks" 
                                (id, "documentId", content, metadata, "chunkIndex", "tokenCount", "createdAt", embedding)
                            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6)
                            """,
                            document_id,
                            chunk_text,
                            json.dumps(chunk_meta),
                            i,
                            token_count,
                            embedding,
                        )

                    await conn.execute(
                        'UPDATE "knowledge_documents" SET status = $1, "chunkCount" = $2 WHERE id = $3',
                        "READY",
                        len(all_chunks),
                        document_id,
                    )

                    await conn.execute(
                        """
                        UPDATE "knowledge_bases" SET 
                            "totalChunks" = (
                                SELECT COALESCE(SUM("chunkCount"), 0) 
                                FROM "knowledge_documents" 
                                WHERE "knowledgeBaseId" = $1 AND status = 'READY'
                            ),
                            "totalDocuments" = (
                                SELECT COUNT(*) 
                                FROM "knowledge_documents" 
                                WHERE "knowledgeBaseId" = $1 AND status = 'READY'
                            ),
                            status = 'READY'
                        WHERE id = $1
                        """,
                        knowledge_base_id,
                    )

            logger.info(
                f"Ingestion complete: document={document_id}, "
                f"chunks={len(all_chunks)}, tokens={total_tokens}"
            )

            return IngestResponse(
                document_id=document_id,
                chunks_created=len(all_chunks),
                total_tokens=total_tokens,
                status="READY",
            )

        except Exception as e:
            logger.error(f"Ingestion failed for document {document_id}: {e}", exc_info=True)
            await pool.execute(
                'UPDATE "knowledge_documents" SET status = $1, "errorMessage" = $2 WHERE id = $3',
                "ERROR",
                str(e)[:500],
                document_id,
            )
            raise

    # ── Retrieval ─────────────────────────────────────────────────────

    async def retrieve(
        self,
        query: str,
        knowledge_base_id: str,
        credentials: Credentials,
        top_k: int = 5,
        threshold: float = 0.7,
    ) -> Tuple[List[RetrievedChunk], int]:
        """Retrieve relevant chunks for a query.
        
        Returns (chunks, query_token_count).
        """
        pool = get_db_pool()

        query_embedding = await self.embedding_service.generate_embedding(query, credentials)
        query_tokens = len(self._encoder.encode(query))

        embedding_array = np.array(query_embedding, dtype=np.float32)

        rows = await pool.fetch(
            """
            SELECT 
                dc.content,
                dc.metadata,
                1 - (dc.embedding <=> $1) AS similarity
            FROM "document_chunks" dc
            JOIN "knowledge_documents" kd ON dc."documentId" = kd.id
            WHERE kd."knowledgeBaseId" = $2
              AND kd.status = 'READY'
              AND 1 - (dc.embedding <=> $1) >= $3
            ORDER BY dc.embedding <=> $1
            LIMIT $4
            """,
            embedding_array,
            knowledge_base_id,
            threshold,
            top_k,
        )

        chunks = []
        for row in rows:
            import json

            metadata = json.loads(row["metadata"]) if row["metadata"] else None
            chunks.append(
                RetrievedChunk(
                    content=row["content"],
                    metadata=metadata,
                    similarity=float(row["similarity"]),
                )
            )

        logger.info(
            f"Retrieved {len(chunks)} chunks for query "
            f"(kb={knowledge_base_id}, top_k={top_k}, threshold={threshold})"
        )

        return chunks, query_tokens

    # ── Deletion ──────────────────────────────────────────────────────

    async def delete_document_chunks(self, document_id: str):
        """Delete all chunks for a document."""
        pool = get_db_pool()
        await pool.execute(
            'DELETE FROM "document_chunks" WHERE "documentId" = $1',
            document_id,
        )
        logger.info(f"Deleted chunks for document {document_id}")

    async def delete_knowledge_base_chunks(self, knowledge_base_id: str):
        """Delete all chunks for all documents in a knowledge base."""
        pool = get_db_pool()
        await pool.execute(
            """
            DELETE FROM "document_chunks" 
            WHERE "documentId" IN (
                SELECT id FROM "knowledge_documents" WHERE "knowledgeBaseId" = $1
            )
            """,
            knowledge_base_id,
        )
        logger.info(f"Deleted all chunks for knowledge base {knowledge_base_id}")
