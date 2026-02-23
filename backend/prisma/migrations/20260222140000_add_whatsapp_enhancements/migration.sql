-- WhatsApp Message - Cloud storage fields
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "media_cloud_url" TEXT;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "media_cloud_id" TEXT;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "media_storage_type" TEXT;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "media_downloaded_at" TIMESTAMP(3);

-- Webhook Events table for replay mechanism
CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_retry_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- Indexes for webhook_events
CREATE INDEX IF NOT EXISTS "webhook_events_user_id_status_idx" ON "webhook_events"("user_id", "status");
CREATE INDEX IF NOT EXISTS "webhook_events_status_next_retry_at_idx" ON "webhook_events"("status", "next_retry_at");
CREATE INDEX IF NOT EXISTS "webhook_events_event_type_idx" ON "webhook_events"("event_type");

-- Media Files table for permanent media storage tracking
CREATE TABLE IF NOT EXISTS "media_files" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "local_path" TEXT,
    "cloud_url" TEXT,
    "public_id" TEXT,
    "storage_provider" TEXT NOT NULL DEFAULT 'local',
    "source" TEXT,
    "source_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- Indexes for media_files
CREATE INDEX IF NOT EXISTS "media_files_user_id_idx" ON "media_files"("user_id");
CREATE INDEX IF NOT EXISTS "media_files_source_source_id_idx" ON "media_files"("source", "source_id");
CREATE INDEX IF NOT EXISTS "media_files_storage_provider_idx" ON "media_files"("storage_provider");
