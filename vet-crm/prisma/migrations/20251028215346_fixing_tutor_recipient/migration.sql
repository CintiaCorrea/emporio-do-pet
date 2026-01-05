/*
  Warnings:

  - A unique constraint covering the columns `[newsletterId,tutorId]` on the table `Recipient` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "RecipientType" ADD VALUE 'TUTOR';

-- AlterTable
ALTER TABLE "Recipient" ADD COLUMN     "tutorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Recipient_newsletterId_tutorId_key" ON "Recipient"("newsletterId", "tutorId");
