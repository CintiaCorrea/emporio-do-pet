CREATE TABLE "appointment_items" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "servicoId" TEXT,
  "descricao" TEXT,
  "executorUserId" TEXT,
  "fornecedorId" TEXT,
  "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "valorUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "custoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "comissaoBase" TEXT,
  "comissaoTipo" TEXT,
  "comissaoValor" DOUBLE PRECISION,
  "comissaoCalculada" DOUBLE PRECISION,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "appointment_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "appointment_items_appointmentId_idx" ON "appointment_items"("appointmentId");
CREATE INDEX "appointment_items_servicoId_idx" ON "appointment_items"("servicoId");
CREATE INDEX "appointment_items_fornecedorId_idx" ON "appointment_items"("fornecedorId");

ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_servicoId_fkey"
  FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_executorUserId_fkey"
  FOREIGN KEY ("executorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_fornecedorId_fkey"
  FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
