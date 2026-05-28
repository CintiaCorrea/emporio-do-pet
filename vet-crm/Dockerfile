# Dockerfile multi-stage pro vet-crm (Next.js 15 + Prisma)
# Padrão oficial Next.js standalone — imagem final ~150MB

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# === deps ===
FROM base AS deps
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile

# === builder ===
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm@9
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate
RUN pnpm build

# === runner (production) ===
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
