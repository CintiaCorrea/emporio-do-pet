# ========================================
# Build Stage
# ========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY prisma ./prisma/

# Instalar pnpm e dependências
RUN npm install -g pnpm && pnpm install

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build da aplicação
RUN pnpm run build

# ========================================
# Production Stage
# ========================================
FROM node:20-alpine AS production

WORKDIR /app

# Instalar dependências necessárias para Prisma, healthcheck e conversão de áudio (voz do WhatsApp)
RUN apk add --no-cache wget openssl ffmpeg

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copiar arquivos necessários
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Gerar Prisma Client no container final
RUN npx prisma generate

# Ajustar permissões
RUN chown -R nestjs:nodejs /app

# Mudar para usuário não-root
USER nestjs

# Expor porta (Fly.io usa 8080)
EXPOSE 8080

# Variável de ambiente para porta
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Comando de inicialização
CMD ["node", "dist/main"]
