-- CreateTable
CREATE TABLE "fin_taxas_contratadas" (
    "id" TEXT NOT NULL,
    "bandeira" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "forma" TEXT NOT NULL,
    "parcelas" INTEGER NOT NULL,
    "aliquotaBps" INTEGER NOT NULL,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_taxas_contratadas_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fin_vendas_cartao" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "brutoCentavos" INTEGER NOT NULL,
    "liquidoCentavos" INTEGER NOT NULL,
    "taxaCentavos" INTEGER NOT NULL,
    "taxaBps" INTEGER NOT NULL,
    "planoExtrato" TEXT,
    "bandeira" TEXT,
    "forma" TEXT,
    "parcelas" INTEGER,
    "plano" TEXT,
    "unidadeId" TEXT,
    "origem" "OrigemDado" NOT NULL DEFAULT 'FINPET',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_vendas_cartao_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "fin_taxas_contratadas_vigenciaInicio_idx" ON "fin_taxas_contratadas"("vigenciaInicio");
-- CreateIndex
CREATE INDEX "fin_taxas_contratadas_bandeira_forma_parcelas_idx" ON "fin_taxas_contratadas"("bandeira", "forma", "parcelas");
-- CreateIndex
CREATE INDEX "fin_vendas_cartao_data_idx" ON "fin_vendas_cartao"("data");
-- CreateIndex
CREATE UNIQUE INDEX "fin_vendas_cartao_origem_externalId_key" ON "fin_vendas_cartao"("origem", "externalId");
