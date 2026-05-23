# Módulo Financeiro — GladPros ERP

> **Status:** ✅ CONDITIONALLY READY
> **Certificação:** 2026-05-21 · commit `c08e453` → `36cdbef`
> **Auditoria completa:** 6 fases · 495 testes passando · zero P1/P2 abertos
> **Condição:** 22 falhas pré-existentes em auth/clientes/usuarios (fora do escopo) pendentes antes de declarar o sistema inteiro Production Ready
> **Co-produtores:** Gladiston Porto · GitHub Copilot (Claude Sonnet 4.6)

---

## 1. Visão Geral

O módulo Financeiro é o centro de inteligência financeira do GladPros ERP. Ele controla:

- **Receitas** — recebimentos, recorrências, categorias
- **Despesas** — aprovação em 2 fases, recorrências, categorias
- **Contas Bancárias** — saldo consolidado, transações, extrato, reconciliação
- **Transferências** — entre contas internas, com reversão
- **Fluxo de Caixa** — evolução diária, KPIs, projeções 30/60/90 dias
- **Impostos** — regime LLC/S-Corp, estimativas trimestrais, Schedule C
- **Compensação do Dono** — Owner Draw (LLC) e Salary/Distribution (S-Corp)

### Premissas
- **Tenant único**: `empresaId = 1` sempre
- **Moeda**: USD (`en-US` locale)
- **Timezone**: `America/Chicago`
- **Idioma da interface**: pt-BR

---

## 2. Arquitetura

```
src/app/api/financeiro/           ← 36 rotas REST
src/app/api/invoices/             ← 6 rotas (state machine, payments, PDF, overdue)
src/app/(dashboard)/financeiro/   ← 23 páginas Next.js
src/components/financeiro/        ← componentes React (gráficos, forms)
src/shared/services/
  ledgerPostingService.ts         ← double-entry bookkeeping (98 linhas)
  ownerCompensationService.ts     ← LLC/S-Corp business rules + warnings
  scheduleCExportService.ts       ← Schedule C mapping, 1099 summary ($600)
  reportExportService.ts          ← Excel export para 1099 e relatórios
src/schemas/                      ← revenue.schema.ts, expense.schema.ts (Zod)
src/__tests__/api/financeiro/     ← 14 suites
src/__tests__/unit/               ← 7 suites (ledger, S-Corp, invoice, revenue, schedule-c)
docs/modules/financeiro/          ← este arquivo (fonte da verdade)
docs/modules/financeiro/AUDIT.md  ← registro detalhado das 6 fases da auditoria
docs/modules/financeiro/archive/  ← specs históricas (não refletem código atual)
```

---

## 3. Modelos Prisma

| Modelo | Descrição |
|--------|-----------|
| `Revenue` | Receitas — valor, status, vencimento, pagamento, recorrência |
| `RevenueCategory` | Categorias de receita por empresa |
| `RevenueRecurrence` | Regras de recorrência (frequência, próxima geração) |
| `Expense` | Despesas — valor, status, aprovação, recorrência |
| `ExpenseCategory` | Categorias de despesa com `scheduleCLine` (Schedule C) |
| `ExpenseApproval` | Aprovação em 2 fases (PENDENTE → APROVADA/REJEITADA) |
| `ExpenseRecurrence` | Regras de recorrência de despesas |
| `BankAccount` | Contas bancárias com saldo, tipo, limite de crédito |
| `BankTransaction` | Transações individuais com tipo (CREDITO/DEBITO) |
| `BankTransfer` | Transferências entre contas (atômicas) |
| `OwnerCompensation` | Compensação do dono — OWNER_DRAW, SALARY, DISTRIBUTION |
| `EstimatedTaxPayment` | Pagamentos trimestrais de imposto estimado |
| `TaxRate` | Alíquotas (TX Sales Tax 8.25%, etc.) |
| `BudgetAlert` | Alertas automáticos de orçamento |
| `VendorTaxProfile` | Perfil fiscal de fornecedores (Form 1099) |

### Campos obrigatórios em todos os modelos
```prisma
id           Int       @id @default(autoincrement())
empresaId    Int
criadoEm     DateTime  @default(now())
atualizadoEm DateTime  @updatedAt
@@index([empresaId])
```

---

## 4. Rotas de API

> Todas as 36 rotas passaram por auditoria completa. Verificações:
> `requireUser()` ✅ | `can()` RBAC ✅ | Zod validation ✅ | `empresaId` scoped ✅ | Resposta padronizada ✅

