# Auditoria de Produção — Módulo Clientes v3.1

**Data:** 2025-07-15  
**Auditor:** GitHub Copilot (Engenheiro-Chefe GladPros ERP)  
**Metodologia:** 15-point checklist (module-audit skill) + varredura de segurança  
**Status Final:** ✅ **Production Ready — Zero P1/P2/P3 abertos**

> **v3.1** — Todos os P3 corrigidos. Defense-in-depth completo em todas as queries de escrita.

---

## Escopo Auditado

| Categoria | Arquivos |
|-----------|---------|
| API routes | 11 (`route.ts`, `[id]/route.ts`, `[id]/toggle-status`, `[id]/audit`, `[id]/historico`, `bulk`, `decrypt-failures`, `export/csv`, `export/pdf`, `similar`, `zip-lookup`) |
| Pages | 8 (`page.tsx`, `lista/page.tsx`, `[id]/page.tsx`, `novo/page.tsx`, `config/page.tsx`, `relatorios/page.tsx`, `layout.tsx`, `loading.tsx`) |
| Components | 8 (`ClientesTable`, `ClienteForm`, `ClienteCard`, `ClienteFilters`, `ClientesAccessContext`, `ClienteViewDrawer`, `NovoClienteClientPage`, `EditClienteClientPage`) |
| Helpers | `src/shared/lib/helpers/cliente.ts` |

---

## Resultados do Checklist 15 Pontos

| # | Check | Status | Notas |
|---|-------|--------|-------|
| 1 | Auth em todas as rotas | ✅ | Todos os handlers usam `requireClientePermission` como primeira operação |
| 2 | RBAC — mutações com permissão | ✅ | `canCreate`/`canUpdate`/`canDelete` via `requireClientePermission` em todas as mutações |
| 3 | RBAC frontend/sidebar | ✅ | `ClientesAccessContext` + render condicional (sem CSS hiding) |
| 4 | Prisma import único | ✅ | `@/lib/prisma` em todos os arquivos |
| 5 | Mock data | ✅ | Nenhum dado hardcoded de produção |
| 6 | empresaId do contexto | ✅ | `user.empresaId` usado; corrigido em toggle-status e bulk |
| 7 | Currency USD en-US | ✅ | Sem R$ ou BRL — formatação `en-US` no frontend |
| 8 | Timezone America/Chicago | ✅ | `.toISOString()` correto na API; frontend formata com Chicago |
| 9 | Suspense em pages | ✅ | `loading.tsx` presente — Next.js App Router usa-o automaticamente como Suspense fallback |
| 10 | Loading states | ✅ | `ModuleRouteLoading`, skeletons e spinners implementados |
| 11 | Empty state | ✅ | `EmptyState` component em listas |
| 12 | Error handling | ✅ | `withErrorHandler` em todas as rotas + toasts na UI |
| 13 | Paginação | ✅ | `take/skip` + `count` + `pagination` no response |
| 14 | Console.log | ✅ | Zero — apenas `console.error` em catch de audit (aceitável) |
| 15 | Acessibilidade | ✅ | `aria-label` em elementos interativos, touch targets 48px |

---

## Problemas Encontrados e Corrigidos

### P1 — Críticos (corrigidos)

#### P1-01 · `historico/route.ts` — Vazamento de dados por role
**Problema:** `propostas` e `invoices` eram retornados sem gate de permissão, expondo dados financeiros para roles sem acesso (ESTOQUE, USUARIO para propostas).

**Correção aplicada:**
```typescript
// Antes (dados expostos para todos)
prisma.proposta.findMany({ where: { clienteId: id } }) // sempre executava

// Depois (gating correto)
const canViewPropostas = can(user.role as Role, 'propostas', 'read')
const canViewFinancial = can(user.role as Role, 'invoices', 'read') || can(user.role as Role, 'financeiro', 'read')

canViewPropostas ? prisma.proposta.findMany(...) : Promise.resolve([])
canViewFinancial ? prisma.invoice.findMany(...) : Promise.resolve([])
```

Também corrigido:
- `propostas`, `invoices` na resposta gated
- `totais.propostas`, `totais.invoices` gated
- Métricas `lifetimeValue`, `outstandingValue`, `totalInvoiceValue` gated: `canViewFinancial ? valor : undefined`
- `EMPRESA_ID = 1` substituído por `user.empresaId as number`
- `permissions.canViewPropostas` adicionado à resposta

#### P1-02 · `toggle-status/route.ts` — IDOR (findUnique sem empresaId)
**Problema:** `findUnique` e `update` sem `empresaId` no where — anti-pattern de IDOR.

**Correção:**
```typescript
where: { id, empresaId: user.empresaId as number }  // em findUnique E update
```

