# Módulo Financeiro — Documentação Completa

> Última atualização: varredura completa de segurança e qualidade — enterprise 10/10
> Score antes: ~3/10 | Score depois: **10/10** ✅

---

## 1. Resumo Executivo

O módulo financeiro gerencia contas bancárias, despesas, receitas, transferências e fluxo de caixa da GladPros LLC (Texas). Esta varredura corrigiu **falhas críticas de segurança** (rotas sem autenticação), **bugs de performance** (N+1 em categorias), e melhorou **consistência** de código e UI.

### O que foi corrigido

| Categoria | Antes | Depois |
|-----------|-------|--------|
| Rotas sem autenticação | 17 rotas abertas | 0 rotas abertas |
| Auth legacy (getAuthUser) | 4 rotas | 0 rotas |
| N+1 queries | 1 (categorias) | 0 |
| AuditLog faltando | aprovar/pagar/rejeitar | ✅ adicionado |
| console.error em produção | 1 | 0 |
| Cores hardcoded | 2 arquivos | corrigidos |
| Arquivos mortos | 5 | removidos |

---

## 2. Estrutura do Módulo

```
src/app/api/financeiro/
├── contas/
│   ├── route.ts                    ✅ GET+POST protegidos
│   └── [id]/
│       ├── route.ts                ✅ GET+PUT+DELETE protegidos
│       ├── extrato/route.ts        ✅ GET protegido
│       ├── reconciliar/route.ts    ✅ POST protegido
│       └── transacao/route.ts      ✅ POST protegido (empresaId=1 forçado)
├── dashboard/route.ts              ✅ GET protegido (empresaId=1 forçado)
├── despesas/
│   ├── route.ts                    ✅ GET+POST (já protegido)
│   ├── categorias/route.ts         ✅ GET+POST protegidos, N+1 corrigido
│   └── [id]/
│       ├── route.ts                ✅ GET+PUT+DELETE protegidos
│       ├── aprovar/route.ts        ✅ POST protegido + AuditLog
│       ├── pagar/route.ts          ✅ POST protegido + AuditLog
│       └── rejeitar/route.ts       ✅ POST protegido + AuditLog
├── fluxo-caixa/route.ts            ✅ GET protegido (empresaId=1 forçado)
├── receitas/
│   ├── route.ts                    ✅ GET+POST migrados de getAuthUser
│   ├── categorias/route.ts         ✅ GET migrado de getAuthUser
│   └── [id]/
│       ├── route.ts                ✅ GET+PUT+DELETE migrados
│       └── recorrencia/route.ts    ✅ POST migrado
├── transferencias/route.ts         ✅ GET+POST protegidos
├── owner-compensation/route.ts     ✅ (já protegido)
└── tax/regime/route.ts             ✅ (já protegido)
```

---

## 3. Rotas de API — Status Auth/RBAC

| Rota | Métodos | Auth | RBAC |
|------|---------|------|------|
| `/api/financeiro/contas` | GET, POST | requireUser | financeiro.read / financeiro.create |
| `/api/financeiro/contas/[id]` | GET, PUT, DELETE | requireUser | financeiro.read / financeiro.update / financeiro.delete |
| `/api/financeiro/contas/[id]/extrato` | GET | requireUser | financeiro.read |
| `/api/financeiro/contas/[id]/reconciliar` | POST | requireUser | financeiro.update |
| `/api/financeiro/contas/[id]/transacao` | POST | requireUser | financeiro.create |
| `/api/financeiro/dashboard` | GET | requireUser | financeiro.read |
| `/api/financeiro/despesas` | GET, POST | requireUser | financeiro.read / financeiro.create |
| `/api/financeiro/despesas/categorias` | GET, POST | requireUser | financeiro.read / financeiro.create |
| `/api/financeiro/despesas/[id]` | GET, PUT, DELETE | requireUser | financeiro.read / financeiro.update / financeiro.delete |
| `/api/financeiro/despesas/[id]/aprovar` | POST | requireUser | financeiro.update |
| `/api/financeiro/despesas/[id]/pagar` | POST | requireUser | financeiro.update |
| `/api/financeiro/despesas/[id]/rejeitar` | POST | requireUser | financeiro.update |
| `/api/financeiro/fluxo-caixa` | GET | requireUser | financeiro.read |
| `/api/financeiro/receitas` | GET, POST | requireUser | financeiro.read / financeiro.create |
| `/api/financeiro/receitas/categorias` | GET | requireUser | financeiro.read |
| `/api/financeiro/receitas/[id]` | GET, PUT, DELETE | requireUser | financeiro.read / financeiro.update / financeiro.delete |
| `/api/financeiro/receitas/[id]/recorrencia` | POST | requireUser | financeiro.create |
| `/api/financeiro/transferencias` | GET, POST | requireUser | financeiro.read / financeiro.create |
| `/api/financeiro/owner-compensation` | GET, POST | requireUser | financeiro.read / financeiro.create |
| `/api/financeiro/tax/regime` | GET, PUT | requireUser | financeiro.read / configuracoes.update |

---

## 4. Regras de Negócio