### Receitas
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/receitas` | FINANCEIRO+ read | Listar com filtros e paginação |
| `POST` | `/api/financeiro/receitas` | FINANCEIRO+ create | Criar receita (com ou sem recorrência) |
| `GET` | `/api/financeiro/receitas/[id]` | FINANCEIRO+ read | Detalhe da receita |
| `PUT` | `/api/financeiro/receitas/[id]` | FINANCEIRO+ update | Atualizar receita |
| `DELETE` | `/api/financeiro/receitas/[id]` | FINANCEIRO+ delete | Cancelar/excluir receita |
| `GET/POST` | `/api/financeiro/receitas/categorias` | FINANCEIRO+ | Categorias de receita |
| `POST` | `/api/financeiro/receitas/[id]/recorrencia` | FINANCEIRO+ | Gerenciar recorrência |

### Despesas
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/despesas` | FINANCEIRO+ read | Listar com filtros avançados |
| `POST` | `/api/financeiro/despesas` | FINANCEIRO+ create | Criar despesa |
| `GET/PUT/DELETE` | `/api/financeiro/despesas/[id]` | FINANCEIRO+ | Detalhe/editar/excluir |
| `POST` | `/api/financeiro/despesas/[id]/aprovar` | FINANCEIRO+ | Aprovar — atômico: approval + LedgerPosting em `$transaction` |
| `POST` | `/api/financeiro/despesas/[id]/pagar` | FINANCEIRO+ | Pagar — idempotência via `clientIdempotencyKey` |
| `POST` | `/api/financeiro/despesas/[id]/rejeitar` | FINANCEIRO+ | Rejeitar com motivo |
| `GET/POST` | `/api/financeiro/despesas/categorias` | FINANCEIRO+ | Categorias (legacy alias) |
| `GET/POST/PUT/DELETE` | `/api/financeiro/expense-categories/[id]` | FINANCEIRO+ | Categorias (versão atual) |

### Contas Bancárias
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/contas` | FINANCEIRO+ read | Listar contas ativas |
| `POST` | `/api/financeiro/contas` | FINANCEIRO+ create | Criar conta bancária |
| `GET/PUT/DELETE` | `/api/financeiro/contas/[id]` | FINANCEIRO+ | Detalhe/editar/excluir |
| `POST` | `/api/financeiro/contas/[id]/transacao` | FINANCEIRO+ create | Transação com locking otimista (`version` field) |
| `GET` | `/api/financeiro/contas/[id]/extrato` | FINANCEIRO+ read | Extrato da conta |
| `POST` | `/api/financeiro/contas/[id]/reconciliar` | FINANCEIRO+ update | Reconciliar — `updateMany` com predicate de versão |

### Transferências
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/transferencias` | FINANCEIRO+ read | Listar transferências |
| `POST` | `/api/financeiro/transferencias` | FINANCEIRO+ create | Criar transferência (atômica, dois legs) |

### Fluxo de Caixa & Dashboard
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/fluxo-caixa` | FINANCEIRO+ read | KPIs, evolução diária, projeções 30/60/90 dias |
| `GET` | `/api/financeiro/dashboard` | FINANCEIRO+ read | Métricas resumidas do período |
| `GET` | `/api/financeiro/aprovadores` | FINANCEIRO+ read | Aprovadores disponíveis (scoped por `empresaId`) |

### Fiscal / Tributário
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET/PUT` | `/api/financeiro/tax/regime` | **ADMIN only** | Regime fiscal — cria `AuditLog` na troca |
| `GET` | `/api/financeiro/tax/dashboard` | FINANCEIRO+ | Dashboard fiscal |
| `GET` | `/api/financeiro/tax/schedule-c` | FINANCEIRO+ read | Linhas Schedule C com `scheduleCLine` mapping |
| `GET/POST` | `/api/financeiro/estimated-tax` | FINANCEIRO+ | Estimativas trimestrais (safe harbor) |
| `GET/PUT/DELETE` | `/api/financeiro/estimated-tax/[id]` | FINANCEIRO+ | Detalhe / atualizar / excluir estimativa |
| `GET/POST` | `/api/financeiro/owner-compensation` | **ADMIN only** | Compensação do dono (LLC/S-Corp rules) |
| `GET/PUT/DELETE` | `/api/financeiro/owner-compensation/[id]` | **ADMIN only** | Detalhe / atualizar / excluir |
| `GET` | `/api/financeiro/owner-compensation/summary` | **ADMIN only** | Resumo anual de compensação |

