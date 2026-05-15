# Financeiro Module — Complete Circle Playbook

> **GladPros ERP** | Single-tenant | Dallas, TX | USD / America/Chicago  
> Version: 1.0.0 | Status: Production-Ready Candidate

---

## 1. What This Module Controls

The Financeiro module is the **financial command center** of GladPros. It does not create revenue, expenses, or invoices — those happen in Invoice, OS, and Purchase modules. Instead, Financeiro **aggregates, reports, tracks, and controls** all money movement.

### Core Responsibilities

| Area | What it does |
|------|-------------|
| **Contas Bancárias** | Bank accounts, balances, transaction history |
| **Receitas** | Revenue records (manual + auto from Invoice payments) |
| **Despesas** | Expense tracking with approval workflow |
| **Fluxo de Caixa** | Cash flow aggregation by period |
| **Transferências** | Inter-account transfers |
| **Owner Compensation** | OWNER_DRAW / SALARY / DISTRIBUTION with IRS rules |
| **Estimated Tax** | Quarterly tax estimates (LLC Schedule C / S-Corp) |
| **Tax Regime** | LLC_DEFAULT vs S_CORP election |
| **Reports** | P&L, balance, cash position |

---

## 2. Financial Circle — Cross-Module Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLETE FINANCIAL CIRCLE                         │
│                                                                      │
│  Invoice ──────────► Payment ──────────► Revenue (auto-created)     │
│      ↑                                       │                       │
│      │                                       ▼                       │
│  Projeto ◄──── BillingType ────────  Fluxo de Caixa               │
│      │                                       ▲                       │
│   Expense ◄── OS Reimbursement ──────────────┘                      │
│      │                                                               │
│      └──────► projetoId ──────────► ProjectHealthEngine             │
│                                                                      │
│  Worker ──────────────────────────► OwnerCompensation               │
│      └── OWNER_OPERATOR ─────────► IRS Rules (LLC/S-Corp)          │
│                                       │                              │
│  EstimatedTax ◄────────────────────── ┘                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Flow 1: Invoice → Payment → Revenue

### Trigger
`POST /api/invoices/[id]/payments` with a payment that brings invoice to **PAID** status.

### Steps
1. **Payment created** — `InvoicePayment` record saved
2. **Invoice updated** — status → `PAID`, `dataPagamento` set
3. **Revenue auto-created** — inside same transaction:
   - Lookup `RevenueCategory` for empresa; auto-create "Receita de Serviços" if none exists
   - Create `Revenue` with `invoiceId`, `valor`, `categoriaId`, `empresaId`
   - Revenue creation failure is **logged** but does NOT block payment (non-critical path)
4. **AuditLog created** — one entry per payment

### Key Files
- `src/app/api/invoices/[id]/payments/route.ts` — Revenue auto-creation (lines 176–218)
- `src/shared/lib/revenue-auto-create.ts` — (future: extract to service)

### Business Rules
- Partial payments (`PARTIAL_PAID`) do NOT create Revenue — only full `PAID`
- Revenue must always have a category (`categoriaId` NOT NULL)
- `empresaId` comes from the invoice, not hardcoded

### What Can Go Wrong
| Problem | Symptom | Fix |
|---------|---------|-----|
| No RevenueCategory exists | Revenue silently skipped (pre-fix: old bug) | Upsert creates default category |
| Revenue creation DB error | Payment succeeds, revenue lost | Error logged via `logger.error` — check logs |
| Invoice already PAID | 400 "already paid" | Guard in route before transaction |

---

## 4. Flow 2: OS → Expense → Approval → Payment

### Trigger
Technician submits receipt via `POST /api/service-orders/[id]/request-reimbursement`.

### Steps
1. **Attachment verified** — must be type `RECEIPT` with `receiptTotal`
2. **Expense created** — status `AGUARDANDO_APROVACAO`, `requerAprovacao: true`
   - `serviceOrderId` linked
   - `projetoId` propagated from OS if OS belongs to a project ← **fixed**
   - `empresaId` from JWT (`user.empresaId`) — not hardcoded
3. **Approval workflow** — `POST /api/financeiro/despesas/[id]/aprovar`
   - GERENTE or ADMIN can approve
   - Sets `status → APROVADA`
4. **Payment** — `POST /api/financeiro/despesas/[id]/pagar`
   - Sets `status → PAGA`, records `dataPagamento`

### Project Cost Impact
When expense has `projetoId`:
- `aggregateProjectCosts(projetoId)` includes this expense in `totalExpenses`
- `project-health.service.ts` includes it in committed costs
- `Projeto.custoReal` is a **cached snapshot** — updated manually via `POST /api/projetos/[id]/financeiro/costs`
- The health engine always computes real-time from Expense table

### Key Files
- `src/app/api/service-orders/[id]/request-reimbursement/route.ts`
- `src/app/api/financeiro/despesas/[id]/aprovar/route.ts`
- `src/app/api/financeiro/despesas/[id]/pagar/route.ts`
- `src/shared/lib/services/project-finance.ts` — `aggregateProjectCosts()`

---

## 5. Flow 3: Worker → Owner Compensation → Tax Estimate

### Trigger
ADMIN or FINANCEIRO creates compensation via `POST /api/financeiro/owner-compensation`.

### IRS Rules (AGENTS.md §13)

```
LLC_DEFAULT:
  ✅ OWNER_DRAW   → allowed
  ❌ SALARY       → blocked (code: LLC_INVALID_TYPE)
  ❌ DISTRIBUTION → blocked (code: LLC_INVALID_TYPE)

S_CORP:
  ❌ OWNER_DRAW   → blocked (code: SCORP_NO_DRAW)
  ✅ SALARY       → allowed
  ✅ DISTRIBUTION → allowed ONLY IF salary YTD > 0 (code: SCORP_SALARY_REQUIRED)
  ⚠️  WARNING     → LOW_SALARY_RATIO if salary YTD < 30% of total comp
```

