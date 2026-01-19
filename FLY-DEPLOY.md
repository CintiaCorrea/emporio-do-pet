# 🚀 Deploy no Fly.io - Empório do Pet

Este guia explica como fazer o deploy do backend no Fly.io com PostgreSQL e Redis gerenciados.

## Pré-requisitos

1. **Instalar o Fly CLI:**
   ```bash
   # Windows (PowerShell como Admin)
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   
   # Ou via scoop
   scoop install flyctl
   ```

2. **Fazer login no Fly.io:**
   ```bash
   flyctl auth login
   ```

---

## 📦 Passo 1: Criar a Aplicação

```bash
cd backend
flyctl launch --no-deploy
```

Quando perguntado:
- **App name:** `emporio-pet-api` (ou escolha um nome único)
- **Region:** São Paulo (gru)
- **Database:** Não (vamos criar separadamente)

---

## 🗄️ Passo 2: Criar PostgreSQL

```bash
flyctl postgres create --name emporio-pet-db --region gru --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
```

**Conectar o banco à aplicação:**
```bash
flyctl postgres attach emporio-pet-db --app emporio-pet-api
```

Isso vai criar automaticamente a secret `DATABASE_URL` na sua app.

---

## 🔴 Passo 3: Criar Redis (Upstash)

O Fly.io usa Upstash para Redis gerenciado:

```bash
flyctl redis create --name emporio-pet-redis --region gru --no-replicas
```

Após criar, anote a URL do Redis que será exibida.

**Configurar a URL do Redis:**
```bash
flyctl secrets set REDIS_URL="redis://default:PASSWORD@fly-emporio-pet-redis.upstash.io:6379" --app emporio-pet-api
```

---

## 🔐 Passo 4: Configurar Secrets (Variáveis de Ambiente)

Configure todas as variáveis sensíveis:

```bash
# JWT e Auth
flyctl secrets set JWT_SECRET="sua-chave-jwt-super-secreta-minimo-32-caracteres" --app emporio-pet-api
flyctl secrets set JWT_EXPIRES_IN="7d" --app emporio-pet-api
flyctl secrets set NEXTAUTH_SECRET="sua-chave-nextauth-super-secreta" --app emporio-pet-api

# Frontend URL (Vercel)
flyctl secrets set FRONTEND_URL="https://seu-frontend.vercel.app" --app emporio-pet-api

# Redis (configuração separada se não usar URL)
# flyctl secrets set REDIS_HOST="fly-emporio-pet-redis.upstash.io" --app emporio-pet-api
# flyctl secrets set REDIS_PORT="6379" --app emporio-pet-api
# flyctl secrets set REDIS_PASSWORD="sua-senha-redis" --app emporio-pet-api

# Email (opcional)
flyctl secrets set EMAIL_HOST="smtp.gmail.com" --app emporio-pet-api
flyctl secrets set EMAIL_PORT="587" --app emporio-pet-api
flyctl secrets set EMAIL_USER="seu-email@gmail.com" --app emporio-pet-api
flyctl secrets set EMAIL_PASSWORD="sua-app-password" --app emporio-pet-api

# Integrações (opcional)
flyctl secrets set OPENAI_API_KEY="sk-..." --app emporio-pet-api
```

**Ver todas as secrets configuradas:**
```bash
flyctl secrets list --app emporio-pet-api
```

---

## 🚀 Passo 5: Deploy

```bash
cd backend
flyctl deploy
```

O deploy vai:
1. Buildar a imagem Docker
2. Executar `prisma migrate deploy` (release command)
3. Iniciar a aplicação

---

## ✅ Passo 6: Verificar o Deploy

**Ver status:**
```bash
flyctl status --app emporio-pet-api
```

**Ver logs:**
```bash
flyctl logs --app emporio-pet-api
```

**Testar a API:**
```bash
curl https://emporio-pet-api.fly.dev/api/health
```

---

## 🔄 Atualizações Futuras

Para fazer novos deploys:
```bash
cd backend
flyctl deploy
```

---

## 📊 Monitoramento

**Dashboard:**
```bash
flyctl dashboard --app emporio-pet-api
```

**Acessar console:**
```bash
flyctl ssh console --app emporio-pet-api
```

**Acessar banco de dados:**
```bash
flyctl postgres connect --app emporio-pet-db
```

---

## 🔧 Comandos Úteis

```bash
# Reiniciar a aplicação
flyctl apps restart emporio-pet-api

# Escalar (aumentar recursos)
flyctl scale vm shared-cpu-2x --app emporio-pet-api
flyctl scale memory 1024 --app emporio-pet-api

# Ver uso de recursos
flyctl scale show --app emporio-pet-api

# Parar a aplicação (economia)
flyctl scale count 0 --app emporio-pet-api

# Voltar a aplicação
flyctl scale count 1 --app emporio-pet-api
```

---

## 🌐 Configurar CORS no Frontend (Vercel)

Atualize o arquivo de ambiente do frontend na Vercel:

```env
NEXT_PUBLIC_API_URL=https://emporio-pet-api.fly.dev
NEXTAUTH_URL=https://seu-frontend.vercel.app
```

---

## 💰 Custos Estimados (Fly.io)

| Recurso | Configuração | Custo/mês |
|---------|-------------|-----------|
| App | shared-cpu-1x, 512MB | ~$5-7 |
| PostgreSQL | 1GB storage | ~$0-2 |
| Redis (Upstash) | Free tier | $0 |
| **Total** | | **~$5-10/mês** |

---

## 🆘 Troubleshooting

**Erro de conexão com banco:**
```bash
# Verificar se o banco está rodando
flyctl postgres list

# Ver detalhes do banco
flyctl postgres show emporio-pet-db
```

**Erro nas migrations:**
```bash
# Rodar migrations manualmente
flyctl ssh console --app emporio-pet-api
npx prisma migrate deploy
```

**Ver variáveis de ambiente:**
```bash
flyctl ssh console --app emporio-pet-api
env | grep DATABASE
```