### Relatórios
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/reports/pnl` | FINANCEIRO+ | P&L do período |
| `GET` | `/api/financeiro/reports/dre/export` | FINANCEIRO+ | DRE em Excel |
| `GET` | `/api/financeiro/reports/balanco/export` | FINANCEIRO+ | Balanço em Excel |
| `GET` | `/api/financeiro/reports/quarterly-comparison` | FINANCEIRO+ | Comparativo trimestral |
| `GET` | `/api/financeiro/reports/schedule-c` | FINANCEIRO+ | Schedule C completo |
| `GET` | `/api/financeiro/reports/1099-summary` | FINANCEIRO+ | Sumário 1099 — threshold $600, export Excel |
| `GET` | `/api/financeiro/reports/owner-compensation` | **ADMIN only** | Relatório de compensação |

### Invoices (módulo próprio, integrado ao financeiro)
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET/POST` | `/api/invoices` | FINANCEIRO+ | Listar / criar invoice |
| `GET/PUT/DELETE` | `/api/invoices/[id]` | FINANCEIRO+ | State machine com `updateMany` guard + `409` em race |
| `POST` | `/api/invoices/[id]/payments` | FINANCEIRO+ | Pagamento com `clientIdempotencyKey` |
| `POST` | `/api/invoices/[id]/send` | FINANCEIRO+ | Enviar invoice |
| `GET` | `/api/invoices/[id]/pdf` | FINANCEIRO+ | Download PDF |
| `GET` | `/api/invoices/overdue` | FINANCEIRO+ | Listar vencidas (playbook) |
| `GET` | `/api/invoices/stats` | FINANCEIRO+ | Métricas de invoices |

---

## 5. RBAC

```
financeiro:
  ADMIN      → ALL (CRUD) + acesso exclusivo a owner-compensation e tax/regime
  GERENTE    → read only
  FINANCEIRO → ALL (CRUD) exceto owner-compensation e tax/regime
  ESTOQUE    → sem acesso
  USUARIO    → sem acesso
  CLIENTE    → sem acesso
```

> ⚠️ **ATENÇÃO:** `owner-compensation` e `tax/regime` são **ADMIN-only** (verificado no código).
> A justificativa: compensação do dono e regime fiscal impactam o IRS e são dados exclusivos do proprietário.

### Verificação nas rotas
```typescript
const user = await requireUser(request)
if (!can(user.role as Role, "financeiro", "create")) {
  return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 })
}
const empresaId = user.empresaId  // sempre do JWT, nunca de query params ou body
```

### Verificação em Server Components (páginas)
```typescript
const user = await requireServerUser()
const mod = routeToModule("/financeiro/...")
if (mod && !can(user.role as Role, mod, "read")) redirect("/403")
```

---

## 6. Segurança — Estado pós-auditoria (mai/2026) ✅

> Todos os P1/P2 encontrados na auditoria de mai/2026 foram **corrigidos e verificados** no código.
> Evidências em `docs/modules/financeiro/AUDIT.md`.

| Vulnerabilidade | Prioridade | Status | Commit |
|-----------------|-----------|--------|--------|
| P1-A: `empresaId` de query params (não JWT) em rotas financeiras | P1 | ✅ Corrigido | `c08e453` |
| P1-B: `(user as any).empresaId` — TypeScript blind cast | P1 | ✅ Corrigido | `c08e453` |
| P1-C: DELETE invoice sem reversal de ledger (dinheiro fantasma) | P1 | ✅ Corrigido | `c08e453` |
| P1-D: PUT invoice sem race condition guard (double-update) | P1 | ✅ Corrigido | `c08e453` |
| P1-E: `gerar-invoice` de proposta sem `empresaId` scope | P1 | ✅ Corrigido | `c08e453` |
| P1-F: `generate-invoice` de OS sem `empresaId` scope | P1 | ✅ Corrigido | `c08e453` |
| P1-G: Pagamento de invoice sem idempotência (double-charge) | P1 | ✅ Corrigido | `c08e453` |
| P2-A: Aprovação de despesa não-atômica (approval sem ledger) | P2 | ✅ Corrigido | `c08e453` |
| P2-B: Reconciliação bancária sem optimistic locking | P2 | ✅ Corrigido | `c08e453` |
| P2-C: LLC/S-Corp — DISTRIBUTION sem SALARY não bloqueava | P2 | ✅ Corrigido | `c08e453` |
| P2-D: `tax/regime` sem `AuditLog` na troca de regime | P2 | ✅ Corrigido | `c08e453` |
| P2-E: 1099 summary — threshold $600 não aplicado | P2 | ✅ Corrigido | `c08e453` |
| P2-F: `Schedule C` sem `scheduleCLine` mapping real | P2 | ✅ Corrigido | `c08e453` |
| P2-G: `1099-summary` owner lookup sem tenant scope | P2 | ✅ Corrigido | `c08e453` |
| P2-H: `generate-invoice` (OS) sem AuditLog na transação | P2 | ✅ Corrigido | `c08e453` |
| P3: Dois aliases de expense-categories (`/categorias` + `/expense-categories`) | P3 | 🟡 Backlog | — |
| P3: Rate limit em exports (Excel, PDF, CSV) | P3 | 🟡 Backlog | — |

