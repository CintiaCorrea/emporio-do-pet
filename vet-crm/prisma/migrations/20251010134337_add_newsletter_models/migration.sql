-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('CLIENT', 'LEAD', 'ALL');

-- CreateTable
CREATE TABLE "Newsletter" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "NewsletterStatus" NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "recipientType" "RecipientType" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipient" (
    "id" TEXT NOT NULL,
    "newsletterId" TEXT NOT NULL,
    "clientId" TEXT,
    "leadEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterLog" (
    "id" TEXT NOT NULL,
    "newsletterId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recipient_newsletterId_clientId_key" ON "Recipient"("newsletterId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipient_newsletterId_leadEmail_key" ON "Recipient"("newsletterId", "leadEmail");

-- CreateIndex
CREATE INDEX "NewsletterLog_newsletterId_idx" ON "NewsletterLog"("newsletterId");

-- CreateIndex
CREATE INDEX "NewsletterLog_sentAt_idx" ON "NewsletterLog"("sentAt");
