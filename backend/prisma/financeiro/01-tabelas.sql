-- CreateEnum
CREATE TYPE "TipoUnidade" AS ENUM ('PROPRIA', 'PARCERIA');
-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('RECEITA', 'DESPESA', 'TRANSFERENCIA');
-- CreateEnum
CREATE TYPE "NaturezaCategoria" AS ENUM ('OPERACIONAL', 'INVESTIMENTO', 'FINANCIAMENTO', 'NAO_OPERACIONAL');
-- CreateEnum
CREATE TYPE "ComportamentoCusto" AS ENUM ('FIXO', 'VARIAVEL', 'NAO_APLICAVEL');
-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('RECEITA', 'DESPESA', 'TRANSFERENCIA');
-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'CONCILIADO');
-- CreateEnum
CREATE TYPE "OrigemDado" AS ENUM ('MEU_DINHEIRO', 'SIMPLESVET', 'FINPET', 'MANUAL', 'CRM');
-- CreateTable
CREATE TABLE "fin_unidades" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoUnidade" NOT NULL DEFAULT 'PROPRIA',
    "cidade" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "percentualNos" DECIMAL(5,4),
    "marcaPadraoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_unidades_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fin_marcas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_marcas_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fin_linhas_servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_linhas_servico_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fin_grupos_categoria" (
    "id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_grupos_categoria_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fin_categorias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "subgrupo" TEXT,
    "tipo" "TipoCategoria" NOT NULL,
    "natureza" "NaturezaCategoria" NOT NULL DEFAULT 'OPERACIONAL',
    "comportamento" "ComportamentoCusto" NOT NULL DEFAULT 'NAO_APLICAVEL',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "codigoContabil" TEXT,
    "grupoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_categorias_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fin_contas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "unidadeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_contas_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fin_lancamentos" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "status" "StatusLancamento" NOT NULL DEFAULT 'CONFIRMADO',
    "descricao" TEXT,
    "valorCentavos" INTEGER NOT NULL,
    "origem" "OrigemDado" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "unidadeId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "linhaServicoId" TEXT,
    "marcaId" TEXT,
    "contaId" TEXT NOT NULL,
    "contaDestinoId" TEXT,
    "tutorId" TEXT,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_lancamentos_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fin_faturamentos_bruto" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "brutoCentavos" INTEGER NOT NULL,
    "taxaCartaoCentavos" INTEGER NOT NULL DEFAULT 0,
    "parceiraCentavos" INTEGER NOT NULL DEFAULT 0,
    "nosCentavos" INTEGER NOT NULL,
    "lancamentoLiquidoId" TEXT,
    "origem" "OrigemDado" NOT NULL DEFAULT 'FINPET',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_faturamentos_bruto_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "fin_unidades_tipo_idx" ON "fin_unidades"("tipo");
-- CreateIndex
CREATE UNIQUE INDEX "fin_marcas_nome_key" ON "fin_marcas"("nome");
-- CreateIndex
CREATE UNIQUE INDEX "fin_linhas_servico_nome_key" ON "fin_linhas_servico"("nome");
-- CreateIndex
CREATE UNIQUE INDEX "fin_grupos_categoria_nome_key" ON "fin_grupos_categoria"("nome");
-- CreateIndex
CREATE INDEX "fin_categorias_tipo_natureza_idx" ON "fin_categorias"("tipo", "natureza");
-- CreateIndex
CREATE UNIQUE INDEX "fin_categorias_grupoId_nome_key" ON "fin_categorias"("grupoId", "nome");
-- CreateIndex
CREATE INDEX "fin_lancamentos_competencia_idx" ON "fin_lancamentos"("competencia");
-- CreateIndex
CREATE INDEX "fin_lancamentos_unidadeId_competencia_idx" ON "fin_lancamentos"("unidadeId", "competencia");
-- CreateIndex
CREATE INDEX "fin_lancamentos_categoriaId_idx" ON "fin_lancamentos"("categoriaId");
-- CreateIndex
CREATE UNIQUE INDEX "fin_lancamentos_origem_externalId_key" ON "fin_lancamentos"("origem", "externalId");
-- CreateIndex
CREATE INDEX "fin_faturamentos_bruto_unidadeId_competencia_idx" ON "fin_faturamentos_bruto"("unidadeId", "competencia");
-- CreateIndex
CREATE UNIQUE INDEX "fin_faturamentos_bruto_origem_externalId_key" ON "fin_faturamentos_bruto"("origem", "externalId");
-- AddForeignKey
ALTER TABLE "fin_unidades" ADD CONSTRAINT "fin_unidades_marcaPadraoId_fkey" FOREIGN KEY ("marcaPadraoId") REFERENCES "fin_marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "fin_categorias" ADD CONSTRAINT "fin_categorias_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "fin_grupos_categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "fin_contas" ADD CONSTRAINT "fin_contas_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "fin_unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "fin_unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "fin_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_linhaServicoId_fkey" FOREIGN KEY ("linhaServicoId") REFERENCES "fin_linhas_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "fin_marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "fin_contas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "fin_faturamentos_bruto" ADD CONSTRAINT "fin_faturamentos_bruto_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "fin_unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
