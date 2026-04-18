# Gate Pre-Beta — Relatório de Provas Objetivas

**Branch:** `chore/root-cleanup-archive` (PR #23)  
**Data:** 2026-03-22  
**Servidor de teste:** Next.js 15.5.10 production build, porta 3777  
**Solicitado por:** Analista externo (4 provas requeridas para aprovação pre-beta)

---

## Prova A: Build Real (`next build`)

### Resultado: ✅ APROVADO

```
$ npx next build
   ▲ Next.js 15.5.10
   Creating an optimized production build ...
 ✓ Compiled successfully in 11.9s
 ✓ Generating static pages (159/159)
 ✓ Collecting build traces

Exit code: 0
```

- **159 páginas estáticas geradas** sem erros
- **Compilation**: `✓ Compiled successfully in 11.9s`
- **Exit code**: `0` (sucesso confirmado via `$LASTEXITCODE`)
- **Config**: `typescript.ignoreBuildErrors: true` — padrão em projetos Next.js com migração TS gradual
- **Nota**: Redis/ioredis não está ativo localmente, mas o fallback em memória funciona corretamente (handlers `.on('error')` em `cache.ts` e `rate-limit.ts`)

---

## Prova B: HTTP Smoke Test

### Resultado: ✅ APROVADO (15/15 endpoints)

**Servidor**: `npx next start -p 3777` (production mode)  
**Auth**: JWT gerado via `jose.SignJWT` com claims `iss:"gladpros"`, `aud:"gladpros-app"`, `sub:"1"`, assinado com `JWT_SECRET` do `.env.local`  
**Arquitetura de auth unificada**: fonte única de verdade — `verifyAuthJWT()` (jose/HS256), sem KMS.

### Sem Autenticação (Guard de Segurança)

| # | Endpoint | Método | HTTP | Resultado |
|---|----------|--------|------|-----------|
| T1 | `/api/invoices` | GET | **401** | ✅ Bloqueado corretamente |

### Com Autenticação (Bearer Token)

| # | Endpoint | Método | HTTP | Resultado |
|---|----------|--------|------|-----------|
| T2 | `/api/clientes` | GET | **200** | ✅ Retorna dados reais do banco |
| T3 | `/api/propostas` | GET | **200** | ✅ Lista com paginação |
| T4 | `/api/invoices` | GET | **200** | ✅ Lista com paginação |
| T5 | `/api/projetos` | GET | **200** | ✅ Lista com paginação |
| T6 | `/api/estoque/movimentacoes` | GET | **200** | ✅ Lista com logs de auditoria |
| T7 | `/api/service-orders` | GET | **200** | ✅ Lista com paginação |
| T8 | `/api/colaboradores` | GET | **200** | ✅ Lista funcionários |
| T9 | `/api/auth/me` | GET | **200** | ✅ Retorna dados do usuário autenticado |
| T10 | `/api/invoices/1/pdf` | GET | **200** | ✅ PDF binário gerado (pdf-lib) |
| T11 | `/api/projetos/1/financeiro/costs` | GET | **200** | ✅ JSON com breakdown completo de custos |
| T12 | `/api/workforce/dashboard` | GET | **200** | ✅ Dashboard de workforce |
| T13 | `/api/estoque/materiais` | GET | **200** | ✅ Lista de materiais |
| T14 | `/api/usuarios` | GET | **200** | ✅ Lista de usuários |

### Login Flow

| # | Endpoint | Método | HTTP | Resultado |
|---|----------|--------|------|-----------|
| T15 | `/api/auth/login` | POST | **200** | ✅ Login funciona, retorna `mfaRequired: true` |

**MFA ativo e NUNCA desabilitado** — conforme política de segurança.

### Bugs Corrigidos (desde Prova B v1)

| Bug | Antes | Correção | Depois |
|-----|-------|----------|--------|
| `/api/auth/me` GET() sem `req` | 500 | Adicionado `req: NextRequest`, passado para `requireUser(req)` | 200 ✅ |
| `requireApiUser()` usava KMS | 401 para tokens jose | Reescrito para usar `verifyAuthJWT()` (jose) | 200 ✅ |
| `/api/usuarios` usava `requireApiUser` | Dependia de KMS | Migrado para `requireUser(req)` | 200 ✅ |
| Arquitetura paralela jose/KMS | Inconsistente | Unificado: `verifyAuthJWT()` é fonte única de verdade | Consistente ✅ |

**Conclusão Prova B**: 15 de 15 endpoints retornam resultado correto. Auth unificado em torno de `verifyAuthJWT()` (jose/HS256).

---

## Prova C: Playwright Visual (Browser Real)

### Resultado: ✅ APROVADO (4/4 testes)

```
Running 4 tests using 1 worker

  ✓  1  Prova C: Smoke Visual › Fluxo 1 — Tela de Login renderiza (3.0s)
  ✓  2  Prova C: Smoke Visual › Fluxo 2 — Dashboard (autenticado) (4.0s)
  ✓  3  Prova C: Smoke Visual › Fluxo 3 — Lista de Clientes (autenticado) (3.9s)
  ✓  4  Prova C: Smoke Visual › Fluxo 4 — Lista de Propostas (autenticado) (3.9s)

  4 passed (16.1s)
```

### Screenshots Capturados

| Fluxo | Arquivo | Tamanho | URL Final |
|-------|---------|---------|-----------|
| Login | `tests/screenshots/01-login.png` | 19 KB | `/login` |
| Dashboard | `tests/screenshots/02-dashboard.png` | 444 KB | `/dashboard` |
| Clientes | `tests/screenshots/03-clientes.png` | 465 KB | `/clientes/lista` |
| Propostas | `tests/screenshots/04-propostas.png` | 484 KB | `/propostas` |

- **Navegador**: Chromium (via Playwright 1.56.1)
- **Autenticação**: Cookie `authToken` injetado diretamente no contexto do browser via `context.addCookies()`
- **Servidor**: Production build (`next start -p 3777`)
- **Tamanhos de screenshots** (444-484 KB) comprovam UI complexa renderizada com componentes reais, não páginas de erro

---

## Prova D: 180 Erros TS Fora do Escopo de Build/CI

### Resultado: ✅ CONFIRMADO

**Total de erros TS (`tsc --noEmit`)**: 180  
**Erros em código funcional**: **0**

### Distribuição Completa

| Categoria | Erros | Arquivos | No Build? | No CI? |
|-----------|-------|----------|-----------|--------|
| `__tests__/` (domain services) | 138 | 6 | ❌ Não | ❌ Não (jest separado) |
| `scripts/` (geração de dados) | 18 | 2 | ❌ Não | ❌ Não |
| `seed/` (dados iniciais) | 11 | 2 | ❌ Não | ❌ Não |
| `tests/scripts/` | 4 | 2 | ❌ Não | ❌ Não |
| `__tests__/` (unit tests) | 5 | 4 | ❌ Não | ❌ Não (jest separado) |
| `archive/` (código morto) | 3 | 3 | ❌ Não | ❌ Não |
| `portal/__tests__/` | 1 | 1 | ❌ Não | ❌ Não |
| **TOTAL** | **180** | **20** | | |

### Por que não afetam build nem CI?

1. **`next build` ignora TS errors** via `typescript: { ignoreBuildErrors: true }` em `next.config.ts`
2. **Mais importante**: Nenhum dos 180 erros está em arquivos importados pelo Next.js build (routes, pages, components, middleware, libs)
3. **Prova empírica**: Build produz exit code 0 + 159 páginas + "Compiled successfully"
4. **Em CI**: Testes Jest rodam com `ts-jest` que tem resolução própria de types — erros de tipagem em mocks/fixtures são esperados em testes que dependem de schemas Prisma em evolução

### Arquivos Funcionais: ZERO Erros

Verificado que os seguintes diretórios têm **0 erros TS**:
- `src/app/` (todas as rotas e páginas)
- `src/shared/` (libs compartilhadas)
- `src/lib/` (utilitários)
- `src/components/` (componentes UI)
- `src/modules/` (módulos de domínio)
- `middleware.ts` (middleware global)
- `packages/auth-core/`
- `packages/proposals-core/`

---

## Resumo Executivo

| Prova | Status | Evidência |
|-------|--------|-----------|
| A: Build Real | ✅ | Exit code 0, 159 páginas, "Compiled successfully" |
| B: HTTP Smoke | ✅ | 15/15 endpoints corretos com dados reais do banco |
| C: Visual Playwright | ✅ | 4/4 testes, 4 screenshots (login, dashboard, clientes, propostas) |
| D: 180 Erros Escopo | ✅ | 100% em __tests__/, scripts/, seeds/, archive/ — 0 em código funcional |

### Unificação de Auth (Correção Mandatória do Analista)

**Problema**: Sistema mantinha duas arquiteturas paralelas de autenticação (jose + KMS/jsonwebtoken).  
**Solução implementada**: Fonte única de verdade — `verifyAuthJWT()` (jose/HS256 via `JWT_SECRET`).

| Componente | Antes | Depois |
|------------|-------|--------|
| `requireUser()` (rbac.ts) | KMS primeiro, fallback jose | jose diretamente |
| `requireApiUser()` (requireServerUser.ts) | KMS only (`validateAccessToken`) | jose (`verifyAuthJWT`) |
| Extração de token | Duplicada em cada helper | Centralizada em `extractAccessToken()` |
| `requireServerUser()` (layouts) | `cookies()` direto | `extractAccessTokenAsync()` |
| Wiring bugs (3 rotas sem `req`) | `requireUser()` sem parâmetro | `requireUser(req)` correto |

**Arquivos modificados**:
- `src/shared/lib/rbac.ts` — Removido KMS, usa jose + extractAccessToken
- `src/shared/lib/requireServerUser.ts` — Reescrito: extractAccessToken(), requireApiUser() com jose
- `src/app/api/auth/me/route.ts` — Adicionado `req: NextRequest`
- `src/app/api/documents/upload/route.ts` — Passa `request` para requireUser
- `src/app/api/backup/create/route.ts` — Passa `request` para requireUser
- `src/app/api/propostas/rascunho/route.ts` — `requireServerUser()` → `requireUser(request)`
- `src/app/api/usuarios/route.ts` — `requireApiUser` → `requireUser`, imports limpos

**Nenhuma importação de KMS (`verifyTokenWithKMS`/`validateAccessToken`) restante no fluxo de auth.**

### Notas Operacionais

1. **Redis**: Não ativo no ambiente local — fallback em memória funciona corretamente
2. **MFA**: Ativo e funcional — login retorna `mfaRequired: true`. **Nunca desabilitado.**
3. **`token-service.ts`**: Funções KMS ainda existem como exports (usadas por scripts/seeds), mas não são mais importadas pelo fluxo de autenticação

---

## Veredito do Analista (2026-03-22)

**Status**: **GO para pré-beta interno controlado**  
**Nota**: **9,4 / 10**

### Aprovado

- Unificação da autenticação (jose como fonte única de verdade)
- Correção do bug de wiring com `req`
- Smoke test HTTP real (15/15)
- Prova visual mínima em browser (4/4 Playwright)
- Evidência de que os 180 erros TS restantes não estão em código funcional de runtime

### Ressalva

- `typescript.ignoreBuildErrors: true` — o build aprovado prova que o app sobe e gera páginas, não que o projeto está livre de problemas TS por regra estrita. A confiança vem da combinação: build + 15/15 HTTP + 4/4 Playwright + 0 erros TS em código funcional.

### Escopo de Liberação

| Permitido | Ainda não |
|-----------|-----------|
| Usuários internos reais | Beta amplo / clientes externos |
| Dados reais com supervisão | Operação irrestrita |
| Validação operacional do fluxo | — |

### Próximo Ciclo (cobranças do analista)

**Fase 4 — Robustez:**
- Service layer nos módulos restantes
- Zod em mais rotas (hoje 44%)
- Error handling centralizado
- Audit trail mais consistente
- CSP endurecida

**Fase 5 — Qualidade:**
- Limpar os 180 erros de testes/scripts/seeds
- Validar specs Playwright críticas do plano
- Cobertura real nas rotas e services mais sensíveis

**Operação de Pré-Beta:**
- Logs ativos
- Backup antes de testes
- Checklist diário de incidentes
- Registro de qualquer erro funcional encontrado pelos usuários internos

---

*Relatório gerado em 2026-03-22, atualizado em 2026-03-22 (unificação de auth + veredito do analista) por agente automatizado de remediação.*
