# Empório do Pet - Frontend (vet-crm)

Frontend em **Next.js**.

## Backend NestJS

Este frontend pode encaminhar autenticação para o backend NestJS (porta padrão `3001`):

- `POST /api/auth/register` (Next) → proxy para `http://localhost:3001/api/auth/register`
- NextAuth (Credentials) → `http://localhost:3001/api/auth/login`

### Variáveis de ambiente (opcional)

Você pode configurar a URL do backend (qualquer uma serve):

- `NEXT_PUBLIC_API_URL` (ex.: `http://localhost:3001/api`) **(recomendado)**
- `BACKEND_URL` (ex.: `http://localhost:3001` ou `http://localhost:3001/api`)
- `NEXT_PUBLIC_BACKEND_URL` (mesmo formato do `BACKEND_URL`)

Em desenvolvimento, se nenhuma estiver setada, o fallback é `http://localhost:3001`.