### P2 — Importantes (corrigidos)

#### P2-01 · `bulk/route.ts` — Sem scope de empresaId
**Problema:** Operações em massa sem `empresaId` no `where`.

**Correção:** `where.empresaId = user.empresaId` aplicado após build do where, cobrindo ambas as branches (`selected` e `allFiltered`).

#### P2-02 · `bulk/route.ts` — `findMany` sem `take` limit
**Problema:** `findMany` sem `take` em operações bulk — risco de OOM com volume.

**Correção:** `take: 5000` adicionado a ambos os `findMany`.

#### P2-03 · `[id]/audit/route.ts` — Auth inconsistente
**Problema:** Usava `requireUser` + `can()` manual enquanto todos os outros endpoints usam `requireClientePermission`.

**Correção:** Substituído por `await requireClientePermission(request, 'canRead')`.

---

## Pontos Positivos Verificados

| Área | Evidência |
|------|-----------|
| SSN/ITIN/EIN criptografados | AES-GCM via `encryptDoc`, `documentoEnc` nunca retornado, apenas `docLast4` exposto |
| Audit log completo | `[DOCUMENTO]`/`[REDACTED]` em diffs, `AuditService.logAction` em toda mutação |
| Queries paralelas | `Promise.all` em 7+ queries em `historico`, count + data na listagem |
| Rate limiting | `apiRateLimit.isAllowed()` em `bulk` |
| `decrypt-failures` protegido | `NODE_ENV` gate + ADMIN role — nunca retorna valor decriptado |
| `sanitizeClienteInput` | Normaliza telefone, email, doc digits, state uppercase |
| Testes existentes | 6 specs Jest + 6 specs Playwright incluindo `clientes-rbac.spec.ts` |
| `withErrorHandler` | Wrapper em todos os endpoints |
| Paginação | `take/skip` + `count` + `pagination` no response |

---

## P3 — Corrigidos na v3.1

| ID | Localização | Problema | Correção |
|----|-------------|----------|---------|
| P3-01 | `[id]/route.ts` — `update` PUT e DELETE | `where: { id }` sem `empresaId` — protegido pelo `findUnique` anterior, mas não defense-in-depth | `where: { id, empresaId: user.empresaId }` em ambos |
| P3-02 | `historico/route.ts` L28 | `findUnique` no check de existência sem `empresaId` | `where: { id, empresaId: user.empresaId as number }` |
| P3-03 | `(dashboard)/clientes/page.tsx` | Counts sem `where: { empresaId }` | `empresaId: user.empresaId` adicionado a todos os 4 counts |
| P3-04 | `page.tsx`, `[id]/page.tsx` | Suspense | **Falso positivo** — `loading.tsx` já existe; Next.js App Router usa-o como Suspense boundary automático |

---

## Matriz de Acesso Final (Verificada)

| Role | canRead | canCreate | canUpdate | canDelete |
|------|---------|-----------|-----------|-----------|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| GERENTE | ✅ | ✅ | ✅ | ❌ |
| FINANCEIRO | ✅ | ❌ | ❌ | ❌ |
| ESTOQUE | ✅ | ❌ | ❌ | ❌ |
| USUARIO | ✅ | ✅ | ✅ | ❌ |
| CLIENTE | ❌ | ❌ | ❌ | ❌ |

---

## Veredicto Final

> ## ✅ Production Ready

**Zero P1/P2/P3 abertos.** Todos os problemas foram corrigidos. TypeScript sem erros. Dados sensíveis protegidos. Audit trail completo. Defense-in-depth em todas as queries de escrita.

---

## Arquivos Modificados nesta Auditoria

| Arquivo | Mudança |
|---------|---------|
| `src/app/api/clientes/[id]/historico/route.ts` | Gating canViewPropostas + canViewFinancial; EMPRESA_ID → user.empresaId; findUnique + empresaId (P3-02) |
| `src/app/api/clientes/[id]/toggle-status/route.ts` | empresaId em findUnique e update |
| `src/app/api/clientes/bulk/route.ts` | empresaId scope + take: 5000 |
| `src/app/api/clientes/[id]/audit/route.ts` | requireClientePermission padrão |
| `src/app/api/clientes/[id]/route.ts` | empresaId no update (PUT L367) e update (DELETE L502) — P3-01 |
| `src/app/(dashboard)/clientes/page.tsx` | empresaId em todos os 4 counts — P3-03 |

---

*Auditoria anterior: `docs/modules/clientes/05-audit-2026-05.md`*  
*Próxima re-auditoria recomendada: após mudanças em RBAC, schema, ou fluxo de propostas/invoices*
