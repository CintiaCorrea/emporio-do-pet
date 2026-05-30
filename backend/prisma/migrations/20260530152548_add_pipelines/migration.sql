-- CreateEnum
CREATE TYPE "PipelineEscopo" AS ENUM ('LEAD', 'CLIENTE', 'PROJETO', 'CUSTOM');

-- CreateTable
CREATE TABLE "pipeline_definitions" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "escopo" "PipelineEscopo" NOT NULL DEFAULT 'CUSTOM',
    "descricao" TEXT,
    "cor" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "isPadrao" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pipeline_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_estagios" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL,
    "ehInicial" BOOLEAN NOT NULL DEFAULT false,
    "ehGanho" BOOLEAN NOT NULL DEFAULT false,
    "ehPerda" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "diasMaxParar" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pipeline_estagios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_definitions_escopo_ativo_idx" ON "pipeline_definitions"("escopo", "ativo");

-- CreateIndex
CREATE INDEX "pipeline_estagios_pipelineId_ordem_idx" ON "pipeline_estagios"("pipelineId", "ordem");

-- AddForeignKey
ALTER TABLE "pipeline_estagios" ADD CONSTRAINT "pipeline_estagios_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipeline_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
