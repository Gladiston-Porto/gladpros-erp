---
name: performance-audit
title: "Performance Audit"
description: "Auditoria de performance do sistema GladPros ERP."
type: "project"
---

# SKILL: performance-audit

> Auditoria de performance do sistema GladPros ERP.
> Use esta skill quando o sistema apresentar lentidão em qualquer área:
> login, MFA, carregamento de páginas, saves, edições, ou consultas.

---

## Quando usar esta skill

- Sistema demora para liberar credenciais (login lento)
- Código MFA demora para chegar
- Validação do MFA demora
- Páginas demoram para carregar
- Saves/edições demoram para responder
- API retorna respostas lentas (>500ms para operações simples)

---

## Metodologia de auditoria

### Fase 1 — Verificar variáveis de ambiente críticas

Estas vars têm impacto direto em performance e **devem estar presentes em produção**:

```bash
# Verificar se estão setadas:
echo $TOKEN_VERSION_COLUMN_EXISTS   # deve ser "1"
echo $RBAC_TRUST_JWT                # deve ser "1"
echo $REDIS_DISABLED                # "true" se Redis não está disponível
echo $DATABASE_URL                  # deve ter ?connection_limit=N&pool_timeout=20
```

| Variável | Valor esperado | Se ausente |
|----------|---------------|------------|
| `TOKEN_VERSION_COLUMN_EXISTS` | `1` | Cold boot lento (até 10s por INFORMATION_SCHEMA) |
| `RBAC_TRUST_JWT` | `1` | +1 query DB por request autenticada |
| `REDIS_DISABLED` ou `REDIS_URL` configurado | depende | Redis sem config = +1s no primeiro login após restart |
| `DATABASE_URL?connection_limit` | `5`–`15` | Pool de conexões sem limite pode saturar MySQL |

**Se alguma estiver ausente: adicionar ao `.env` imediatamente antes de continuar a auditoria.**

---

### Fase 2 — Identificar onde está a lentidão

Perguntar ao usuário ou testar diretamente:

- [ ] Lento no **login** (antes do MFA)? → checar bcrypt, queries de bloqueio, rate-limit Redis
- [ ] Lento no **envio do código MFA**? → checar SMTP timeout, DNS, entrega do email
- [ ] Lento na **validação do MFA**? → checar MFA verify route, KMS cold start, Promise.all writes
- [ ] Lento no **carregamento de página**? → checar requireServerUser, queries da página, N+1
- [ ] Lento em **saves/edições**? → checar route específica, validação Zod, queries de negócio

---

### Fase 3 — Auditoria de código por área

#### Auth / Login (`src/app/api/auth/login/route.ts`)

Verificar sequência de operações:
1. Rate limit: usa Redis ou memória? Redis disponível?
2. SELECT usuario por email: tem índice em `email`? (deve ter `@unique`)
3. `BlockingService.checkUserBlock()`: quantas queries? (SELECT usuario + COUNT TentativaLogin)
4. `bcrypt.compare()`: qual salt round? (10 = ~100ms, 12 = ~400ms em server lento)
5. `MFAService.createMFACode()`: DELETE + INSERT + SELECT (3 round-trips)

**Problemas comuns:**
```typescript
// ❌ shouldUseRedis() retorna true em produção sem Redis → timeout 1s
// src/shared/lib/rate-limit.ts
// Fix: require REDIS_URL ou REDIS_HOST explícito em qualquer ambiente

// ❌ bcrypt salt 12 em servidor lento
// src/shared/lib/password.ts — hashPassword deve usar salt 10

// ❌ checkUserBlock faz getFailedAttemptCount separado (correlated subquery)
// Verificar índice: @@index([usuarioId, sucesso, criadaEm]) em TentativaLogin
```

#### MFA Verify (`src/app/api/auth/mfa/verify/route.ts`)

Verificar:
1. `hasTokenVersionColumn()` usa cache permanente ou env var?
2. `generateRefreshToken()` chama KMS → DB query na primeira vez (cache 30min)
3. `SecurityService.createSession()` → INSERT SessaoAtiva
4. `INSERT TentativaLogin` + `UPDATE Usuario.ultimoLoginEm` (paralelos no Promise.all = OK)

**Problemas comuns:**
```typescript
// ❌ TOKEN_VERSION_COLUMN_EXISTS não setado → INFORMATION_SCHEMA na primeira chamada
// Fix: TOKEN_VERSION_COLUMN_EXISTS=1 no .env

// ❌ KMS cold start: getJwtSecret() faz DB query na primeira chamada
// Normal após restart — cache de 30min ativa depois
```

#### Middleware (`middleware.ts`)

Verificar:
1. `isIpBlocked()` — usa Redis ou memória? Redis disponível?
2. `rateLimitMiddleware()` — dois awaits por request (IP block + rate limit)
3. `jwtVerify()` — edge-compatible, rápido (puro crypto, sem DB)

**Problemas comuns:**
```typescript
// ❌ Redis não configurado mas middleware tenta usar
// src/lib/security/rate-limiter.ts — getRedis() retorna null se sem REDIS_URL/REDIS_HOST (OK)
// src/shared/lib/rate-limit.ts — shouldUseRedis() tinha bug: true em prod sem config (CORRIGIDO)
```

#### Páginas / Server Components

Verificar:
1. `requireServerUser()` — com `RBAC_TRUST_JWT=1`: só verifica JWT (sem DB). Sem a var: DB query.
2. Data fetching: há cache (`unstable_cache`, `cache()`)? Se não: cada render = DB.
3. Buscar padrões N+1: loops com `await` dentro de `.map()`.

