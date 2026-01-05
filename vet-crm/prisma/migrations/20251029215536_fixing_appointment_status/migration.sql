/*
  Warnings:

  - The `status` column on the `Appointment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SCHEDULED';

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");
