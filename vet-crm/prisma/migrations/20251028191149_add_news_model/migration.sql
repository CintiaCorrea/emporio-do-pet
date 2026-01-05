/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `approvedById` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Appointment" DROP CONSTRAINT "Appointment_petId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Appointment" DROP CONSTRAINT "Appointment_tutorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Appointment" DROP CONSTRAINT "Appointment_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Board" DROP CONSTRAINT "Board_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanbanCard" DROP CONSTRAINT "KanbanCard_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanbanCard" DROP CONSTRAINT "KanbanCard_columnId_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanbanColumn" DROP CONSTRAINT "KanbanColumn_boardId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Newsletter" DROP CONSTRAINT "Newsletter_templateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Newsletter" DROP CONSTRAINT "Newsletter_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."NewsletterLog" DROP CONSTRAINT "NewsletterLog_newsletterId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Recipient" DROP CONSTRAINT "Recipient_clientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Recipient" DROP CONSTRAINT "Recipient_newsletterId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Treatment" DROP CONSTRAINT "Treatment_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Treatment" DROP CONSTRAINT "Treatment_petId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Treatment" DROP CONSTRAINT "Treatment_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."contacts" DROP CONSTRAINT "contacts_tutorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pets" DROP CONSTRAINT "pets_tutorId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "approvedAt",
DROP COLUMN "approvedById",
DROP COLUMN "rejectionReason",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "public"."UserStatus";
