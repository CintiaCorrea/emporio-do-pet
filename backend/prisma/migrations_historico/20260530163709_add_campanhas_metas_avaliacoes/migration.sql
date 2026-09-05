-- Enums Campanha
CREATE TYPE "PlataformaCampanha" AS ENUM ('GOOGLE_ADS', 'META_ADS_FACEBOOK', 'META_ADS_INSTAGRAM', 'TIKTOK_ADS', 'OUTRAS');
CREATE TYPE "TipoCampanha" AS ENUM ('CONVERSAO', 'TRAFEGO', 'ENGAJAMENTO', 'MENSAGEM_WHATSAPP', 'RECONHECIMENTO');
CREATE TYPE "StatusCampanha" AS ENUM ('ATIVA', 'PAUSADA', 'ENCERRADA', 'EM_TESTE', 'PLANEJADA');

-- Enums Meta
CREATE TYPE "TipoMeta" AS ENUM ('FATURAMENTO_GERAL', 'FATURAMENTO_INDIVIDUAL', 'ATENDIMENTOS', 'SERVICO_ESPECIFICO', 'CONVERSOES', 'NPS');
CREATE TYPE "PeriodicidadeMeta" AS ENUM ('SEMANAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');
CREATE TYPE "StatusMeta" AS ENUM ('EM_ANDAMENTO', 'ATINGIDA', 'NAO_ATINGIDA');

-- Enums Avaliações
CREATE TYPE "CategoriaAlvoNPS" AS ENUM ('VET', 'RECEPCAO', 'CLINICA_GERAL');
CREATE TYPE "ClassificacaoNPS" AS ENUM ('PROMOTOR', 'NEUTRO', 'DETRATOR');
CREATE TYPE "CanalColetaNPS" AS ENUM ('PRESENCIAL', 'WHATSAPP', 'EMAIL', 'TELEFONE', 'FORMULARIO');
CREATE TYPE "StatusAvaliacaoGoogle" AS ENUM ('PERGUNTA_ENVIADA', 'NAO_GOSTOU', 'LINK_ENVIADO', 'VOTOU', 'NAO_VOTOU', 'CANCELADO');

CREATE TABLE "campanhas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plataforma" "PlataformaCampanha" NOT NULL DEFAULT 'OUTRAS',
    "tipo" "TipoCampanha" NOT NULL DEFAULT 'CONVERSAO',
    "tagOrigem" TEXT,
    "inicio" DATE,
    "fim" DATE,
    "status" "StatusCampanha" NOT NULL DEFAULT 'ATIVA',
    "investimento" DOUBLE PRECISION,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "campanhas_status_plataforma_idx" ON "campanhas"("status", "plataforma");

CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMeta" NOT NULL,
    "periodicidade" "PeriodicidadeMeta" NOT NULL DEFAULT 'MENSAL',
    "profissionalId" TEXT,
    "servicoId" TEXT,
    "dataInicio" DATE NOT NULL,
    "valorMeta" DOUBLE PRECISION NOT NULL,
    "valorRealizado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusMeta" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "metas_tipo_status_idx" ON "metas"("tipo", "status");
CREATE INDEX "metas_dataInicio_idx" ON "metas"("dataInicio");

CREATE TABLE "avaliacoes_nps" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT,
    "petId" TEXT,
    "atendimentoId" TEXT,
    "categoriaAlvo" "CategoriaAlvoNPS" NOT NULL,
    "profissionalId" TEXT,
    "score" INTEGER NOT NULL,
    "classificacao" "ClassificacaoNPS" NOT NULL,
    "comentario" TEXT,
    "canalColeta" "CanalColetaNPS" NOT NULL DEFAULT 'PRESENCIAL',
    "dataColeta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coletadoPor" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "avaliacoes_nps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "avaliacoes_nps_dataColeta_idx" ON "avaliacoes_nps"("dataColeta");
CREATE INDEX "avaliacoes_nps_classificacao_idx" ON "avaliacoes_nps"("classificacao");

CREATE TABLE "avaliacoes_google" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT,
    "petId" TEXT,
    "atendimentoId" TEXT,
    "profissionalId" TEXT,
    "coletadoPor" TEXT,
    "dataPergunta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gostou" BOOLEAN,
    "comentarioNegativo" TEXT,
    "canalEnvio" TEXT,
    "dataEnvioLink" TIMESTAMP(3),
    "linkEnviado" TEXT,
    "dataVoto" TIMESTAMP(3),
    "notaDada" INTEGER,
    "votoConfirmado" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusAvaliacaoGoogle" NOT NULL DEFAULT 'PERGUNTA_ENVIADA',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "avaliacoes_google_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "avaliacoes_google_status_idx" ON "avaliacoes_google"("status");
CREATE INDEX "avaliacoes_google_dataPergunta_idx" ON "avaliacoes_google"("dataPergunta");
