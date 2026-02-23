# Migrations - AI Agents + WhatsApp

Este documento contém as instruções para aplicar as migrations dos modelos de AI Agents e WhatsApp no banco de dados.

## Tabelas Criadas

### Migration 1: AI Agents (`20260130120000_add_ai_agents_models`)

| Tabela | Descrição |
|--------|-----------|
| `integration_settings` | Configurações de integrações (OpenAI, Gemini, DeepSeek, WhatsApp) |
| `ai_agents` | Agentes de IA configuráveis |
| `agent_templates` | Templates de prompts reutilizáveis |
| `agent_executions` | Log de execuções dos agentes |
| `automations` | Fluxos de automação |
| `automation_steps` | Passos individuais de cada automação |
| `automation_logs` | Log de execuções das automações |

### Migration 2: WhatsApp + Notificações (`20260211120000_add_whatsapp_and_notifications`)

| Tabela | Descrição |
|--------|-----------|
| `whatsapp_conversations` | Conversas com contatos do WhatsApp |
| `whatsapp_messages` | Mensagens individuais (inbound/outbound) |
| `whatsapp_campaigns` | Campanhas de envio em massa |
| `whatsapp_campaign_recipients` | Destinatários de campanhas |
| `notifications` | Notificações do sistema (in-app, email, whatsapp, push) |

## Enums Criados

### AI Agents
- `AIProvider`: OPENAI, GEMINI, DEEPSEEK
- `AgentType`: CHATBOT, AUTOMATION, ASSISTANT, SCHEDULER
- `AgentStatus`: ACTIVE, PAUSED, DRAFT, ERROR
- `TemplateCategory`: ATENDIMENTO, VENDAS, MARKETING, SUPORTE, AGENDAMENTO, PERSONALIZADO
- `TemplateStatus`: PUBLISHED, DRAFT, ARCHIVED
- `AutomationCategory`: ATENDIMENTO, MARKETING, NOTIFICACAO, INTEGRACAO, AGENDAMENTO
- `AutomationTrigger`: SCHEDULE, WEBHOOK, EVENT, MANUAL
- `ExecutionStatus`: SUCCESS, FAILED, PENDING, RUNNING

### WhatsApp
- `WhatsAppMessageType`: TEXT, IMAGE, DOCUMENT, AUDIO, VIDEO, LOCATION, TEMPLATE, INTERACTIVE, BUTTON, STICKER, CONTACTS
- `WhatsAppMessageStatus`: PENDING, SENT, DELIVERED, READ, FAILED
- `WhatsAppMessageDirection`: INBOUND, OUTBOUND
- `WhatsAppConversationStatus`: OPEN, CLOSED, PENDING, ASSIGNED
- `WhatsAppCampaignStatus`: DRAFT, SCHEDULED, RUNNING, COMPLETED, FAILED, PAUSED

### Notificações
- `NotificationType`: INFO, SUCCESS, WARNING, ERROR, ALERT, WHATSAPP_MESSAGE, APPOINTMENT_REMINDER, AUTOMATION_COMPLETE, CAMPAIGN_COMPLETE
- `NotificationChannel`: IN_APP, EMAIL, WHATSAPP, PUSH

---

## Opção 1: Aplicar via Prisma (Recomendado)

### Para o Backend (NestJS)

```bash
cd backend

# Verificar se as migrations estão pendentes
npx prisma migrate status

# Aplicar todas as migrations pendentes
npx prisma migrate deploy

# Gerar o Prisma Client
npx prisma generate
```

### Para o Frontend (Next.js/vet-crm)

```bash
cd vet-crm

# Verificar se as migrations estão pendentes
npx prisma migrate status

# Aplicar todas as migrations pendentes
npx prisma migrate deploy

# Gerar o Prisma Client
npx prisma generate
```

---

## Opção 2: Aplicar SQL Diretamente

Se preferir aplicar diretamente no banco de dados PostgreSQL:

```bash
# Conectar ao banco de dados
psql -h localhost -p 5433 -U emporio -d emporio_db

# Executar migration 1 (AI Agents)
\i backend/prisma/migrations/20260130120000_add_ai_agents_models/migration.sql

# Executar migration 2 (WhatsApp + Notifications)
\i backend/prisma/migrations/20260211120000_add_whatsapp_and_notifications/migration.sql
```

---

## Opção 3: Sincronização Forçada (Desenvolvimento)

⚠️ **CUIDADO**: Use apenas em ambiente de desenvolvimento!

```bash
cd backend
npx prisma db push --accept-data-loss
npx prisma generate
```

```bash
cd vet-crm
npx prisma db push --accept-data-loss
npx prisma generate
```

---

## Verificação

Após aplicar as migrations, verifique se todas as tabelas foram criadas:

```sql
-- No psql ou cliente SQL
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'integration_settings',
  'ai_agents',
  'agent_templates',
  'agent_executions',
  'automations',
  'automation_steps',
  'automation_logs',
  'whatsapp_conversations',
  'whatsapp_messages',
  'whatsapp_campaigns',
  'whatsapp_campaign_recipients',
  'notifications'
);
```

Resultado esperado: **12 linhas** (uma para cada tabela).