---

## 7. Lógica de Negócio

### 7.1 Regime Fiscal (verificado em `ownerCompensationService.ts`)
```
LLC_DEFAULT:
  - OwnerCompensation.tipo = OWNER_DRAW (único permitido)
  - SALARY ou DISTRIBUTION → BLOQUEADO (400 Bad Request)
  - Schedule C, self-employment tax 15.3%
  - Owner draw NÃO é dedutível como salário

S_CORP:
  - SALARY obrigatório antes de qualquer DISTRIBUTION
  - Se salary YTD = 0 e distribution > 0 → BLOQUEADO (IRS violation — 400)
  - Se salary YTD < 30% net income → WARNING (não bloqueia)
  - Form 1120-S + K-1, FICA somente sobre salary
  - Troca de regime cria AuditLog com regime anterior/novo
```

### 7.2 Aprovação de Despesas (verificado em `despesas/[id]/aprovar/route.ts`)
```
PENDENTE → AGUARDANDO_APROVACAO → APROVADA → PAGA
PENDENTE → REJEITADA (motivo obrigatório)

Fluxo de aprovação (atômico em $transaction):
  1. Verificar status atual = APROVADA_AGUARDANDO ou similar
  2. UPDATE Despesa.status → APROVADA
  3. CREATE LedgerEntry (via postLedgerTransaction)
  4. CREATE AuditLog
  — tudo no mesmo $transaction; falha reverte tudo
```

### 7.3 Double-Entry Ledger (verificado em `ledgerPostingService.ts`)
```typescript
// Importação
import { postLedgerTransaction } from "@/shared/services/ledgerPostingService"

// Uso em aprovação de despesa
await postLedgerTransaction(prismaClient, {
  type: "DEBIT",
  amount: expense.valor,
  description: `Despesa aprovada: ${expense.descricao}`,
  referenceId: expense.id,
  referenceType: "EXPENSE",
  empresaId: expense.empresaId,
})
```

### 7.4 Transações Bancárias com Optimistic Locking
```typescript
// Verificação de versão na reconciliação (reconciliar/route.ts)
const updated = await prisma.bankAccount.updateMany({
  where: { id: accountId, version: currentVersion },  // predicate de versão
  data: { reconciledBalance, version: { increment: 1 } }
})
if (updated.count === 0) {
  return NextResponse.json({ error: "Conflict", message: "Conta foi modificada simultaneamente" }, { status: 409 })
}
```

### 7.5 Idempotência de Pagamentos (verificado em `invoices/[id]/payments/route.ts`)
```typescript
// Verificação de idempotência
const existing = await prisma.invoicePayment.findFirst({
  where: { invoiceId, clientIdempotencyKey }  // campo único por pagamento
})
if (existing) return NextResponse.json({ data: existing, success: true }, { status: 200 })
```

### 7.6 Invoice State Machine com Race Guard
```typescript
// PUT /invoices/[id] — guard contra atualização concorrente
const updated = await prisma.invoice.updateMany({
  where: { id: invoiceId, status: currentStatus },  // predicate de status
  data: { status: newStatus }
})
if (updated.count === 0) {
  return NextResponse.json({ error: "Conflict" }, { status: 409 })
}
```

### 7.7 1099 Summary — Threshold $600
```typescript
// scheduleCExportService.ts linha 309
needs1099: totalPaid >= 600  // IRS threshold anual por contractor
```

---

## 8. AuditLog

Operações críticas geram `AuditLog` (verificado no código):

