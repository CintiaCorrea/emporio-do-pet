-- RAG + pgvector Migration
-- Enables vector extension, creates RAG tables (idempotent), and adds HNSW index

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create knowledge_bases table
CREATE TABLE IF NOT EXISTS "knowledge_bases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "totalSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- 3. Create knowledge_documents table
CREATE TABLE IF NOT EXISTS "knowledge_documents" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- 4. Create document_chunks table WITH embedding column
CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "chunkIndex" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- 5. Add embedding column if table already existed without it
ALTER TABLE "document_chunks" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- 6. Add RAG columns to ai_agents if they don't exist
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "knowledgeBaseId" TEXT;
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "ragEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "ragTopK" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "ragThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7;

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS "knowledge_bases_userId_idx" ON "knowledge_bases"("userId");
CREATE INDEX IF NOT EXISTS "knowledge_documents_knowledgeBaseId_idx" ON "knowledge_documents"("knowledgeBaseId");
CREATE INDEX IF NOT EXISTS "knowledge_documents_status_idx" ON "knowledge_documents"("status");
CREATE INDEX IF NOT EXISTS "document_chunks_documentId_idx" ON "document_chunks"("documentId");

-- 8. Create HNSW index for cosine similarity search
CREATE INDEX IF NOT EXISTS "idx_document_chunks_embedding" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);

-- 9. Add foreign key constraints (idempotent via DO block)
DO $$ BEGIN
    ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_knowledgeBaseId_fkey"
        FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey"
        FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_knowledgeBaseId_fkey"
        FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
