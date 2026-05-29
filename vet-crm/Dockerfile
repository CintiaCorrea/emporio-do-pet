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
ENV NEXT_PUBLIC_BACKEND_URL=https://emporio-pet-api.fly.dev
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
# Prisma client is bundled by Next.js standalone output (via serverExternalPackages)
# No need to copy node_modules/.prisma or @prisma separately — pnpm uses .pnpm/
# hoisting which would break manual copies.

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
