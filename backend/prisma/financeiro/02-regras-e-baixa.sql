-- CreateEnum
CREATE TYPE "EscopoRegra" AS ENUM ('RECEITA', 'DESPESA', 'AMBOS');
-- AlterTable
ALTER TABLE "fin_lancamentos" ADD COLUMN     "dataEmissao" TIMESTAMP(3),
ADD COLUMN     "dataPagamento" TIMESTAMP(3),
ADD COLUMN     "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jurosCentavos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "multaCentavos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numeroDocumento" TEXT,
ADD COLUMN     "vencimento" TIMESTAMP(3);
-- CreateTable
CREATE TABLE "fin_regras" (
    "id" TEXT NOT NULL,
    "termo" TEXT NOT NULL,
    "escopo" "EscopoRegra" NOT NULL DEFAULT 'AMBOS',
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "categoriaId" TEXT,
    "unidadeId" TEXT,
    "marcaId" TEXT,
    "linhaServicoId" TEXT,
    "contaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_regras_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "fin_regras_ativo_prioridade_idx" ON "fin_regras"("ativo", "prioridade");
-- CreateIndex
CREATE INDEX "fin_lancamentos_status_vencimento_idx" ON "fin_lancamentos"("status", "vencimento");
