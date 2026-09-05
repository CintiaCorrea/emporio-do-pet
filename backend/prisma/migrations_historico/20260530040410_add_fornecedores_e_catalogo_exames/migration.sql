-- CreateEnum
CREATE TYPE "FornecedorTipo" AS ENUM ('LABORATORIO', 'PROFISSIONAL', 'PARCEIRO', 'OUTRO');

-- CreateEnum
CREATE TYPE "ModeloPagamento" AS ENUM ('LOTE_MENSAL', 'DIRETO_CLIENTE', 'REPASSE_VIA_CLINICA');

-- CreateEnum
CREATE TYPE "ComissaoTipo" AS ENUM ('PERCENTUAL', 'VALOR_FIXO', 'VARIAVEL');

-- CreateEnum
CREATE TYPE "CategoriaExame" AS ENUM ('HEMATOLOGIA', 'BIOQUIMICA', 'IMAGEM', 'CITOLOGIA', 'MICROBIOLOGIA', 'ENDOCRINOLOGIA', 'HISTOPATOLOGIA', 'OUTROS');

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "FornecedorTipo" NOT NULL DEFAULT 'LABORATORIO',
    "especialidade" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "contatoResponsavel" TEXT,
    "modeloPagamento" "ModeloPagamento" NOT NULL DEFAULT 'LOTE_MENSAL',
    "comissaoTipo" "ComissaoTipo",
    "comissaoValor" DOUBLE PRECISION,
    "diaFechamentoLote" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_exames" (
    "id" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "codigo" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" "CategoriaExame" NOT NULL DEFAULT 'OUTROS',
    "valorFornecedor" DOUBLE PRECISION,
    "valorClienteSugerido" DOUBLE PRECISION,
    "tempoResultadoDias" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_exames_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fornecedores_tipo_ativo_idx" ON "fornecedores"("tipo", "ativo");

-- CreateIndex
CREATE INDEX "catalogo_exames_fornecedorId_ativo_idx" ON "catalogo_exames"("fornecedorId", "ativo");

-- CreateIndex
CREATE INDEX "catalogo_exames_categoria_ativo_idx" ON "catalogo_exames"("categoria", "ativo");

-- AddForeignKey
ALTER TABLE "catalogo_exames" ADD CONSTRAINT "catalogo_exames_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
