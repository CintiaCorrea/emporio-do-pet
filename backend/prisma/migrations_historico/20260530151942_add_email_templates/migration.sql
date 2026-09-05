-- CreateEnum
CREATE TYPE "CategoriaEmail" AS ENUM ('TRANSACIONAL', 'BOAS_VINDAS', 'EDUCATIVO', 'PROMOCIONAL', 'ANIVERSARIO', 'REENGAJAMENTO', 'OUTRO');

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpoHtml" TEXT NOT NULL,
    "corpoTexto" TEXT,
    "categoria" "CategoriaEmail" NOT NULL DEFAULT 'TRANSACIONAL',
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "vezesEnviado" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_variables" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "descricao" TEXT,
    "exemplo" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'Geral',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_variables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_templates_categoria_ativo_idx" ON "email_templates"("categoria", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "email_variables_chave_key" ON "email_variables"("chave");

-- CreateIndex
CREATE INDEX "email_variables_categoria_ativo_idx" ON "email_variables"("categoria", "ativo");
