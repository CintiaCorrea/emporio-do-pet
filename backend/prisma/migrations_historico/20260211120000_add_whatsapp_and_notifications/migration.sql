-- =====================================================
-- Migration: Add WhatsApp and Notifications Tables
-- Date: 2026-02-11
-- Description: Creates WhatsApp messaging tables,
--   campaign tables, and notifications table.
-- =====================================================

-- CreateEnum: WhatsApp Message Type
CREATE TYPE "WhatsAppMessageType" AS ENUM (
  'TEXT',
  'IMAGE',
  'DOCUMENT',
  'AUDIO',
  'VIDEO',
  'LOCATION',
  'TEMPLATE',
  'INTERACTIVE',
  'BUTTON',
  'STICKER',
  'CONTACTS'
);

-- CreateEnum: WhatsApp Message Status
CREATE TYPE "WhatsAppMessageStatus" AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED'
);

-- CreateEnum: WhatsApp Message Direction
CREATE TYPE "WhatsAppMessageDirection" AS ENUM (
  'INBOUND',
  'OUTBOUND'
);

-- CreateEnum: WhatsApp Conversation Status
CREATE TYPE "WhatsAppConversationStatus" AS ENUM (
  'OPEN',
  'CLOSED',
  'PENDING',
  'ASSIGNED'
);

-- CreateEnum: WhatsApp Campaign Status
CREATE TYPE "WhatsAppCampaignStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'PAUSED'
);

-- CreateEnum: Notification Type
CREATE TYPE "NotificationType" AS ENUM (
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
  'ALERT',
  'WHATSAPP_MESSAGE',
  'APPOINTMENT_REMINDER',
  'AUTOMATION_COMPLETE',
  'CAMPAIGN_COMPLETE'
);

-- CreateEnum: Notification Channel
CREATE TYPE "NotificationChannel" AS ENUM (
  'IN_APP',
  'EMAIL',
  'WHATSAPP',
  'PUSH'
);

-- =====================================================
-- WhatsApp Conversations
-- =====================================================
CREATE TABLE "whatsapp_conversations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL,
  "contactName" TEXT,
  "contactPushName" TEXT,
  "status" "WhatsAppConversationStatus" NOT NULL DEFAULT 'OPEN',
  "assignedAgentId" TEXT,
  "tutorId" TEXT,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessagePreview" TEXT,
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  "isAutoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- WhatsApp Messages
-- =====================================================
CREATE TABLE "whatsapp_messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "waMessageId" TEXT,
  "direction" "WhatsAppMessageDirection" NOT NULL DEFAULT 'INBOUND',
  "type" "WhatsAppMessageType" NOT NULL DEFAULT 'TEXT',
  "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'PENDING',
  "content" TEXT NOT NULL,
  "mediaUrl" TEXT,
  "mediaType" TEXT,
  "mediaCaption" TEXT,
  "metadata" JSONB,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "failedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- WhatsApp Campaigns
-- =====================================================
CREATE TABLE "whatsapp_campaigns" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "WhatsAppCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "templateName" TEXT,
  "templateLanguage" TEXT DEFAULT 'pt_BR',
  "messageContent" TEXT NOT NULL,
  "messageType" "WhatsAppMessageType" NOT NULL DEFAULT 'TEXT',
  "mediaUrl" TEXT,
  "audienceType" TEXT NOT NULL DEFAULT 'all',
  "audienceFilter" JSONB,
  "scheduledFor" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "totalRecipients" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "readCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "whatsapp_campaigns_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- WhatsApp Campaign Recipients
-- =====================================================
CREATE TABLE "whatsapp_campaign_recipients" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT,
  "tutorId" TEXT,
  "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'PENDING',
  "waMessageId" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "failedReason" TEXT,
  "variables" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "whatsapp_campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- Notifications
-- =====================================================
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'INFO',
  "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "metadata" JSONB,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- Unique Constraints
-- =====================================================
CREATE UNIQUE INDEX "whatsapp_messages_waMessageId_key" ON "whatsapp_messages"("waMessageId");
CREATE UNIQUE INDEX "whatsapp_conversations_userId_contactPhone_key" ON "whatsapp_conversations"("userId", "contactPhone");
CREATE UNIQUE INDEX "whatsapp_campaign_recipients_campaignId_phone_key" ON "whatsapp_campaign_recipients"("campaignId", "phone");

-- =====================================================
-- Indexes
-- =====================================================

-- WhatsApp Messages indexes
CREATE INDEX "whatsapp_messages_conversationId_createdAt_idx" ON "whatsapp_messages"("conversationId", "createdAt");
CREATE INDEX "whatsapp_messages_waMessageId_idx" ON "whatsapp_messages"("waMessageId");
CREATE INDEX "whatsapp_messages_status_idx" ON "whatsapp_messages"("status");
CREATE INDEX "whatsapp_messages_direction_idx" ON "whatsapp_messages"("direction");

-- WhatsApp Conversations indexes
CREATE INDEX "whatsapp_conversations_userId_status_idx" ON "whatsapp_conversations"("userId", "status");
CREATE INDEX "whatsapp_conversations_userId_lastMessageAt_idx" ON "whatsapp_conversations"("userId", "lastMessageAt");
CREATE INDEX "whatsapp_conversations_contactPhone_idx" ON "whatsapp_conversations"("contactPhone");

-- WhatsApp Campaigns indexes
CREATE INDEX "whatsapp_campaigns_userId_status_idx" ON "whatsapp_campaigns"("userId", "status");
CREATE INDEX "whatsapp_campaigns_scheduledFor_idx" ON "whatsapp_campaigns"("scheduledFor");
CREATE INDEX "whatsapp_campaigns_status_idx" ON "whatsapp_campaigns"("status");

-- WhatsApp Campaign Recipients indexes
CREATE INDEX "whatsapp_campaign_recipients_campaignId_status_idx" ON "whatsapp_campaign_recipients"("campaignId", "status");
CREATE INDEX "whatsapp_campaign_recipients_phone_idx" ON "whatsapp_campaign_recipients"("phone");

-- Notifications indexes
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- =====================================================
-- Foreign Keys
-- =====================================================

-- WhatsApp Conversations foreign keys
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- WhatsApp Messages foreign keys
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WhatsApp Campaigns foreign keys
ALTER TABLE "whatsapp_campaigns" ADD CONSTRAINT "whatsapp_campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WhatsApp Campaign Recipients foreign keys
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notifications foreign keys
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- Add voice columns to ai_agents (if not present)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_agents' AND column_name = 'voiceEnabled'
  ) THEN
    ALTER TABLE "ai_agents" ADD COLUMN "voiceEnabled" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "ai_agents" ADD COLUMN "voiceId" TEXT NOT NULL DEFAULT 'nova';
    ALTER TABLE "ai_agents" ADD COLUMN "voiceSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
    ALTER TABLE "ai_agents" ADD COLUMN "voiceModel" TEXT NOT NULL DEFAULT 'tts-1';
  END IF;
END $$;

-- =====================================================
-- Add emailConfig column to integration_settings (if not present)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'integration_settings' AND column_name = 'emailConfig'
  ) THEN
    ALTER TABLE "integration_settings" ADD COLUMN "emailConfig" TEXT;
  END IF;
END $$;
