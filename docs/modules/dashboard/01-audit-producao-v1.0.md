# Auditoria de Produção — Módulo Dashboard v1.0 (Histórico)

**Data:** 2026-05-18  
**Auditor:** Co-produtor ERP GladPros  
**Status final na época:** ✅ Production Ready  
**Status atual:** ⚠️ **Superado por auditoria profunda v2.0** — este documento é histórico e não representa certificação vigente. Consultar `01-modulo-dashboard-completo.md` para o estado atual.

---

## Escopo Auditado

| Camada | Arquivos |
|--------|---------|
| Página | `src/app/(dashboard)/dashboard/page.tsx`, `loading.tsx` |
| APIs | `src/app/api/dashboard/route.ts`, `src/app/api/dashboard/executive/route.ts` |
| Componentes | DashboardStats, RecentActivity, QuickActions, SystemStatus, KPICard, ExecutiveTab, ReportBuilder, DashboardCharts, lazy-components |
| Hooks | `src/shared/hooks/useDashboardData.ts`, `src/components/dashboard/useDashboardData.ts` |
| Infra | `src/shared/lib/sidebar-rbac.ts`, `src/shared/lib/rbac-core.ts` |
| Testes | `src/__tests__/api/dashboard/dashboard.test.ts`, `executive.test.ts`, `tests/e2e/dashboard/` |

---

## Checklist 15 Pontos — Resultado Final

| # | Verificação | Status | Evidência |
|---|---|---|---|
| 1 | Auth — `requireUser()` em todas as rotas | ✅ | Ambas as rotas chamam `requireUser` como primeira operação |
| 2 | RBAC — `can()` antes de ações | ✅ | `can(user.role, 'dashboard', 'read')` em ambas as APIs |
| 3 | Sidebar — visível só para roles com acesso | ✅ | **Corrigido:** `/dashboard` removido de `ALWAYS_VISIBLE_HREFS`; RBAC via policy (CLIENTE = NONE) |
| 4 | Prisma Import — somente `@/lib/prisma` | ✅ | Import correto em todas as rotas |
| 5 | Mock Data — sem dados hardcoded em produção | ✅ | **Corrigido:** `code-splitting-guide.tsx` deletado de `src/components/dashboard/` |
| 6 | empresaId — do contexto do usuário | ✅ | `user.empresaId` sem hardcode |
| 7 | Currency — USD com `en-US` | ✅ | ExecutiveTab e KPICard usam `en-US`/`USD` |
| 8 | Timezone — `America/Chicago` | ✅ | **Corrigido:** `RecentActivity` usa `Intl.DateTimeFormat` com `America/Chicago` |
| 9 | Suspense — lazy + Suspense com skeleton | ✅ | Page usa `lazy()` + múltiplos `<Suspense fallback={<Skel/>}>` |
| 10 | Loading — skeleton enquanto carrega | ✅ | `useDashboardData` expõe `loading`, spinner inline |
| 11 | Empty State — lista vazia com feedback | ✅ | RecentActivity mostra "Nenhuma atividade recente" |
| 12 | Error Handling — try/catch + mensagem amigável | ✅ | `withErrorHandler` wrapper, 403/429 com mensagem |
| 13 | Paginação — listas >20 itens | ✅ | Por design: máx 10 eventos e 5 clientes (não é listagem paginável) |
| 14 | Console.log — sem debug em produção | ✅ | Zero `console.log`; 2× `console.error` em ExecutiveTab/ReportBuilder (error logging aceitável) |
| 15 | Acessibilidade — `aria-label` + touch targets | ✅ | **Corrigido:** `aria-label` adicionado aos botões de QuickActions |

**Resultado: 15/15 ✅**

---

## Correções Aplicadas nesta Auditoria

### D-P2-01 — Sidebar RBAC para CLIENTE
- **Arquivo:** `src/shared/lib/sidebar-rbac.ts:12`
- **Problema:** `/dashboard` em `ALWAYS_VISIBLE_HREFS` exibia o link para role CLIENTE, que não tem permissão na policy
- **Fix:** Removido `/dashboard` do set. Dashboard agora segue o fluxo normal de `filterNavGroupsByRole` → `can(role, 'dashboard', 'read')` → CLIENTE = NONE → não aparece no menu

### D-P2-02 — Timezone em RecentActivity
- **Arquivo:** `src/components/dashboard/RecentActivity.tsx:61`
- **Problema:** `activity.timestamp` exibido como string ISO bruta (UTC)
- **Fix:** `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Chicago', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })`

### D-P3-01 — aria-label em QuickActions
- **Arquivo:** `src/components/dashboard/QuickActions.tsx:64`
- **Fix:** `aria-label={action.label}` adicionado ao elemento `<button>`

### D-P3-02 — Arquivo de guia de dev removido
- **Arquivo:** `src/components/dashboard/code-splitting-guide.tsx`
- **Ação:** Deletado. Conteúdo era documentação de padrões, não código de produção

---

## Destaques de Qualidade

- **Performance excelente:** 16 queries em paralelo com `Promise.all` no executive route
- **Cache inteligente:** `withBusinessCache` com TTL 120s prod / 30s dev, por role+period
- **Rate limiting:** Ambas as rotas protegidas com rate limit e header `Retry-After`
- **Code splitting:** Todos os componentes pesados com `lazy()` + `Suspense`
- **Sem N+1:** Nenhum `await` dentro de loops em toda a camada de dados
- **Testes existem:** Unit tests para ambas as APIs + E2E spec

---

## Validação Técnica

```
npx tsc --noEmit → exit code 0 (zero erros)
```

---

## Certificação (Histórica)

> Este certificado v1.0 foi válido no contexto daquela auditoria.
> Após reauditoria profunda posterior, o status operacional passou a depender das correções de hardening P1/P2 e da nova rodada de regressão.
> **Não usar este arquivo isoladamente para declarar Production Ready atual.**
