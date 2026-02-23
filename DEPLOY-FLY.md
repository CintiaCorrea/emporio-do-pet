# Deploy no Fly.io - Empório do Pet

Este guia detalha o deploy completo da aplicação no Fly.io.

## Pré-requisitos

1. Instalar Fly CLI:
```bash
# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Linux/macOS
curl -L https://fly.io/install.sh | sh
```

2. Login no Fly.io:
```bash
fly auth login
```

---

## 1. Criar o Banco de Dados PostgreSQL

```bash
# Criar cluster Postgres (região São Paulo)
fly postgres create --name emporio-pet-db --region gru --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1

# IMPORTANTE: Anote a connection string que será exibida!
# Formato: postgres://postgres:SENHA@emporio-pet-db.flycast:5432/postgres
```

Após criar, você receberá:
- **Username**: postgres
- **Password**: (gerada automaticamente)
- **Hostname**: emporio-pet-db.flycast
- **Proxy port**: 5432
- **Connection string**: postgres://postgres:SENHA@emporio-pet-db.flycast:5432

---

## 2. Criar o Redis (Upstash)

O Fly.io recomenda usar Upstash Redis:

```bash
# Criar Redis via Fly (usa Upstash por baixo)
fly redis create --name emporio-pet-redis --region gru
```

Ou crie diretamente no [Upstash Console](https://console.upstash.com/):
1. Crie uma conta em upstash.com
2. Crie um novo Redis database
3. Selecione região "South America (São Paulo)"
4. Copie a connection string no formato: `redis://default:SENHA@HOST:PORT`

---

## 3. Deploy do AI Service (FastAPI)

```bash
# Entrar no diretório
cd ai-service

# Criar o app no Fly (primeira vez apenas)
fly apps create emporio-pet-ai --org personal

# Configurar secrets (variáveis de ambiente sensíveis)
fly secrets set OPENAI_API_KEY="sk-sua-chave-openai" --app emporio-pet-ai
fly secrets set GOOGLE_API_KEY="sua-chave-google" --app emporio-pet-ai
fly secrets set DEEPSEEK_API_KEY="sua-chave-deepseek" --app emporio-pet-ai

# Deploy
fly deploy --app emporio-pet-ai

# Verificar status
fly status --app emporio-pet-ai
fly logs --app emporio-pet-ai
```

**URL do AI Service**: `https://emporio-pet-ai.fly.dev`

---

## 4. Deploy do Backend (NestJS)

```bash
# Entrar no diretório
cd backend

# Criar o app no Fly (primeira vez apenas)
fly apps create emporio-pet-api --org personal

# Attach do Postgres ao Backend (cria automaticamente DATABASE_URL)
fly postgres attach emporio-pet-db --app emporio-pet-api

# Configurar secrets
fly secrets set JWT_SECRET="seu-jwt-secret-super-seguro-minimo-32-caracteres" --app emporio-pet-api
fly secrets set OPENAI_API_KEY="sk-sua-chave-openai" --app emporio-pet-api
fly secrets set AI_SERVICE_URL="https://emporio-pet-ai.fly.dev" --app emporio-pet-api
fly secrets set REDIS_URL="redis://default:SENHA@HOST:PORT" --app emporio-pet-api

# Se usar email (Resend)
fly secrets set RESEND_API_KEY="re_sua-chave-resend" --app emporio-pet-api

# Deploy
fly deploy --app emporio-pet-api

# Verificar status
fly status --app emporio-pet-api
fly logs --app emporio-pet-api
```

**URL do Backend**: `https://emporio-pet-api.fly.dev`

---

## 5. Configurar o Frontend (Vercel/Netlify)

No seu frontend (vet-crm), configure as variáveis de ambiente:

```env
NEXT_PUBLIC_API_URL=https://emporio-pet-api.fly.dev
BACKEND_URL=https://emporio-pet-api.fly.dev
```

---

## Comandos Úteis

### Logs e Monitoramento
```bash
# Ver logs em tempo real
fly logs --app emporio-pet-api
fly logs --app emporio-pet-ai

# Status das máquinas
fly status --app emporio-pet-api
fly machine list --app emporio-pet-api

# Métricas
fly dashboard --app emporio-pet-api
```

### Escalar
```bash
# Aumentar memória
fly scale memory 1024 --app emporio-pet-api

# Aumentar número de máquinas
fly scale count 2 --app emporio-pet-api
```

### SSH e Debug
```bash
# Acessar console
fly ssh console --app emporio-pet-api

# Rodar comando no container
fly ssh console --app emporio-pet-api -C "npx prisma studio"
```

### Banco de Dados
```bash
# Conectar ao Postgres via proxy local
fly proxy 5432 -a emporio-pet-db

# Em outro terminal, use psql ou qualquer cliente:
psql postgres://postgres:SENHA@localhost:5432/postgres

# Rodar migrations manualmente
fly ssh console --app emporio-pet-api -C "npx prisma migrate deploy"
```

### Secrets
```bash
# Listar secrets
fly secrets list --app emporio-pet-api

# Atualizar secret
fly secrets set CHAVE="valor" --app emporio-pet-api

# Remover secret
fly secrets unset CHAVE --app emporio-pet-api
```

---

## Troubleshooting

### Erro de conexão com banco
1. Verifique se o Postgres está rodando: `fly status -a emporio-pet-db`
2. Verifique se o attach foi feito: `fly secrets list -a emporio-pet-api`
3. A DATABASE_URL deve estar listada

### Erro de health check
1. Verifique os logs: `fly logs -a emporio-pet-api`
2. O endpoint `/api/health` deve retornar 200
3. Aumente o `grace_period` no fly.toml se necessário

### Aplicação não inicia
1. Verifique se todas as variáveis de ambiente estão configuradas
2. Rode localmente com as mesmas variáveis para testar
3. Verifique o Dockerfile está correto

### Redis não conecta
1. Verifique a URL do Redis nos secrets
2. Certifique-se que o formato é `redis://...` ou `rediss://...` (com SSL)

---

## Custos Estimados (Fly.io)

- **Postgres** (shared-cpu-1x, 1GB): ~$0/mês (free tier)
- **Backend** (shared-cpu-1x, 512MB): ~$0/mês (free tier)
- **AI Service** (shared-cpu-1x, 512MB): ~$0/mês (free tier)
- **Redis** (Upstash free tier): $0/mês

**Total estimado**: $0-5/mês no tier gratuito

---

## Script de Deploy Rápido

Crie um arquivo `deploy.ps1` na raiz:

```powershell
# Deploy Backend
Write-Host "Deploying Backend..." -ForegroundColor Cyan
Set-Location backend
fly deploy --app emporio-pet-api
Set-Location ..

# Deploy AI Service
Write-Host "Deploying AI Service..." -ForegroundColor Cyan
Set-Location ai-service
fly deploy --app emporio-pet-ai
Set-Location ..

Write-Host "Deploy completed!" -ForegroundColor Green
```
