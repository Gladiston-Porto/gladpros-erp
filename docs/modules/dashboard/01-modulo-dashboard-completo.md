# 📦 MÓDULO DASHBOARD — GladPros ERP

**Data**: 2025-07-15  
**Status**: ✅ Pronto para produção  
**Testes**: 17/17 unitários passando + 4 spec files E2E criados (30 testes)

---

## Resumo Executivo

| Dimensão | Status | Detalhes |
|----------|--------|----------|
| Segurança | ✅ | Auth + RBAC em todas as rotas após auditoria |
| Auth/RBAC | ✅ | `requireUser` + `can()` em `/api/dashboard` e `/api/dashboard/executive` |
| Performance | ✅ | N+1 query eliminado; todas as queries independentes em `Promise.all` |
| Testes | ✅ | 17 testes unitários + 4 spec files E2E (smoke, rbac, security, regression) |
| Acessibilidade | ✅ | Componentes usam `aria-label` via biblioteca @gladpros/ui |
| Cores | ✅ | Hardcoded colors substituídas por tokens semânticos do design system |

---

## Estrutura de Arquivos

```
src/app/(dashboard)/dashboard/
└── page.tsx                   # Client page — tabs, KPIs, filtros de período

src/app/api/dashboard/
├── route.ts                   # GET /api/dashboard — visão geral (auth+RBAC ✅)
└── executive/
    └── route.ts               # GET /api/dashboard/executive — KPIs financeiros

src/components/dashboard/
├── KPICard.tsx                # Wrapper sobre StatCard + KPIGrid
├── DashboardCharts.tsx        # Bar chart (recharts) + status propostas
├── DashboardChart.tsx         # Chart.js dinâmico (line/bar/doughnut)
├── DashboardStats.tsx         # 4 StatCards de propostas/clientes
├── QuickActions.tsx           # 4 botões de ação rápida
├── RecentActivity.tsx         # Lista de atividades recentes
├── ExecutiveDashboard.tsx     # View executiva usando hook legado
├── ExecutiveTab.tsx           # Tab executiva (busca /api/dashboard/executive)
├── SystemStatus.tsx           # Status do sistema (database, api, backup)
├── ReportBuilder.tsx          # Construtor de relatórios (UI)
├── lazy-components.tsx        # Dynamic imports dos componentes
├── useDashboardData.ts        # Hook legado (usado por ExecutiveDashboard)
└── index.ts                   # Barrel export

src/shared/hooks/
└── useDashboardData.ts        # Hook principal (usado por page.tsx)
```

---

## Fluxos do Módulo

