-- Lead: pipeline + FU + resumo IA
ALTER TABLE "Lead"
  ADD COLUMN "pipelineComercialEtapa" TEXT,
  ADD COLUMN "proximoFollowupAt" TIMESTAMP(3),
  ADD COLUMN "resumoIa" TEXT,
  ADD COLUMN "resumoIaUpdatedAt" TIMESTAMP(3);

-- Tutor: estado + FU + resumo IA
ALTER TABLE "tutors"
  ADD COLUMN "estadoRelacionamento" TEXT,
  ADD COLUMN "proximoFollowupAt" TIMESTAMP(3),
  ADD COLUMN "resumoIa" TEXT,
  ADD COLUMN "resumoIaUpdatedAt" TIMESTAMP(3);

-- Pet: pipelines + FU
ALTER TABLE "pets"
  ADD COLUMN "pipelineClinicoEtapa" TEXT,
  ADD COLUMN "pipelineFisioEtapa" TEXT,
  ADD COLUMN "proximoFollowupAt" TIMESTAMP(3);

-- Interacao
CREATE TABLE "interacoes" (
  "id" TEXT NOT NULL,
  "leadId" TEXT,
  "tutorId" TEXT,
  "petId" TEXT,
  "autorUserId" TEXT,
  "tipo" TEXT NOT NULL DEFAULT 'NOTA',
  "texto" TEXT NOT NULL,
  "proximaAcao" TEXT,
  "proximoFollowupAt" TIMESTAMP(3),
  "canal" TEXT,
  "threadId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "interacoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "interacoes_leadId_idx" ON "interacoes"("leadId");
CREATE INDEX "interacoes_tutorId_idx" ON "interacoes"("tutorId");
CREATE INDEX "interacoes_petId_idx" ON "interacoes"("petId");
CREATE INDEX "interacoes_createdAt_idx" ON "interacoes"("createdAt");

ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_autorUserId_fkey" FOREIGN KEY ("autorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
