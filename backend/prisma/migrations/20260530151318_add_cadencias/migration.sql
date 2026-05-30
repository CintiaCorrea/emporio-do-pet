-- CreateEnum
CREATE TYPE "CadenciaGatilho" AS ENUM ('AGENDAMENTO_CRIADO', 'AGENDAMENTO_CONFIRMADO', 'ATENDIMENTO_FINALIZADO', 'EXAME_SOLICITADO', 'EXAME_PRONTO', 'LEAD_NOVO', 'LEAD_INATIVO_7D', 'PACOTE_ATIVADO', 'PACOTE_PROXIMO_DO_FIM', 'NIVER_PET', 'NIVER_TUTOR', 'MANUAL');

-- CreateEnum
CREATE TYPE "TipoPasso" AS ENUM ('WHATSAPP', 'EMAIL', 'TAREFA_INTERNA', 'AGUARDAR');

-- CreateEnum
CREATE TYPE "UnidadeTempo" AS ENUM ('MINUTOS', 'HORAS', 'DIAS');

-- CreateTable
CREATE TABLE "cadencia_templates" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "gatilho" "CadenciaGatilho" NOT NULL DEFAULT 'MANUAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cadencia_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cadencia_passos" (
    "id" TEXT NOT NULL,
    "cadenciaId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipo" "TipoPasso" NOT NULL DEFAULT 'WHATSAPP',
    "titulo" TEXT,
    "conteudo" TEXT NOT NULL,
    "atrasoValor" INTEGER NOT NULL DEFAULT 0,
    "atrasoUnidade" "UnidadeTempo" NOT NULL DEFAULT 'DIAS',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cadencia_passos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cadencia_templates_gatilho_ativo_idx" ON "cadencia_templates"("gatilho", "ativo");

-- CreateIndex
CREATE INDEX "cadencia_passos_cadenciaId_ordem_idx" ON "cadencia_passos"("cadenciaId", "ordem");

-- AddForeignKey
ALTER TABLE "cadencia_passos" ADD CONSTRAINT "cadencia_passos_cadenciaId_fkey" FOREIGN KEY ("cadenciaId") REFERENCES "cadencia_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
