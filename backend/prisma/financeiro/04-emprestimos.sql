-- CreateTable
CREATE TABLE "fin_emprestimos_internos" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidadeTomadoraId" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "contaOrigemId" TEXT,
    "contaDestinoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_emprestimos_internos_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fin_parcelas_emprestimo" (
    "id" TEXT NOT NULL,
    "emprestimoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" TIMESTAMP(3),
    "lancamentoId" TEXT,

    CONSTRAINT "fin_parcelas_emprestimo_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "fin_emprestimos_internos_unidadeTomadoraId_idx" ON "fin_emprestimos_internos"("unidadeTomadoraId");
-- CreateIndex
CREATE INDEX "fin_parcelas_emprestimo_pago_vencimento_idx" ON "fin_parcelas_emprestimo"("pago", "vencimento");
-- CreateIndex
CREATE UNIQUE INDEX "fin_parcelas_emprestimo_emprestimoId_numero_key" ON "fin_parcelas_emprestimo"("emprestimoId", "numero");
-- AddForeignKey
ALTER TABLE "fin_parcelas_emprestimo" ADD CONSTRAINT "fin_parcelas_emprestimo_emprestimoId_fkey" FOREIGN KEY ("emprestimoId") REFERENCES "fin_emprestimos_internos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
