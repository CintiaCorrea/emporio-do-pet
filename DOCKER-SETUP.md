# Empório do Pet - Configuração Docker

Guia rápido para configurar e executar o ambiente de desenvolvimento.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Network                            │
│                     (emporio-dev-network)                        │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  PostgreSQL │  │    Redis    │  │   Backend (NestJS)      │  │
│  │   :5433     │  │    :6380    │  │       :3001             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐  ┌─────────────────┐                           │
│  │   Adminer   │  │ Redis Commander │   (Opcionais - Dev)       │
│  │    :8080    │  │     :8081       │                           │
│  └─────────────┘  └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                           │
│                         :3000                                    │
│                    (execução local)                              │
└─────────────────────────────────────────────────────────────────┘
```

## Portas Utilizadas

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| PostgreSQL | 5433 | Banco de dados (evita conflito com 5432) |
| Redis | 6380 | Cache/Sessões (evita conflito com 6379) |
| Backend API | 3001 | API NestJS |
| Frontend | 3000 | Next.js (local) |
| Adminer | 8080 | Interface web para PostgreSQL |
| Redis Commander | 8081 | Interface web para Redis |

## Início Rápido

### 1. Configurar Variáveis de Ambiente

```bash
# Na raiz do projeto
cp env.docker.example .env

# Na pasta backend
cd backend
cp env.example .env
```

### 2. Subir Infraestrutura (Desenvolvimento)

```bash
# Voltar para raiz
cd ..

# Subir apenas PostgreSQL e Redis
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Ou subir tudo (incluindo interfaces admin)
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Configurar Backend

```bash
cd backend

# Instalar dependências
npm install

# Gerar Prisma Client
npm run prisma:generate

# Rodar migrations
npm run prisma:migrate

# Iniciar em modo desenvolvimento
npm run start:dev
```

### 4. Verificar se está funcionando

```bash
# Health check
curl http://localhost:3001/api/health

# Swagger (documentação)
# Abra no navegador: http://localhost:3001/docs
```

## Comandos Úteis

### Docker

```bash
# Ver containers rodando
docker ps

# Ver logs do PostgreSQL
docker logs emporio-postgres-dev -f

# Ver logs do Redis
docker logs emporio-redis-dev -f

# Parar todos os serviços
docker-compose -f docker-compose.dev.yml down

# Parar e remover volumes (⚠️ APAGA DADOS)
docker-compose -f docker-compose.dev.yml down -v
```

### Backend

```bash
cd backend

# Desenvolvimento com hot reload
npm run start:dev

# Debug mode
npm run start:debug

# Produção
npm run build && npm run start:prod

# Rodar testes
npm test

# Prisma Studio (GUI para banco)
npm run prisma:studio
```

## Conectar ao Banco de Dados

### Via Adminer (Interface Web)

1. Acesse: http://localhost:8080
2. Sistema: PostgreSQL
3. Servidor: postgres
4. Usuário: emporio
5. Senha: emporio_dev
6. Banco: emporio_db

### Via Terminal

```bash
docker exec -it emporio-postgres-dev psql -U emporio -d emporio_db
```

### Via Prisma Studio

```bash
cd backend
npm run prisma:studio
# Abre em http://localhost:5555
```

## Conectar ao Redis

### Via Redis Commander (Interface Web)

1. Acesse: http://localhost:8081

### Via Terminal

```bash
docker exec -it emporio-redis-dev redis-cli
```

## Produção

Para ambiente de produção, use o `docker-compose.yml` principal:

```bash
# Build e execução
docker-compose up -d --build

# Ver logs
docker-compose logs -f backend
```

## Solução de Problemas

### Porta já em uso

Se alguma porta estiver em uso, altere no `.env`:

```env
POSTGRES_PORT=5434
REDIS_PORT=6381
BACKEND_PORT=3002
```

### Erro de conexão com banco

1. Verifique se o PostgreSQL está rodando:
   ```bash
   docker ps | grep postgres
   ```

2. Verifique a URL de conexão no `.env` do backend

3. Teste a conexão:
   ```bash
   docker exec -it emporio-postgres-dev pg_isready
   ```

### Limpar tudo e recomeçar

```bash
# Parar containers
docker-compose -f docker-compose.dev.yml down

# Remover volumes
docker volume rm emporio_postgres_dev_data emporio_redis_dev_data

# Subir novamente
docker-compose -f docker-compose.dev.yml up -d
```

