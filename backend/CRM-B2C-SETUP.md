# CRM B2C - Setup e Instruções

## 🚀 O que foi criado

Sistema completo de CRM B2C com insights preditivos, incluindo:

### Módulos

1. **Leads Module** (`/leads`)
   - CRUD completo de leads
   - Tracking de eventos comportamentais
   - Endpoints públicos para tracking
   - Filtros e paginação avançados

2. **Enrichment Module**
   - Análise de email (detecta descartáveis, valida domínio)
   - Análise comportamental (intenção de compra, padrões)
   - Worker BullMQ para processamento assíncrono

3. **Scoring Module**
   - 20+ regras de scoring configuráveis
   - Score explicável e auditável (breakdown)
   - Histórico de evolução do score

4. **Insights Module** (`/insights`)
   - 9 tipos de insights acionáveis
   - Priorização automática
   - Endpoints para gestão de insights

### Modelos de Dados (Prisma)

- `Lead` - Dados do lead com flags comportamentais
- `LeadEvent` - Eventos comportamentais
- `LeadEnrichment` - Dados enriquecidos
- `LeadScore` - Histórico de scores
- `LeadInsight` - Insights gerados
- `LeadHistory` - Auditoria de mudanças

---

## 📋 Para Finalizar a Instalação

### 1. Pausar o OneDrive (Importante!)

O erro `EPERM: operation not permitted` é causado pelo OneDrive travando arquivos.

1. Clique no ícone do OneDrive na bandeja do sistema
2. Clique em "Pausar sincronização" → "24 horas"
3. Aguarde alguns segundos

### 2. Gerar o Prisma Client

```bash
cd backend
npx prisma generate
```

### 3. Criar e Aplicar Migration

```bash
# Criar migration (vai pedir um nome)
npx prisma migrate dev --name add_crm_b2c_leads

# Ou aplicar direto em produção
npx prisma migrate deploy
```

### 4. Iniciar o Backend

```bash
pnpm run start:dev
```

---

## 🔌 Endpoints Disponíveis

### Públicos (Tracking)

```http
# Criar/atualizar lead via tracking
POST /leads/track
{
  "email": "joao@email.com",
  "name": "João Silva",
  "source": "INSTAGRAM",
  "device": "MOBILE"
}

# Registrar evento
POST /leads/track/event
{
  "email": "joao@email.com",
  "eventType": "pricing_view",
  "page": "/precos",
  "duration": 45
}
```

### Protegidos (JWT)

```http
# Listar leads
GET /leads?status=QUALIFIED&minScore=50&sortBy=currentScore

# Leads quentes
GET /leads/hot

# Leads com insights pendentes
GET /leads/with-insights

# Estatísticas
GET /leads/stats

# Buscar lead
GET /leads/:id

# Insights urgentes
GET /insights/urgent

# Todos os insights pendentes
GET /insights

# Dismissar insight
POST /insights/:id/dismiss

# Marcar insight como acionado
POST /insights/:id/act
```

---

## 📊 Tipos de Eventos

| Evento | Descrição |
|--------|-----------|
| `page_view` | Visualização de página |
| `pricing_view` | Visualização de página de preços |
| `checkout_start` | Início do checkout |
| `checkout_abandon` | Abandono de carrinho |
| `checkout_complete` | Compra concluída |
| `form_submit` | Submissão de formulário |
| `whatsapp_click` | Clique no WhatsApp |
| `contact_click` | Clique em contato |

---

## 🎯 Regras de Scoring (0-100)

### Pontos Positivos
- **+30** Iniciou checkout
- **+25** Visitou preços / Clicou WhatsApp
- **+20** Abandonou carrinho / Submeteu form
- **+15** Retornou em 24h / Ativo recentemente / Indicação
- **+10** Múltiplas sessões / Muitas páginas

### Pontos Negativos
- **-25** Email descartável
- **-15** Email alto risco / Inativo 30+ dias / Bounce rápido
- **-10** Inativo 14+ dias
- **-5** Apenas 1 página

---

## 💡 Tipos de Insights

| Tipo | Ação Recomendada |
|------|------------------|
| `HIGH_INTENT` | Abordar agora |
| `HOT_LEAD` | Ligar ou enviar proposta |
| `OFFER_DISCOUNT` | Enviar desconto (carrinho abandonado) |
| `SEND_WHATSAPP` | Contato via WhatsApp |
| `SEND_EMAIL` | Email no horário ideal |
| `CHURN_RISK` | Reativar com oferta |
| `REENGAGEMENT` | Campanha de reativação |
| `COLD_LEAD` | Nutrir com conteúdo |
| `NURTURE_CONTENT` | Material educativo |

---

## 🔧 Configurações Recomendadas

### Redis (para filas BullMQ)

O sistema usa seu Redis existente. Certifique-se de que está configurado no `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
# ou
REDIS_URL=redis://...
```

### Concorrência do Worker

O worker processa até 5 jobs simultâneos por padrão. Ajuste em `enrichment.processor.ts`:

```typescript
@Processor('lead-enrichment', {
  concurrency: 5, // Ajuste conforme necessário
})
```

---

## 📁 Estrutura de Arquivos

```
backend/src/modules/
├── leads/
│   ├── leads.module.ts
│   ├── leads.controller.ts
│   ├── leads.service.ts
│   └── dto/
├── enrichment/
│   ├── enrichment.module.ts
│   ├── enrichment.service.ts
│   ├── enrichment.processor.ts (BullMQ)
│   └── analyzers/
│       ├── email.analyzer.ts
│       └── behavior.analyzer.ts
├── scoring/
│   ├── scoring.module.ts
│   ├── scoring.service.ts
│   └── rules/
│       ├── base.rule.ts
│       └── index.ts (20+ regras)
└── insights/
    ├── insights.module.ts
    ├── insights.controller.ts
    ├── insights.service.ts
    └── generators/
        ├── base.generator.ts
        └── index.ts (9 geradores)
```

---

## 🚀 Próximos Passos

1. **Frontend**: Criar dashboard de leads com insights
2. **Webhooks**: Integrar com WhatsApp Business API
3. **Automações**: Disparar ações baseadas em insights
4. **ML futuro**: Estrutura preparada para ML supervisionado
