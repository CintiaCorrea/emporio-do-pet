-- CreateEnum
CREATE TYPE "FrequenciaRecorrencia" AS ENUM ('MENSAL', 'SEMANAL', 'ANUAL');
-- AlterTable
ALTER TABLE "fin_lancamentos" ADD COLUMN     "recorrenciaId" TEXT;
-- CreateTable
CREATE TABLE "fin_recorrencias" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "frequencia" "FrequenciaRecorrencia" NOT NULL DEFAULT 'MENSAL',
    "dia" INTEGER NOT NULL,
    "mesReferencia" INTEGER,
    "antecedenciaDias" INTEGER NOT NULL DEFAULT 30,
    "terminaEm" TIMESTAMP(3),
    "maxOcorrencias" INTEGER,
    "geradas" INTEGER NOT NULL DEFAULT 0,
    "ultimoVencimentoGerado" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "categoriaId" TEXT,
    "contaId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "marcaId" TEXT,
    "linhaServicoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_recorrencias_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "fin_recorrencias_ativo_idx" ON "fin_recorrencias"("ativo");
-- CreateIndex
CREATE UNIQUE INDEX "fin_lancamentos_recorrenciaId_vencimento_key" ON "fin_lancamentos"("recorrenciaId", "vencimento");
