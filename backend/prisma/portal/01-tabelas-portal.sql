-- =====================================================================
-- Tabelas do PORTAL DO TUTOR (aplicar em producao ANTES/junto do deploy)
-- Gerado por: prisma migrate diff (main -> portal-integracao) em 05/08/2026.
-- 100% ADITIVO: 11 CREATE TABLE + indices + 1 FK (dietas->pets). Sem DROP.
-- COMO APLICAR (com backup na hora): rodar este arquivo inteiro; ele ja
-- esta dentro de BEGIN/COMMIT, entao ou entra tudo ou nada.
-- NUNCA usar `prisma db push` (schema tem drift). Ver memoria backup-banco-offsite.
-- =====================================================================
BEGIN;

-- CreateTable
CREATE TABLE "ptl_codigos" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "telefone8" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'ACESSO',
    "codigo_hash" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_codigos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_sessoes" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "revogada_em" TIMESTAMP(3),
    "revogada_por" TEXT,
    "ultimo_acesso" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_acessos" (
    "id" TEXT NOT NULL,
    "telefone8" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "tutor_id" TEXT,
    "detalhe" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_acessos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_alteracoes" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "entidade_nome" TEXT,
    "campo" TEXT NOT NULL,
    "valor_anterior" TEXT,
    "valor_novo" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_alteracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_agenda_config" (
    "id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "antecedencia_min_horas" INTEGER NOT NULL DEFAULT 12,
    "janela_dias" INTEGER NOT NULL DEFAULT 30,
    "prazo_cancelar_horas" INTEGER NOT NULL DEFAULT 24,
    "max_por_dia" INTEGER NOT NULL DEFAULT 2,
    "desmarcacoes_para_taxa" INTEGER NOT NULL DEFAULT 2,
    "taxa_centavos" INTEGER NOT NULL DEFAULT 0,
    "mensagem_travado" TEXT,
    "atualizado_por" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_agenda_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_agenda_servico" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "duracao_min" INTEGER NOT NULL DEFAULT 30,
    "agendas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "restricao" TEXT NOT NULL DEFAULT 'TODOS',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "responsavel_user_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_agenda_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_agendamentos" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "agenda_id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "duracao_min" INTEGER NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'MARCADO',
    "desmarcado_em" TIMESTAMP(3),
    "remarcado_para_id" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_liberacoes" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "liberado_por" TEXT,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_liberacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietas" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "tutorId" TEXT,
    "prescritorNome" TEXT,
    "prescritorUserId" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "itens" JSONB NOT NULL DEFAULT '[]',
    "variacoes" JSONB NOT NULL DEFAULT '[]',
    "evitar" JSONB NOT NULL DEFAULT '[]',
    "observacao" TEXT,
    "anexoKey" TEXT,
    "anexoNome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dietas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_push" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "ultimo_envio" TIMESTAMP(3),
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_push_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptl_push_enviados" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "titulo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptl_push_enviados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ptl_codigos_telefone8_idx" ON "ptl_codigos"("telefone8");

-- CreateIndex
CREATE INDEX "ptl_codigos_expira_em_idx" ON "ptl_codigos"("expira_em");

-- CreateIndex
CREATE INDEX "ptl_codigos_created_at_idx" ON "ptl_codigos"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ptl_sessoes_token_hash_key" ON "ptl_sessoes"("token_hash");

-- CreateIndex
CREATE INDEX "ptl_sessoes_tutor_id_idx" ON "ptl_sessoes"("tutor_id");

-- CreateIndex
CREATE INDEX "ptl_sessoes_expira_em_idx" ON "ptl_sessoes"("expira_em");

-- CreateIndex
CREATE INDEX "ptl_acessos_telefone8_idx" ON "ptl_acessos"("telefone8");

-- CreateIndex
CREATE INDEX "ptl_acessos_created_at_idx" ON "ptl_acessos"("created_at");

-- CreateIndex
CREATE INDEX "ptl_acessos_tutor_id_idx" ON "ptl_acessos"("tutor_id");

-- CreateIndex
CREATE INDEX "ptl_alteracoes_tutor_id_idx" ON "ptl_alteracoes"("tutor_id");

-- CreateIndex
CREATE INDEX "ptl_alteracoes_entidade_entidade_id_idx" ON "ptl_alteracoes"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "ptl_alteracoes_created_at_idx" ON "ptl_alteracoes"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ptl_agenda_servico_tipo_key" ON "ptl_agenda_servico"("tipo");

-- CreateIndex
CREATE INDEX "ptl_agenda_servico_ativo_idx" ON "ptl_agenda_servico"("ativo");

-- CreateIndex
CREATE INDEX "ptl_agendamentos_tutor_id_created_at_idx" ON "ptl_agendamentos"("tutor_id", "created_at");

-- CreateIndex
CREATE INDEX "ptl_agendamentos_appointment_id_idx" ON "ptl_agendamentos"("appointment_id");

-- CreateIndex
CREATE INDEX "ptl_agendamentos_situacao_inicio_idx" ON "ptl_agendamentos"("situacao", "inicio");

-- CreateIndex
CREATE INDEX "ptl_liberacoes_tutor_id_created_at_idx" ON "ptl_liberacoes"("tutor_id", "created_at");

-- CreateIndex
CREATE INDEX "dietas_petId_data_idx" ON "dietas"("petId", "data");

-- CreateIndex
CREATE INDEX "dietas_petId_ativa_idx" ON "dietas"("petId", "ativa");

-- CreateIndex
CREATE UNIQUE INDEX "ptl_push_endpoint_key" ON "ptl_push"("endpoint");

-- CreateIndex
CREATE INDEX "ptl_push_tutor_id_idx" ON "ptl_push"("tutor_id");

-- CreateIndex
CREATE UNIQUE INDEX "ptl_push_enviados_tutor_id_assunto_key" ON "ptl_push_enviados"("tutor_id", "assunto");

-- AddForeignKey
ALTER TABLE "dietas" ADD CONSTRAINT "dietas_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
