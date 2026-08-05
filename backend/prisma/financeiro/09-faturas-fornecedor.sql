-- 09 · Contas a pagar de fornecedor (geradas do Caixa)
-- Extraido cirurgicamente do prisma migrate diff — SOMENTE tabelas fin_.
-- Nao toca em nenhuma tabela do CRM/ERP. Refs ao CRM sao soltas (sem FK).

BEGIN;

CREATE TABLE "fin_faturas_fornecedor" (
    "id" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "fornecedorNome" TEXT NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "diaFechamento" INTEGER,
    "vencimento" TIMESTAMP(3),
    "totalCentavos" INTEGER NOT NULL DEFAULT 0,
    "qtdItens" INTEGER NOT NULL DEFAULT 0,
    "unidadeId" TEXT,
    "lancamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_faturas_fornecedor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fin_fatura_itens" (
    "id" TEXT NOT NULL,
    "faturaId" TEXT,
    "appointmentItemId" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "tipoFornecedor" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataServico" TIMESTAMP(3) NOT NULL,
    "custoCentavos" INTEGER NOT NULL,
    "lancamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_fatura_itens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fin_faturas_fornecedor_status_idx" ON "fin_faturas_fornecedor"("status");
CREATE UNIQUE INDEX "fin_faturas_fornecedor_fornecedorId_competencia_key" ON "fin_faturas_fornecedor"("fornecedorId", "competencia");
CREATE UNIQUE INDEX "fin_fatura_itens_appointmentItemId_key" ON "fin_fatura_itens"("appointmentItemId");
CREATE INDEX "fin_fatura_itens_fornecedorId_idx" ON "fin_fatura_itens"("fornecedorId");
CREATE INDEX "fin_fatura_itens_faturaId_idx" ON "fin_fatura_itens"("faturaId");

-- FK aponta SO para outra tabela fin_ (nao acopla ao CRM)
ALTER TABLE "fin_fatura_itens" ADD CONSTRAINT "fin_fatura_itens_faturaId_fkey"
  FOREIGN KEY ("faturaId") REFERENCES "fin_faturas_fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
