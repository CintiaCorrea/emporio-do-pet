# Empório do Pet - Backend API

Backend API desenvolvido em **NestJS** para o sistema de CRM Veterinário.

## Tecnologias

- **NestJS** - Framework Node.js
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para PostgreSQL
- **Redis** - Cache e sessões
- **Passport/JWT** - Autenticação
- **Swagger** - Documentação da API
- **Docker** - Containerização

## Estrutura do Projeto

```
backend/
├── src/
│   ├── config/           # Configurações
│   ├── modules/
│   │   ├── auth/         # Autenticação JWT
│   │   ├── users/        # Usuários do sistema
│   │   ├── tutors/       # Tutores (donos dos pets)
│   │   ├── pets/         # Pets
│   │   ├── appointments/ # Agendamentos
│   │   ├── boards/       # Kanban boards
│   │   ├── newsletters/  # Email marketing
│   │   ├── prisma/       # Módulo Prisma
│   │   ├── redis/        # Módulo Redis
│   │   └── health/       # Health checks
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── Dockerfile
└── package.json
```

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- PostgreSQL (via Docker ou local)
- Redis (via Docker ou local)

## Início Rápido

### 1. Configuração do Ambiente

```bash
# Entrar na pasta do backend
cd backend

# Copiar arquivo de ambiente
cp env.example .env

# Instalar dependências
npm install
```

### 2. Subir Infraestrutura com Docker

Na **raiz do projeto** (não na pasta backend):

```bash
# Subir PostgreSQL e Redis para desenvolvimento
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Ou subir com interfaces administrativas
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Configurar Banco de Dados

```bash
# Gerar Prisma Client
npm run prisma:generate

# Rodar migrations
npm run prisma:migrate

# (Opcional) Abrir Prisma Studio
npm run prisma:studio
```

### 4. Executar Aplicação

```bash
# Desenvolvimento (com hot reload)
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## Docker

### Desenvolvimento

```bash
# Na raiz do projeto
docker-compose -f docker-compose.dev.yml up -d
```

Serviços disponíveis:
- **PostgreSQL**: `localhost:5433`
- **Redis**: `localhost:6380`
- **Adminer** (DB GUI): `http://localhost:8080`
- **Redis Commander**: `http://localhost:8081`

### Produção

```bash
# Build e execução completa
docker-compose up -d --build
```

## Endpoints da API

Após iniciar o servidor, acesse a documentação Swagger:

```
http://localhost:3001/docs
```

### Principais Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Registro |
| GET | `/api/health` | Health check |
| GET | `/api/tutors` | Listar tutores |
| GET | `/api/pets` | Listar pets |
| GET | `/api/appointments` | Listar agendamentos |
| GET | `/api/boards` | Listar boards |

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do servidor | `3001` |
| `DATABASE_URL` | URL do PostgreSQL | - |
| `REDIS_HOST` | Host do Redis | `localhost` |
| `REDIS_PORT` | Porta do Redis | `6380` |
| `JWT_SECRET` | Chave secreta JWT | - |
| `FRONTEND_URL` | URL do frontend (CORS) | `http://localhost:3000` |

## Scripts Disponíveis

```bash
npm run start:dev     # Desenvolvimento com hot reload
npm run start:prod    # Produção
npm run build         # Build
npm run lint          # Linting
npm run test          # Testes
npm run prisma:generate  # Gerar Prisma Client
npm run prisma:migrate   # Rodar migrations
npm run prisma:studio    # Abrir Prisma Studio
```

## Migração do Frontend

O frontend Next.js deve apontar para este backend:

1. Configurar `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
2. Substituir chamadas às API Routes por chamadas HTTP ao backend
3. Usar o mesmo `NEXTAUTH_SECRET` em ambos

## Contribuição

1. Criar branch feature
2. Implementar mudanças
3. Rodar testes
4. Abrir Pull Request

