/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `tutors` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tutors" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tutors_email_key" ON "tutors"("email");
