# 📦 MÓDULO DASHBOARD — GladPros ERP

**Data base**: 2025-07-15  
**Reauditado em**: 2026-05-20 (audit v1.0), 2026-06-XX (audit v2.0 — auditoria profunda)  
**Status atual**: ✅ Production Ready (certificado após auditoria v2.0)  
**Testes**: 25 testes unitários passando (3 suítes) — type-check clean

---

## Resumo Executivo

| Dimensão | Status | Detalhes |
|----------|--------|----------|
| Segurança | ✅ | Auth/RBAC completos; gate financeiro validado; SSR-safe em todos os componentes |
| Auth/RBAC | ✅ | `requireUser()` em todas as rotas; `can()` em cada operação; RBAC por role em QuickActions |
| Performance | ✅ | `previousDespesas` desnecessária removida do Promise.all; sem N+1; paginação em listas |
| Testes | ✅ | 25 testes passando; executive.test.ts atualizado para refletir remoção de query desnecessária |
| Acessibilidade | ✅ | Componentes usam `aria-label` via biblioteca @gladpros/ui |
| Locale | ✅ | Datas formatadas com `en-US` + `America/Chicago`; sem pt-BR em formatação |
| UX / Dados | ✅ | KPICard sem change hardcoded; SystemStatus sem dados enganosos; QuickActions filtrado por role |
| SSR Safety | ✅ | `usePathname()` substitui `window.location.pathname` em DashboardShell |
| Código morto | ✅ | 4 arquivos mortos removidos (DashboardChart, lazy-components, ReportBuilder duplicado, useDashboardData legado) |

---

## Estrutura de Arquivos (estado atual)

```
src/app/(dashboard)/dashboard/
└── page.tsx                   # Client page — tabs, KPIs, filtros de período

src/app/api/dashboard/
├── route.ts                   # GET /api/dashboard — visão geral (auth+RBAC ✅)
└── executive/
    └── route.ts               # GET /api/dashboard/executive — KPIs financeiros

src/app/api/analytics/
└── route.ts                   # GET /api/analytics — analytics + permissions

src/components/dashboard/
├── KPICard.tsx                # Wrapper sobre StatCard + KPIGrid
├── DashboardCharts.tsx        # Bar chart (recharts) + status propostas
├── DashboardStats.tsx         # 4 StatCards de propostas/clientes
├── QuickActions.tsx           # Botões de ação rápida — filtrados por role via can()
├── RecentActivity.tsx         # Lista de atividades recentes (en-US locale)
├── ExecutiveTab.tsx           # Tab executiva (busca /api/dashboard/executive)
├── SystemStatus.tsx           # Status do sistema (Database + API apenas)
└── index.ts                   # Barrel export

src/shared/hooks/
└── useDashboardData.ts        # Hook principal — inclui currentUserRole

src/shared/components/
└── DashboardShell.tsx         # Layout shell — usa usePathname() (SSR safe)
```

**Arquivos removidos (eram código morto):**
- `src/components/dashboard/useDashboardData.ts` — hook duplicado com interface diferente, sem usos
- `src/components/dashboard/DashboardChart.tsx` — componente Chart.js nunca importado
- `src/components/dashboard/lazy-components.tsx` — lazy loader sem uso real
- `src/components/dashboard/ReportBuilder.tsx` — duplicata do de `src/components/reports/`

---

## Fluxos do Módulo

### Fluxo principal (page.tsx)
```
Usuário acessa /dashboard
  → Layout (requireServerUser) — autentica no servidor
  → page.tsx (client component)
  → useDashboardData (shared/hooks) — busca /api/analytics (inclui currentUserRole)
  → ExecutiveTab (aba executiva) — busca /api/dashboard/executive
  → DashboardStats, QuickActions (filtrado por role), SystemStatus, RecentActivity
```

