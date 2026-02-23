-- =====================================================
-- Script: Criar Tabelas de AI Agents
-- Empório do Pet - AI Agents Feature
-- 
-- Este script cria todas as tabelas necessárias para
-- a feature de AI Agents, incluindo enums, índices e
-- foreign keys.
--
-- Uso:
--   psql -h localhost -p 5433 -U emporio -d emporio_db -f create-ai-agents-tables.sql
-- =====================================================

-- Verificar se já existem (para evitar erros)
DO $$ 
BEGIN
    -- Criar enums apenas se não existirem
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aiprovider') THEN
        CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'GEMINI', 'DEEPSEEK');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agenttype') THEN
        CREATE TYPE "AgentType" AS ENUM ('CHATBOT', 'AUTOMATION', 'ASSISTANT', 'SCHEDULER');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agentstatus') THEN
        CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DRAFT', 'ERROR');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'templatecategory') THEN
        CREATE TYPE "TemplateCategory" AS ENUM ('ATENDIMENTO', 'VENDAS', 'MARKETING', 'SUPORTE', 'AGENDAMENTO', 'PERSONALIZADO');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'templatestatus') THEN
        CREATE TYPE "TemplateStatus" AS ENUM ('PUBLISHED', 'DRAFT', 'ARCHIVED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automationcategory') THEN
        CREATE TYPE "AutomationCategory" AS ENUM ('ATENDIMENTO', 'MARKETING', 'NOTIFICACAO', 'INTEGRACAO', 'AGENDAMENTO');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automationtrigger') THEN
        CREATE TYPE "AutomationTrigger" AS ENUM ('SCHEDULE', 'WEBHOOK', 'EVENT', 'MANUAL');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'executionstatus') THEN
        CREATE TYPE "ExecutionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING', 'RUNNING');
    END IF;
END $$;

-- =====================================================
-- Tabela: integration_settings
-- =====================================================
CREATE TABLE IF NOT EXISTS "integration_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappConfig" TEXT,
    "openaiConfig" TEXT,
    "geminiConfig" TEXT,
    "deepseekConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_settings_userId_key" ON "integration_settings"("userId");

-- =====================================================
-- Tabela: agent_templates (precisa existir antes de ai_agents)
-- =====================================================
CREATE TABLE IF NOT EXISTS "agent_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateCategory" NOT NULL DEFAULT 'PERSONALIZADO',
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provider" "AIProvider",
    "model" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agent_templates_userId_category_idx" ON "agent_templates"("userId", "category");
CREATE INDEX IF NOT EXISTS "agent_templates_status_idx" ON "agent_templates"("status");

-- =====================================================
-- Tabela: ai_agents
-- =====================================================
CREATE TABLE IF NOT EXISTS "ai_agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AgentType" NOT NULL DEFAULT 'CHATBOT',
    "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
    "provider" "AIProvider" NOT NULL DEFAULT 'OPENAI',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "systemPrompt" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "templateId" TEXT,
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_agents_userId_status_idx" ON "ai_agents"("userId", "status");
CREATE INDEX IF NOT EXISTS "ai_agents_type_idx" ON "ai_agents"("type");

-- =====================================================
-- Tabela: agent_executions
-- =====================================================
CREATE TABLE IF NOT EXISTS "agent_executions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "input" TEXT,
    "output" TEXT,
    "usage" JSONB,
    "latencyMs" INTEGER,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agent_executions_agentId_createdAt_idx" ON "agent_executions"("agentId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_executions_status_idx" ON "agent_executions"("status");

-- =====================================================
-- Tabela: automations
-- =====================================================
CREATE TABLE IF NOT EXISTS "automations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "AutomationCategory" NOT NULL DEFAULT 'ATENDIMENTO',
    "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
    "trigger" "AutomationTrigger" NOT NULL DEFAULT 'MANUAL',
    "triggerConfig" JSONB,
    "executions" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "automations_userId_status_idx" ON "automations"("userId", "status");
CREATE INDEX IF NOT EXISTS "automations_category_idx" ON "automations"("category");

-- =====================================================
-- Tabela: automation_steps
-- =====================================================
CREATE TABLE IF NOT EXISTS "automation_steps" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "automation_steps_automationId_position_key" ON "automation_steps"("automationId", "position");

-- =====================================================
-- Tabela: automation_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS "automation_logs" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "duration" INTEGER,
    "triggeredBy" TEXT,
    "stepsExecuted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "automation_logs_automationId_createdAt_idx" ON "automation_logs"("automationId", "createdAt");
CREATE INDEX IF NOT EXISTS "automation_logs_status_idx" ON "automation_logs"("status");

-- =====================================================
-- Foreign Keys (apenas se as tabelas existirem)
-- =====================================================

-- integration_settings -> User
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'integration_settings_userId_fkey'
    ) THEN
        ALTER TABLE "integration_settings" 
        ADD CONSTRAINT "integration_settings_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Tabela User não existe, pulando FK integration_settings_userId_fkey';
END $$;

-- agent_templates -> User
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'agent_templates_userId_fkey'
    ) THEN
        ALTER TABLE "agent_templates" 
        ADD CONSTRAINT "agent_templates_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Tabela User não existe, pulando FK agent_templates_userId_fkey';
END $$;

-- ai_agents -> User
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_agents_userId_fkey'
    ) THEN
        ALTER TABLE "ai_agents" 
        ADD CONSTRAINT "ai_agents_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Tabela User não existe, pulando FK ai_agents_userId_fkey';
END $$;

-- ai_agents -> agent_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_agents_templateId_fkey'
    ) THEN
        ALTER TABLE "ai_agents" 
        ADD CONSTRAINT "ai_agents_templateId_fkey" 
        FOREIGN KEY ("templateId") REFERENCES "agent_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- agent_executions -> ai_agents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'agent_executions_agentId_fkey'
    ) THEN
        ALTER TABLE "agent_executions" 
        ADD CONSTRAINT "agent_executions_agentId_fkey" 
        FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- automations -> User
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'automations_userId_fkey'
    ) THEN
        ALTER TABLE "automations" 
        ADD CONSTRAINT "automations_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Tabela User não existe, pulando FK automations_userId_fkey';
END $$;

-- automations -> ai_agents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'automations_agentId_fkey'
    ) THEN
        ALTER TABLE "automations" 
        ADD CONSTRAINT "automations_agentId_fkey" 
        FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- automation_steps -> automations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'automation_steps_automationId_fkey'
    ) THEN
        ALTER TABLE "automation_steps" 
        ADD CONSTRAINT "automation_steps_automationId_fkey" 
        FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- automation_logs -> automations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'automation_logs_automationId_fkey'
    ) THEN
        ALTER TABLE "automation_logs" 
        ADD CONSTRAINT "automation_logs_automationId_fkey" 
        FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- =====================================================
-- Verificação Final
-- =====================================================
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'integration_settings',
        'ai_agents',
        'agent_templates',
        'agent_executions',
        'automations',
        'automation_steps',
        'automation_logs'
    );
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'AI Agents Tables Created: % of 7', table_count;
    RAISE NOTICE '=====================================================';
    
    IF table_count = 7 THEN
        RAISE NOTICE 'SUCCESS: Todas as tabelas de AI Agents foram criadas!';
    ELSE
        RAISE NOTICE 'WARNING: Algumas tabelas podem estar faltando.';
    END IF;
END $$;

SELECT 'Migration AI Agents concluída com sucesso!' as status;