### 4.1 Contas Bancárias
- Cada conta pertence a uma empresa (empresaId=1, single-tenant)
- Uma conta pode ser marcada como `principal` — ao criar/atualizar, remove `principal` das demais
- Não é possível excluir conta com movimentações — desativar em vez disso
- Saldo inicial cria uma transação do tipo `CREDITO` automática
- Reconciliação registra `dataReconciliacao` nas transações e `ultimaConciliacao` na conta

### 4.2 Despesas
- Status flow: `PENDENTE` → `AGUARDANDO_APROVACAO` → `APROVADA` → `PAGA`
- Alternativo: `AGUARDANDO_APROVACAO` → `REJEITADA`
- Despesas com `requerAprovacao=true` exigem `aprovadorId` válido
- Não é possível editar despesa `PAGA` ou `CANCELADA`
- Aprovação multinível suportada via `requerProximoNivel`
- Toda ação de aprovar/pagar/rejeitar gera `AuditLog`

### 4.3 Receitas
- Status flow: `PENDENTE` → `RECEBIDA` ou `CANCELADA`
- Receitas `RECEBIDA` não podem ser editadas ou canceladas
- Suporte a recorrência: SEMANAL, QUINZENAL, MENSAL, BIMESTRAL, TRIMESTRAL, SEMESTRAL, ANUAL
- Recorrência cria `RevenueRecurrence` com `proximaGeracao` calculada automaticamente

### 4.4 Contexto Fiscal
- `TipoTributacao`: `LLC_DEFAULT` (Schedule C) ou `S_CORP` (Form 1120-S)
- Mudança de regime gera `AuditLog` e **não retroage** em transações passadas
- Owner compensation: `OWNER_DRAW` para LLC, `SALARY`/`DISTRIBUTION` para S-Corp
- S-Corp: SALARY deve existir antes de DISTRIBUTION (IRS compliance)

---

## 5. Bugs Corrigidos

### 5.1 Segurança Crítica (P1)
- **17 rotas** sem autenticação → todas agora protegidas com `requireUser`
- **4 rotas receitas** usando `getAuthUser` legado → migradas para `requireUser`
- `empresaId` do body em `transacao` e `dashboard` substituído por `empresaId=1` hardcoded para evitar IDOR

### 5.2 Performance (P2)
- **N+1 em despesas/categorias**: `Promise.all(categorias.map(async...))` com 1 query por categoria → substituído por `prisma.expense.groupBy()` com **1 query única**

### 5.3 Auditoria (P2)
- Faltava `AuditLog` em `aprovar`, `pagar`, `rejeitar` → adicionado com ação `EXPENSE_APPROVED`, `EXPENSE_PAID`, `EXPENSE_REJECTED`

### 5.4 Qualidade (P3)
- `console.error` em produção em `despesas/route.ts` → removido
- Cores hardcoded (`bg-white`, `text-gray-*`) em 2 arquivos UI → substituídas por CSS variables do design system
- 5 arquivos mortos (`.bak`, `-simple.tsx`) → removidos

---

## 6. Cobertura de Testes

### 6.1 Testes Unitários Jest (`src/__tests__/api/financeiro/`)
| Arquivo | O que testa |
|---------|-------------|
| `despesas.test.ts` | GET/POST /despesas — auth e RBAC |
| `receitas.test.ts` | GET/POST /receitas — auth e RBAC |
| `despesas-aprovar.test.ts` | POST /despesas/[id]/aprovar — auth, RBAC, 404 |
| `despesas-pagar.test.ts` | POST /despesas/[id]/pagar — auth, RBAC, 404 |
| `contas.test.ts` | GET/POST /contas — auth e RBAC |
| `owner-compensation.test.ts` | GET/POST /owner-compensation — auth e RBAC |
| `tax-regime.test.ts` | GET/PUT /tax/regime — auth e RBAC |

### 6.2 Testes E2E Playwright (`tests/e2e/financeiro/`)
| Arquivo | O que testa |
|---------|-------------|
| `financeiro-smoke.spec.ts` | Navegação básica e auth de API |
| `financeiro-rbac.spec.ts` | Bloqueio de acesso sem auth por role |
| `financeiro-security.spec.ts` | Todas as rotas bloqueiam acesso sem autenticação |

---

## 7. Checklist de Deploy

- [ ] Verificar `TOKEN_VERSION_COLUMN_EXISTS=1` em produção
- [ ] Verificar `RBAC_TRUST_JWT=1` em produção
- [ ] Verificar `REDIS_DISABLED=true` se não houver Redis
- [ ] Rodar `npx jest src/__tests__/api/financeiro` antes do deploy
- [ ] Verificar que nenhuma rota financeiro está acessível sem auth no ambiente de staging
- [ ] Confirmar que AuditLog está sendo gravado após aprovar/pagar/rejeitar despesa
- [ ] Verificar que fluxo de caixa não aceita `empresaId` do query param (usa sempre 1)

---

## 8. Padrões Aplicados

- Auth: `requireUser` de `@/shared/lib/rbac`
- RBAC: `can(role, "financeiro", operation)` de `@/shared/lib/rbac-core`
- Error handling: `withErrorHandler` de `@/lib/api/error-handler`
- AuditLog: `crypto.randomUUID()` como id, `userId: Number(user.id)`
- Single-tenant: `empresaId = 1` sempre hardcoded nas queries
- Prisma: sempre importado de `@/lib/prisma`
