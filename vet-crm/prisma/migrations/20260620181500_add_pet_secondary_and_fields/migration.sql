-- AlterTable: novos campos do Pet (convênio/plano, temperamento, tutor secundário)
ALTER TABLE "pets" ADD COLUMN "insurancePlan" TEXT;
ALTER TABLE "pets" ADD COLUMN "temperament" TEXT;
ALTER TABLE "pets" ADD COLUMN "secondaryTutorId" TEXT;

-- AddForeignKey: tutor secundário (opcional, SET NULL ao excluir o tutor)
ALTER TABLE "pets" ADD CONSTRAINT "pets_secondaryTutorId_fkey" FOREIGN KEY ("secondaryTutorId") REFERENCES "tutors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
