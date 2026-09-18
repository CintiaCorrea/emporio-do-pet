# Dockerfile multi-stage pro vet-crm (Next.js 15 + Prisma)
# Padrão oficial Next.js standalone — imagem final ~150MB

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# === deps ===
FROM base AS deps
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN npm install -g pnpm@9.15.4 && pnpm install --frozen-lockfile

# === builder ===
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm@9.15.4
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_BACKEND_URL=https://emporio-pet-api.fly.dev
RUN pnpm prisma generate
# CARIMBO DA PUBLICAÇÃO (17/09/2026): cada build grava aqui um número novo. A tela aberta na
# recepção compara o carimbo dela com o de /api/versao e sabe na hora que ficou velha.
RUN sed -i "s/VERSAO_PUBLICADA = \"dev\"/VERSAO_PUBLICADA = \"$(date +%s)\"/" lib/versao-publicada.ts && grep VERSAO_PUBLICADA lib/versao-publicada.ts | tail -1
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