### Fluxo de dados da API principal
```
GET /api/dashboard?period=30d
  → withErrorHandler wrapper
  → requireUser(request) — lança UNAUTHENTICATED se sem cookie
  → can(role, 'dashboard', 'read') — 403 se CLIENTE
  → Promise.all de 10 queries Prisma
  → topClients: findMany em batch (sem N+1)
  → return { data, success: true }
```

---

## Rotas de API

### GET /api/dashboard

| Campo | Valor |
|-------|-------|
| Método | GET |
| Path | `/api/dashboard` |
| Auth | ✅ `requireUser()` |
| RBAC | ✅ `can(role, 'dashboard', 'read')` — CLIENTE bloqueado (403) |
| Query params | `period` = `7d` \| `30d` (default) \| `90d` \| `1y` |
| Response | `{ data: { totalProposals, totalClients, revenue, proposalsByStatus, projectsByStatus, serviceOrdersByStatus, recentActivity, topClients }, period, timestamp, success }` |

### GET /api/dashboard/executive

| Campo | Valor |
|-------|-------|
| Método | GET |
| Path | `/api/dashboard/executive` |
| Auth | ✅ `requireUser()` |
| RBAC | ✅ `can(role, 'dashboard', 'read')` — CLIENTE bloqueado (403) |
| Gate financeiro | `can(role, 'financeiro', 'read')` — ADMIN/GERENTE/FINANCEIRO veem dados; ESTOQUE/USUARIO recebem `null` |
| Query params | `period` = `7d` \| `30d` (default) \| `90d` |
| Cache | `withBusinessCache` — 120s em prod, 30s em dev |
| Response | `{ data: { period, kpis, projetos, alertas, permissions: { canViewFinancials } }, success }` |

### GET /api/analytics

| Campo | Valor |
|-------|-------|
| Método | GET |
| Path | `/api/analytics` |
| Auth | ✅ `requireUser()` |
| RBAC | ✅ rate limit + Zod validation |
| Response inclui | `permissions: { canViewFinancials, canReadAnalytics, currentUserRole }` |

---

## Regras de Negócio

1. **CLIENTE (role 6) não tem acesso ao dashboard** — bloqueado com 403
2. **Todos os demais roles** têm acesso de leitura ao dashboard
3. **Dados financeiros**: apenas ADMIN/GERENTE/FINANCEIRO — gate `can(role, 'financeiro', 'read')`
4. **QuickActions**: cada botão filtrado por `can(role, module, 'write')` no cliente
5. **Período padrão**: 30 dias
6. **topClients** resolvido com uma única query `findMany` (sem N+1)
7. **Executive route** tem cache por perfil/permissão/período
8. **Alertas automáticos**: projetos atrasados/sobre orçamento; alerta financeiro só com permissão financeira
9. **SystemStatus**: exibe apenas Database e API status — sem dados de backup/uptime não rastreáveis

---

## Cobertura de Testes

| Arquivo | Testes | O que cobre |
|---------|--------|-------------|
| `src/__tests__/api/dashboard/dashboard.test.ts` | 8 | Auth (401), RBAC (403), happy path, N+1 fix, estrutura de resposta |
| `src/__tests__/api/dashboard/executive.test.ts` | 9 | Auth, RBAC, happy path, estrutura kpis/projetos/alertas, periods, expense.aggregate=1 (sem previous) |
| `src/__tests__/api/dashboard/analytics.test.ts` | 8 | Auth, RBAC, rate limit, currentUserRole no permissions |

---

## Bugs Corrigidos na Auditoria v2.0