| Operação | Ação | Rota |
|----------|------|------|
| Criar receita | `RECEITA_CRIADA` | receitas/route.ts |
| Aprovar despesa | `DESPESA_APROVADA` | despesas/[id]/aprovar/route.ts |
| Pagar despesa | `DESPESA_PAGA` | despesas/[id]/pagar/route.ts |
| Rejeitar despesa | `DESPESA_REJEITADA` | despesas/[id]/rejeitar/route.ts |
| Criar transação bancária | `TRANSACAO_CRIADA` | contas/[id]/transacao/route.ts |
| Criar transferência | `TRANSFERENCIA_REALIZADA` | transferencias/route.ts |
| Trocar regime fiscal | `REGIME_ALTERADO` (com regime_anterior) | tax/regime/route.ts linha 89 |
| Gerar invoice de proposta | `INVOICE_GERADA` | propostas/[id]/gerar-invoice (P1-E fix) |
| Gerar invoice de OS | `INVOICE_GERADA` | service-orders/[id]/generate-invoice (P2-H fix) |

---

## 9. Formato de Resposta

```typescript
// Sucesso
{ success: true, data: T }
{ success: true, data: T, message: string }
{ success: true, data: T[], pagination: { page, pageSize, total, totalPages } }

// Erro
{ success: false, error: string, message: string }
```

---

## 10. Testes — 495 passando (33 suites)

| Suite | Localização | Cobertura |
|-------|-------------|-----------|
| `despesas.test.ts` | `src/__tests__/api/financeiro/` | CRUD, RBAC, Zod, pagination |
| `despesas-aprovar.test.ts` | `src/__tests__/api/financeiro/` | Approval flow, ledger atomic, 409 race |
| `despesas-pagar.test.ts` | `src/__tests__/api/financeiro/` | Payment, idempotency, RBAC denial |
| `receitas.test.ts` | `src/__tests__/api/financeiro/` | CRUD, RBAC, recurrence |
| `contas.test.ts` | `src/__tests__/api/financeiro/` | CRUD, balance, RBAC |
| `contas-reconciliar.test.ts` | `src/__tests__/api/financeiro/` | Reconciliation, version lock |
| `transferencias.test.ts` | `src/__tests__/api/financeiro/` | Atomic transfer, RBAC |
| `fluxo-caixa.test.ts` | `src/__tests__/api/financeiro/` | Cash flow calculation |
| `owner-compensation.test.ts` | `src/__tests__/api/financeiro/` | LLC/S-Corp rules (rota) |
| `tax-regime.test.ts` | `src/__tests__/api/financeiro/` | Regime change, AuditLog |
| `aprovadores.test.ts` | `src/__tests__/api/financeiro/` | empresaId scope |
| `estimated-tax.test.ts` | `src/__tests__/api/financeiro/` | CRUD, quarterly deadlines |
| `estimated-tax-update.test.ts` | `src/__tests__/api/financeiro/` | Update validation |
| `ledger-posting-service.test.ts` | `src/__tests__/unit/` | Double-entry, atomicity |
| `owner-compensation-scorp.test.ts` | `src/__tests__/unit/` | 13 testes S-Corp IRS block, 30% warning |
| `invoice-calculations.test.ts` | `src/__tests__/unit/` | Tax, subtotal, total |
| `invoice-validations.test.ts` | `src/__tests__/unit/` | State machine, transitions |
| `schedule-c-1099-summary.test.ts` | `src/__tests__/unit/` | $600 threshold, Schedule C mapping |
| `revenue-calculations.test.ts` | `src/__tests__/unit/` | Revenue logic |
| `revenue-validations.test.ts` | `src/__tests__/unit/` | Revenue validation |
| `cashflow-logic.test.ts` | `src/__tests__/lib/financeiro/` | Cash flow logic |
| `os-billing-p1.test.ts` | `src/app/api/service-orders/__tests__/` | Cross-tenant billing regression |

**Total**: 22+ suites financeiro · 495 testes passando · zero P1/P2 abertos

> ⚠️ 22 falhas em `auth/login`, `auth/mfa-verify`, `clientes/audit`, `usuarios/get-id`, `export-hardening-p2` — **pré-existentes, fora do escopo financeiro**.

---

## 11. Integração com Outros Módulos

