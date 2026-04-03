-- pgvector setup for RAG
-- This is also included in migration 20260225120000_add_rag_pgvector.
-- Run manually only if you need to re-apply after a prisma migrate reset.
-- Usage: pnpm prisma:migrate:pgvector
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "document_chunks" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);