| ID | Arquivo | Problema | Severidade | Correção |
|----|---------|----------|------------|---------|
| P1-01 | `executive/route.ts:38` | Handler `(request: Request)` com cast posterior | P1 | Assinatura corrigida para `(request: NextRequest)` |
| P1-02 | `components/dashboard/useDashboardData.ts` | Hook morto com interface diferente da real | P1 | Arquivo deletado |
| P2-01 | `QuickActions.tsx` | Botões de ação exibidos sem verificação de permissão | P2 | RBAC via `can()` + `userRole` prop; `visibleActions` filtrado |
| P2-02 | `RecentActivity.tsx:62` | Locale `pt-BR` em formatação de datas | P2 | Substituído por `en-US` |
| P2-03 | `SystemStatus.tsx` | `lastBackup` = `lastActivityAt` (timestamp errado) + `uptime` sem fonte real | P2 | Campos removidos; componente exibe apenas DB e API status |
| P2-04 | `KPICard.tsx` | `change: 2.5` e `trend: 'up'` hardcoded em "Taxa de Conversão" | P2 | Valores removidos; trend condicional em `conversionRate != null` |
| P2-05 | `DashboardShell.tsx:29` | `window.location.pathname` SSR-unsafe (hydration mismatch cross-módulo) | P2 | Substituído por `usePathname()` do `next/navigation` |
| P3-01 | 4 arquivos mortos | DashboardChart, lazy-components, ReportBuilder duplicado, useDashboardData legado | P3 | Todos deletados |
| P3-02 | `executive/route.ts` | `previousDespesas` fetchada mas nunca usada no cálculo | P3 | Removida do Promise.all |
| P3-03 | `useDashboardData.ts:145`, `ExecutiveTab.tsx:147` | `console.error` em código de produção | P3 | Substituído por `console.warn` |
| P3-04 | `ExecutiveTab.tsx:186` | `window.location.reload()` no botão retry | P3 | Substituído por `setRetryCount(c => c + 1)` — retenta sem reload |

---

## Guia de Manutenção

### Como adicionar nova métrica ao /api/dashboard

1. Adicionar query no `Promise.all` em `route.ts`
2. Incluir no objeto `data` do `return NextResponse.json()`
3. **Verificar se campo filtrável tem `@@index` no schema Prisma**
4. Atualizar tipo na interface do componente que consome
5. Adicionar teste em `dashboard.test.ts`

### Como rodar os testes

```bash
# Unitários
npx jest "src/__tests__/api/dashboard" --no-coverage

# E2E (requer servidor rodando em localhost:3000)
npx playwright test tests/e2e/dashboard/
```

### Como adicionar nova aba ao dashboard

1. Criar componente em `src/components/dashboard/`
2. Exportar via `index.ts`
3. Importar com `lazy()` em `page.tsx`
4. Adicionar `TabsTrigger` + `TabsContent`
5. Checar RBAC se aba for restrita a roles específicos

---

## Checklist de Deploy

Antes de cada deploy do módulo dashboard:

- [ ] `requireUser()` presente em todas as rotas
- [ ] `can(role, 'dashboard', 'read')` verificado antes de retornar dados
- [ ] Gate financeiro `can(role, 'financeiro', 'read')` na rota executive
- [ ] Nenhum `console.log` em código de produção
- [ ] Sem N+1 (sem `await` dentro de `.map()` ou `for`)
- [ ] Cores usando tokens do design system
- [ ] Testes unitários passando: `npx jest "src/__tests__/api/dashboard" --no-coverage`
- [ ] TypeScript sem erros: `npm run type-check`
- [ ] Variáveis de ambiente: `TOKEN_VERSION_COLUMN_EXISTS=1`, `RBAC_TRUST_JWT=1` em produção
- [ ] Cache da rota executive funcionando (`withBusinessCache`)

---

## Histórico de Auditorias

| Data | Versão | Resultado | Notas |
|------|--------|-----------|-------|
| 2026-05-18 | v1.0 | Production Ready | Escopo limitado — não cobriu SSR safety, locale, dados enganosos, código morto |
| 2026-05-20 | v1.1 | Not Ready | Encontrou P1/P2 novos; a maioria foi corrigida antes desta sessão |
| 2026-06-XX | v2.0 | ✅ Production Ready | Auditoria profunda; todos os P1/P2/P3 corrigidos; 25 testes passando; type-check clean |
