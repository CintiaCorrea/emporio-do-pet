-- CreateTable
CREATE TABLE "script_categories" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "emoji" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "script_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_templates" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "descricao" TEXT,
    "variaveis" TEXT[],
    "categoryId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "vezesUsado" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "script_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "script_categories_nome_key" ON "script_categories"("nome");

-- CreateIndex
CREATE INDEX "script_templates_categoryId_ativo_idx" ON "script_templates"("categoryId", "ativo");

-- CreateIndex
CREATE INDEX "script_templates_ativo_ordem_idx" ON "script_templates"("ativo", "ordem");

-- AddForeignKey
ALTER TABLE "script_templates" ADD CONSTRAINT "script_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "script_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