---

## Rollback

### Rollback Migration 2 (WhatsApp + Notifications)

```sql
-- Remover foreign keys
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_userId_fkey";
ALTER TABLE "whatsapp_campaign_recipients" DROP CONSTRAINT IF EXISTS "whatsapp_campaign_recipients_campaignId_fkey";
ALTER TABLE "whatsapp_campaigns" DROP CONSTRAINT IF EXISTS "whatsapp_campaigns_userId_fkey";
ALTER TABLE "whatsapp_messages" DROP CONSTRAINT IF EXISTS "whatsapp_messages_conversationId_fkey";
ALTER TABLE "whatsapp_conversations" DROP CONSTRAINT IF EXISTS "whatsapp_conversations_tutorId_fkey";
ALTER TABLE "whatsapp_conversations" DROP CONSTRAINT IF EXISTS "whatsapp_conversations_assignedAgentId_fkey";
ALTER TABLE "whatsapp_conversations" DROP CONSTRAINT IF EXISTS "whatsapp_conversations_userId_fkey";

-- Remover tabelas
DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "whatsapp_campaign_recipients";
DROP TABLE IF EXISTS "whatsapp_campaigns";
DROP TABLE IF EXISTS "whatsapp_messages";
DROP TABLE IF EXISTS "whatsapp_conversations";

-- Remover enums
DROP TYPE IF EXISTS "NotificationChannel";
DROP TYPE IF EXISTS "NotificationType";
DROP TYPE IF EXISTS "WhatsAppCampaignStatus";
DROP TYPE IF EXISTS "WhatsAppConversationStatus";
DROP TYPE IF EXISTS "WhatsAppMessageDirection";
DROP TYPE IF EXISTS "WhatsAppMessageStatus";
DROP TYPE IF EXISTS "WhatsAppMessageType";
```

### Rollback Migration 1 (AI Agents)

```sql
-- Remover foreign keys primeiro
ALTER TABLE "automation_logs" DROP CONSTRAINT IF EXISTS "automation_logs_automationId_fkey";
ALTER TABLE "automation_steps" DROP CONSTRAINT IF EXISTS "automation_steps_automationId_fkey";
ALTER TABLE "automations" DROP CONSTRAINT IF EXISTS "automations_agentId_fkey";
ALTER TABLE "automations" DROP CONSTRAINT IF EXISTS "automations_userId_fkey";
ALTER TABLE "agent_executions" DROP CONSTRAINT IF EXISTS "agent_executions_agentId_fkey";
ALTER TABLE "agent_templates" DROP CONSTRAINT IF EXISTS "agent_templates_userId_fkey";
ALTER TABLE "ai_agents" DROP CONSTRAINT IF EXISTS "ai_agents_templateId_fkey";
ALTER TABLE "ai_agents" DROP CONSTRAINT IF EXISTS "ai_agents_userId_fkey";
ALTER TABLE "integration_settings" DROP CONSTRAINT IF EXISTS "integration_settings_userId_fkey";

-- Remover tabelas
DROP TABLE IF EXISTS "automation_logs";
DROP TABLE IF EXISTS "automation_steps";
DROP TABLE IF EXISTS "automations";
DROP TABLE IF EXISTS "agent_executions";
DROP TABLE IF EXISTS "ai_agents";
DROP TABLE IF EXISTS "agent_templates";
DROP TABLE IF EXISTS "integration_settings";

-- Remover enums
DROP TYPE IF EXISTS "ExecutionStatus";
DROP TYPE IF EXISTS "AutomationTrigger";
DROP TYPE IF EXISTS "AutomationCategory";
DROP TYPE IF EXISTS "TemplateStatus";
DROP TYPE IF EXISTS "TemplateCategory";
DROP TYPE IF EXISTS "AgentStatus";
DROP TYPE IF EXISTS "AgentType";
DROP TYPE IF EXISTS "AIProvider";
```

---

## Estrutura de Arquivos

```
backend/prisma/
├── migrations/
│   ├── 20260130120000_add_ai_agents_models/
│   │   └── migration.sql
│   ├── 20260211120000_add_whatsapp_and_notifications/
│   │   └── migration.sql
│   └── migration_lock.toml
└── schema.prisma

vet-crm/prisma/
├── migrations/
│   ├── ... (migrations anteriores)
│   └── migration_lock.toml
└── schema.prisma
```

---

## Próximos Passos

Após aplicar as migrations:

1. **Gerar Prisma Client**: `npx prisma generate` (em ambos os projetos)
2. **Reiniciar o servidor**: Os novos modelos estarão disponíveis
3. **Subir infraestrutura**: `docker-compose -f docker-compose.dev.yml up -d` (PostgreSQL + Redis + AI Service)
4. **Configurar WhatsApp**: Acessar `/dashboard/ai-agents/conexoes` e inserir as credenciais da Meta
5. **Configurar webhook no Meta**: Apontar para `{SUA_URL}/webhooks/whatsapp`
6. **Criar um AI Agent**: Acessar `/dashboard/ai-agents/agents` e configurar um agente
7. **Testar**: Enviar mensagem para o número WhatsApp configurado