### Fluxo principal (page.tsx)
```
Usuário acessa /dashboard
  → Layout (requireServerUser) — autentica no servidor
  → page.tsx (client component)
  → useDashboardData (shared/hooks) — busca /api/analytics
  → ExecutiveTab (aba executiva) — busca /api/dashboard/executive
  → DashboardStats, QuickActions, SystemStatus, RecentActivity
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
| Query params | `period` = `7d` \| `30d` (default) \| `90d` |
| Cache | `withBusinessCache` — 120s em prod, 30s em dev |
| Response | `{ data: { period, kpis: { receitaTotal, despesaTotal, saldoPeriodo, saldoContas, crescimentoReceita, projetosAtivos, projetosAtrasados, ... }, projetos: [...], alertas: [...] }, success }` |

---

## Regras de Negócio

1. **CLIENTE (role 6) não tem acesso ao dashboard** — bloqueado com 403
2. **Todos os demais roles (ADMIN, GERENTE, FINANCEIRO, ESTOQUE, USUARIO)** têm acesso de leitura
3. **Período padrão**: 30 dias
4. **topClients** é resolvido com uma única query `findMany` (sem N+1)
5. **Executive route** tem cache de 120s em produção para evitar sobrecarga no banco
6. **Alertas automáticos**: projetos atrasados, sobre orçamento, saldo negativo
7. **Crescimento de receita**: calculado comparando período atual com período anterior equivalente

---

## Cobertura de Testes

| Arquivo | Testes | O que cobre |
|---------|--------|-------------|
| `src/__tests__/api/dashboard/dashboard.test.ts` | 8 | Auth (401), RBAC (403), happy path, N+1 fix, estrutura de resposta |
| `src/__tests__/api/dashboard/executive.test.ts` | 9 | Auth, RBAC, happy path, estrutura kpis/projetos/alertas, periods |
| `tests/e2e/dashboard/dashboard-smoke.spec.ts` | 6 | Smoke: carregamento, redirect sem auth, APIs respondem |
| `tests/e2e/dashboard/dashboard-rbac.spec.ts` | 8 | Cada role testado, CLIENTE bloqueado |
| `tests/e2e/dashboard/dashboard-security.spec.ts` | 6 | 401 sem cookie, token inválido, campos sensíveis ausentes |
| `tests/e2e/dashboard/dashboard-regression.spec.ts` | 10 | Guards para todos P1/P2 corrigidos |

---

## Bugs Corrigidos na Auditoria

| ID | Arquivo | Problema | Risco | Correção |
|----|---------|----------|-------|---------|
| P1-01 | `api/dashboard/route.ts` | Rota sem `requireUser()` — dados de negócio expostos sem auth | **CRÍTICO** — qualquer usuário sem login acessava dados | Adicionado `requireUser` + `can()` como primeiras operações |
| P1-02 | `api/dashboard/route.ts:98` | N+1 query: `await findUnique()` dentro de `for` loop (até 5 queries seq.) | Alto — latência aumenta linearmente com topClients | Substituído por `findMany({ where: { id: { in: ids } } })` + Map |
| P2-03 | `components/dashboard/useDashboardData.ts:62` | Mapeamento incorreto da resposta da API: lia `result.kpis`, `result.charts.revenue` mas API retorna `{ data: { kpis, projetos } }` | Funcional — `ExecutiveDashboard` sempre crashava com TypeError | Corrigido para `(result.data ?? result).kpis` com fallbacks seguros |
| P2-04 | `DashboardCharts.tsx:72` | Mock data hardcoded: "75%", "20%", "5%" no card "Status das Propostas" | Qualidade — dados falsos em produção | Adicionado prop `statusData` com default `'—'` |
| P2-05 | `ReportBuilder.tsx:91` | `console.log('Relatório gerado:', result)` em código de produção | Qualidade / vazamento de dados em logs | Removido `console.log` |
| P2-06 | `lazy-components.tsx:9` | `border-blue-600` hardcoded (não usa design token) | UI — quebra dark mode | Substituído por `border-brand-primary` |
| P2-07 | `DashboardChart.tsx:104,130` | `rounded-lg` em vez de `rounded-2xl` | UI — inconsistência visual | Corrigido para `rounded-2xl` |
| P2-08 | `ExecutiveDashboard.tsx:17,43` | `text-red-600`, `text-gray-600`, `bg-gray-200` hardcoded | UI — quebra dark mode | Substituído por `text-destructive`, `text-muted-foreground`, `bg-muted` |
| P2-09 | `RecentActivity.tsx:28-30` | Badge colors hardcoded: `bg-green-50 text-green-700`, etc. | UI — quebra dark mode | Substituído por `variant="success"`, `variant="destructive"`, `variant="info"` |
| P2-10 | `SystemStatus.tsx:43-48` | Mesmos hardcoded badge colors | UI — quebra dark mode | Substituído por `variant="success"`, `variant="warning"`, `variant="destructive"` |
| P2-11 | `ExecutiveTab.tsx:167,182,311,327,352,383,399,408,413,424,437,440,469,491` | Múltiplos hardcoded: `bg-gray-200`, `text-gray-600`, `bg-red-50 border-red-200`, etc. | UI — quebra dark mode | Substituído por tokens semânticos |
| P2-12 | `page.tsx:104,114` | `rounded-lg` em `SelectTrigger` | UI — inconsistência visual | Corrigido para `rounded-2xl` |

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

- [ ] `requireUser()` presente em `/api/dashboard/route.ts`
- [ ] `can(role, 'dashboard', 'read')` verificado antes de retornar dados
- [ ] Nenhum `console.log` em código de produção
- [ ] N+1 query resolvido (confirmar sem `await` dentro de `.map()` ou `for`)
- [ ] Cores usando tokens do design system (`text-foreground`, `bg-card`, etc.)
- [ ] Testes unitários passando: `npx jest "src/__tests__/api/dashboard" --no-coverage`
- [ ] TypeScript sem erros: `npx tsc --noEmit`
- [ ] Variáveis de ambiente: `TOKEN_VERSION_COLUMN_EXISTS=1`, `RBAC_TRUST_JWT=1` em produção
- [ ] Cache da rota executive funcionando (`withBusinessCache`)