```typescript
// ❌ N+1 pattern
const items = await getItems()
for (const item of items) {
  item.detail = await getDetail(item.id) // N queries!
}

// ✅ Correto
const items = await getItemsWithDetail() // 1 query com JOIN ou include
```

#### API Routes de negócio (saves/edições)

Para qualquer rota lenta, verificar:
1. `requireUser()` com `RBAC_TRUST_JWT=1` → sem DB query extra (OK)
2. Validação Zod: rápida (sync), não é gargalo
3. Queries: usa índices? Tem WHERE em coluna sem índice?
4. Múltiplas queries sequenciais que poderiam ser paralelas com `Promise.all`?

---

### Fase 4 — Verificar índices críticos no schema Prisma

**IMPORTANTE:** Sempre ler o schema real antes de afirmar que índice está faltando.
O schema Prisma é a fonte de verdade — não confiar em suposições.

Conferir `prisma/schema.prisma` para as tabelas mais consultadas:

**Tabelas de autenticação (auditadas em 2026-04-07 — índices OK):**
| Tabela | Índices presentes | Status |
|--------|------------------|--------|
| `Usuario` | `email @unique`, `id @id` | ✓ |
| `TentativaLogin` | `@@index([usuarioId, sucesso, criadaEm])` | ✓ |
| `CodigoMFA` | `@@index([usuarioId, tipoAcao])` | ✓ |
| `SessaoAtiva` | `@@index([token])`, `@@index([usuarioId])` | ✓ |

**Tabelas de negócio (auditadas em 2026-04-07 — índices OK):**
| Tabela | Índices presentes | Status |
|--------|------------------|--------|
| `Invoice` | `clienteId`, `status`, `dataVencimento`, `criadoEm`, `projetoId` | ✓ |
| `ServiceOrder` | `clienteId`, `status`, `scheduledDate`, `createdAt`, `assignedTechId` | ✓ |
| `Expense` | `[empresaId, status, dataVencimento]`, `status`, `dataVencimento`, `projetoId`, `serviceOrderId` | ✓ |
| `Revenue` | `clienteId`, `status`, `dataVencimento`, `empresaId`, `categoriaId` | ✓ |
| `Proposta` | `clienteId`, `status`, `[dataCriacao, id]`, `[status, dataCriacao, id]` | ✓ |
| `Projeto` | `[clienteId, status]`, `responsavelId`, `status` | ✓ |

**Como verificar:**
```bash
grep -n "@@index\|model NomeModelo" prisma/schema.prisma | grep -A10 "model NomeModelo"
```

Se adicionar nova tabela com campo filtrável → sempre incluir `@@index` antes de commitar.

Se índice ausente → criar migration Prisma:
```bash
npx prisma migrate dev --name add_index_nome_campo
```

---

### Fase 5 — Verificar configuração SMTP

Se o MFA chega devagar (email lento):

```typescript
// src/shared/lib/email.ts — verificar timeouts do transporter:
connectionTimeout: 5000,  // OK (era 10000)
greetingTimeout: 5000,    // OK (era 10000)
socketTimeout: 10000,     // OK
pool: true,               // Deve estar true — reutiliza conexão
```

Verificar também:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` configurados?
- Em dev sem `SMTP_USER`: emails vão para console (não chegam — é esperado)
- Hostinger SMTP: port 465 com `SMTP_SECURE=true` OU port 587 com `SMTP_SECURE=false`

---

### Fase 6 — Verificar Next.js config

```typescript
// config/next.config.ts
experimental: {
  optimizeCss: true,
  // ❌ NÃO deve ter cpus: 1 — limita processamento
  // ❌ NÃO deve ter workerThreads: false em produção com mais de 1 core
}
```

---

## Checklist de performance antes de finalizar auditoria

- [ ] `TOKEN_VERSION_COLUMN_EXISTS=1` presente em produção
- [ ] `RBAC_TRUST_JWT=1` presente em produção
- [ ] Redis não configurado → `REDIS_DISABLED=true` ou `REDIS_URL` ausente (sem REDIS_ENABLED=true)
- [ ] `DATABASE_URL` tem `connection_limit` e `pool_timeout`
- [ ] Nenhum `cpus: 1` em `next.config.ts`
- [ ] Bcrypt salt ≤ 10 para novos hashes
- [ ] SMTP timeouts ≤ 5000ms (connectionTimeout, greetingTimeout)
- [ ] Índices presentes nas tabelas de auth (TentativaLogin, CodigoMFA, SessaoAtiva)
- [ ] Sem N+1 nas pages — verificar loops com await dentro de .map()
- [ ] Sem queries sequenciais desnecessárias — usar Promise.all quando independentes

---

## Formato de saída da auditoria

Ao concluir, reportar:

1. **O que foi verificado** — metodologia e arquivos lidos
2. **Problemas encontrados** — com evidência (arquivo:linha)
3. **Classificação** — P1 (causa lentidão direta) | P2 (degrada com volume) | P3 (qualidade)
4. **O que foi corrigido** — se code/config change foi feito
5. **Limitações da auditoria** — o que NÃO foi verificado (ex: métricas reais de produção, EXPLAIN das queries)
6. **Próximo passo** — o que falta para uma auditoria completa

> Esta skill faz análise estática de código e configuração.
> Para métricas reais, use o painel do servidor, logs do Next.js, ou `EXPLAIN` no MySQL.