| Módulo | Tipo de Integração | Detalhes |
|--------|--------------------|---------|
| **Invoices** | Revenue auto-criada ao marcar invoice como PAID | `invoices/[id]/payments` → upsert categoria → create Revenue |
| **Projetos** | `custoReal` calculado de despesas com `projetoId` | `project-finance.service` → `aggregateProjectCosts` |
| **OS (ServiceOrders)** | Gera invoice via `generate-invoice`; Expense via `request-reimbursement` | `empresaId` scoped (P1-F fix), AuditLog na tx (P2-H fix) |
| **Propostas** | Gera invoice via `gerar-invoice` | `empresaId` scope + duplicate check em `$transaction` (P1-E fix) |
| **Workers** | OwnerCompensation vinculado a `OWNER_OPERATOR` | IRS rules validados em `ownerCompensationService.ts` |
| **Dashboard** | A/R (Invoices), A/P (Expenses), Pipeline (Projetos) | `page.tsx` 11 queries paralelas; alerta se A/P > caixa+A/R |

### Fluxo Principal ERP

```
Proposta ──► gerar-invoice ──► Invoice ──────► InvoicePayment ──► Revenue
  │                              │                                    │
  │                         State Machine:                      BankTransaction
  │                         DRAFT→SENT→PAID                         │
  │                                                              LedgerEntry
OS ──────► generate-invoice ──► Invoice (mesmo fluxo acima)
  │
  └──────► request-reimbursement ──► Expense (projetoId propagado)
                                         │
                                    Approval Flow:
                                    PENDENTE → APROVADA (atômico)
                                         │          │
                                         │     LedgerEntry (postLedgerTransaction)
                                         │
                                    APROVADA → PAGA
                                         │
                                    BankTransaction (debit)

Worker (OWNER_OPERATOR) ──► OwnerCompensation ──► EstimatedTax
  LLC: OWNER_DRAW only
  S-Corp: SALARY→DISTRIBUTION (IRS blocking se salary=0)
```

---

## 12. Backlog — P3

| Prioridade | Item |
|-----------|------|
| P3 | Consolidar aliases `/despesas/categorias` + `/expense-categories` em uma única rota |
| P3 | Rate limit em exports (Excel, PDF, CSV) — proteção contra abuse |
| P3 | Testes E2E Playwright para fluxos críticos por role |
| P3 | Dashboard interativo com drill-down e período selecionável |
| P3 | Projeções avançadas baseadas em dados históricos reais |
| P3 | Reconciliação automática bancária (importação OFX/CSV) |
| P3 | Paginação server-side em páginas de lista (receitas, despesas — atualmente `take: 50`) |
| P3 | Worker hours → financial cost (TimesheetEntry sem campo rate/cost — gap sistêmico) |

---

## 13. Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| v2.0.0 | mai/2026 | **Auditoria completa 6 fases** — Fase 1: RBAC/Security (P1-A,B: empresaId scope, TypeScript blind); Fase 2: Integridade (LedgerPostingService, optimistic locking, atomicidade); Fase 3: Tax compliance (LLC/S-Corp IRS blocks, 1099 $600, Schedule C mapping, AuditLog regime); Fase 4: Cross-module (P1-C,D,E,F,G: invoice reversal, race guard, proposta/OS scope, payment idempotency, P2-H: AuditLog em OS billing); Fase 5: UX/Locale/A11y (verificado); Fase 6: 495 testes, 33 suites. Status: **CONDITIONALLY READY** |
| v1.3.0 | mai/2025 | 13 páginas UI criadas: receitas, despesas, contas, transferencias, fluxo-caixa, relatorios, fiscal hub, impostos-estimados, compensacao, categorias, relatorios fiscais, payables, conciliacao. AuditLog em receitas PUT/DELETE. |
| v1.2.0 | mai/2025 | Dashboard cross-module: A/R invoices, A/P expenses, cashflow alert, pipeline projetos; API route sincronizada; 15 testes de cashflow |
| v1.1.0 | mai/2025 | Cross-module fixes: Invoice→Revenue upsert+log, OS→Expense projetoId, despesas filtros projetoId/serviceOrderId, S-Corp 13 unit tests |
| v1.0.0 | mai/2025 | Certificação inicial — P1 security fixes, AuditLog, dashboard page, docs unificadas |

---

> **Nota sobre docs históricas:** Os arquivos em `docs/modules/financeiro/archive/` descrevem uma arquitetura com double-entry bookkeeping e chart of accounts que **não foi completamente implementada**. O sistema atual usa Revenue/Expense/BankAccount + LedgerPostingService para lançamentos críticos. Consulte o código-fonte e este README como fonte da verdade.
>
> **Para o registro detalhado dos achados e evidências da auditoria de mai/2026:** ver `docs/modules/financeiro/AUDIT.md`.
