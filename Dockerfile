# ─────────────────────────────────────────────────────────────
# GladPros ERP — Dockerfile de Produção
# Multi-stage: deps → builder → runner (Node 20 Alpine)
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Dependências base ────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copiar manifests de dependências
COPY package.json package-lock.json ./
COPY packages/ui/package.json ./packages/ui/

# Instalar todas as dependências (incluindo devDeps para o build)
RUN npm ci --legacy-peer-deps

# ── Stage 2: Build da UI interna ─────────────────────────────
FROM node:20-alpine AS ui-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/ui/ ./packages/ui/
COPY package.json package-lock.json ./

RUN npm run build -w @gladpros/ui

# ── Stage 3: Build do Next.js ─────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=ui-builder /app/packages/ui/dist ./packages/ui/dist
COPY . .

# Variáveis necessárias apenas no build
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096
# Ativa output: standalone no next.config.ts
ENV DOCKER_BUILD=1

# Gerar Prisma Client
RUN npx prisma generate

# Build da aplicação (standalone output)
RUN npm run build

# ── Stage 4: Runner de produção ───────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuário não-root por segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar apenas o necessário do build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Diretório de uploads com permissão correta
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