### Pre-Conditions
- Worker must have `classification = OWNER_OPERATOR` (only one per empresa)
- Empresa must have `tipoTributacao` set (`LLC_DEFAULT` or `S_CORP`)

### Tax Estimate Impact
- `GET /api/financeiro/estimated-tax` uses YTD compensation + revenue data
- Self-employment tax (15.3%) applies to LLC OWNER_DRAW
- S-Corp: SE tax only on SALARY portion

### Key Files
- `src/shared/services/ownerCompensationService.ts` — `createCompensation()`, `validateCompensation()`, `getCompensationWarnings()`
- `src/app/api/financeiro/owner-compensation/route.ts`
- `src/app/api/financeiro/estimated-tax/route.ts`

---

## 6. RBAC — Who Can Do What

| Action | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO |
|--------|-------|---------|------------|---------|---------|
| View financeiro | ✅ | ✅ RO | ✅ ALL | ❌ | ❌ |
| Create expense | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve expense | ✅ | ✅ | ✅ | ❌ | ❌ |
| Pay expense | ✅ | ❌ | ✅ | ❌ | ❌ |
| Create revenue | ✅ | ❌ | ✅ | ❌ | ❌ |
| Transfer between accounts | ✅ | ❌ | ✅ | ❌ | ❌ |
| Owner compensation | ✅ | ❌ | ✅ | ❌ | ❌ |
| Tax regime change | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 7. Cross-Module Dependency Map

```
Financeiro READS FROM:
  Invoice      → InvoicePayment (auto-creates Revenue)
  ServiceOrder → Expense (via reimbursement, projetoId propagated)
  Projeto      → cost breakdown (via project-finance service)
  Worker       → OwnerCompensation (OWNER_OPERATOR classification)
  Empresa      → tax regime (tipoTributacao)

Financeiro WRITES TO:
  Revenue      → auto-created on PAID invoice
  Expense      → created from OS reimbursement
  AuditLog     → all create/update/delete operations

Other modules READ FROM Financeiro:
  Projetos     → ProjectHealthEngine reads Expense.projetoId
  Dashboard    → executive dashboard reads Revenue + Expense aggregates
  Reports      → P&L reads Revenue + Expense
```

---

## 8. Business State Machines

### Expense Status Machine
```
PENDENTE
  └─► AGUARDANDO_APROVACAO (if requerAprovacao = true)
       ├─► APROVADA ─────────────────► PAGA
       ├─► REJEITADA
       └─► CANCELADA
PENDENTE ─────────────────────────────► PAGA (if requerAprovacao = false)
PENDENTE / AGUARDANDO_APROVACAO ──────► CANCELADA
```

### Revenue Status Machine
```
PENDENTE ──► CONFIRMADA ──► CANCELADA
```

### Transferência — no status machine (single atomic creation)

---

## 9. Key API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/financeiro/despesas` | financeiro.read | List expenses — filters: status, tipo, projetoId, serviceOrderId |
| POST | `/api/financeiro/despesas` | financeiro.create | Create expense |
| POST | `/api/financeiro/despesas/[id]/aprovar` | financeiro.update | Approve expense |
| POST | `/api/financeiro/despesas/[id]/pagar` | financeiro.update | Pay expense |
| GET | `/api/financeiro/receitas` | financeiro.read | List revenues |
| GET/POST | `/api/financeiro/contas` | financeiro.read/create | Bank accounts |
| GET | `/api/financeiro/fluxo-caixa` | financeiro.read | Cash flow by period |
| GET/POST | `/api/financeiro/transferencias` | financeiro.read/create | Inter-account transfers |
| GET/POST | `/api/financeiro/owner-compensation` | financeiro.read/create | Owner compensation |
| GET | `/api/financeiro/estimated-tax` | financeiro.read | Quarterly tax estimate |
| GET/PUT | `/api/financeiro/tax` | configuracoes.read/update | Tax regime management |

---

## 10. Environment & Performance Requirements

- All Financeiro routes use `requireUser()` from `@/shared/lib/rbac` (single call per request)
- `empresaId` always from JWT — never from query params
- `RBAC_TRUST_JWT=1` in production eliminates DB lookup per request
- Fluxo-caixa aggregation: use `Promise.all` for parallel period queries
- All `findMany` in list endpoints are paginated (take/skip)
- Expense `@@index([empresaId])`, `@@index([projetoId])`, `@@index([serviceOrderId])` — verify these exist

---

## 11. Known Limitations & Debt

| Item | Severity | Description |
|------|---------|-------------|
| `requireServerUser` empresaId | Low | Still uses `?? 1` fallback in server components — debt item |
| `Projeto.custoReal` staleness | Low | Cached snapshot — only updated via explicit POST sync call |
| Fluxo-caixa from DB | Medium | Should consider caching for large datasets |
| No webhook for Revenue failure | Low | If Revenue creation fails silently, no alert is fired |

---

## 12. Audit Checklist Before Production

- [ ] All routes have `requireUser()` + `can()` checks
- [ ] `empresaId` comes from JWT in all POST routes
- [ ] S-Corp IRS rules tested (13 unit tests pass)
- [ ] Invoice→Revenue integration tested (16 tests pass)  
- [ ] OS→Expense→Projeto flow propagates `projetoId`
- [ ] Expense filters include `projetoId` and `serviceOrderId`
- [ ] All P1 bugs from audit are resolved
- [ ] No hardcoded `EMPRESA_ID = 1` constants
- [ ] AuditLog created for all CREATE/UPDATE/DELETE operations
