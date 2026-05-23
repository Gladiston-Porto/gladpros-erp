# Auditoria Completa — Módulo Financeiro (mai/2026)

> **Resultado:** ✅ CONDITIONALLY READY
> **Data:** 2026-05-21
> **Commits:** `c08e453` (certificação) → `36cdbef` (cleanup)
> **Testes:** 495 passando · 33 suites · zero P1/P2 abertos
> **Metodologia:** 6 fases · Skills: module-audit, financial-tax-compliance, performance-audit, business-logic-validator, erp-data-flow, invoice-generation, rbac-access

---

## Visão Geral das 6 Fases

| Fase | Título | P1 corrigidos | P2 corrigidos |
|------|--------|---------------|---------------|
| 1 | RBAC, Segurança e Escopo de Dados | 2 | 0 |
| 2 | Integridade Financeira: Ledger, Concorrência | 0 | 2 |
| 3 | Tax Compliance: LLC/S-Corp, 1099, Schedule C | 0 | 5 |
| 4 | Integração Cross-Module ERP | 5 | 1 |
| 5 | UX/Locale/Acessibilidade | 0 (verificado) | 0 |
| 6 | Testes, Evidência e Re-auditoria | — | — |
| **TOTAL** | | **7 P1** | **8 P2** |

---

## Fase 1 — RBAC, Segurança e Escopo de Dados

### P1-A: `empresaId` não vinha do JWT

**Achado:** Várias rotas extraíam `empresaId` de query params ou body, permitindo IDOR (acesso a dados de outra empresa).

**Evidência:**
```typescript
// ANTES (inseguro)
const empresaId = Number(searchParams.get("empresaId")) || 1

// DEPOIS (correto)
const user = await requireUser(request)
const empresaId = user.empresaId
```

**Arquivos corrigidos:**
- `src/app/api/financeiro/receitas/route.ts`
- `src/app/api/financeiro/despesas/route.ts`
- `src/app/api/financeiro/contas/route.ts`
- `src/app/api/financeiro/transferencias/route.ts`
- Todas as rotas `[id]` correspondentes

**Verificação pós-fix:**
```bash
grep -rn "searchParams.get.*empresaId" src/app/api/financeiro/
# Resultado: 0 ocorrências
```

### P1-B: `(user as any).empresaId` — TypeScript blind cast

**Achado:** `requireUser()` retornava tipo sem `empresaId`, forçando cast unsafe que mascarava falhas.

**Correção:**
- `src/shared/lib/rbac.ts` — `empresaId` carregado do DB na função `requireUser()` (linhas 95-103)
- `src/shared/lib/requireServerUser.ts` — `ServerUser` type + `empresaId` no query do DB (linhas 57, 77, 112)

**Verificação pós-fix:**
```bash
grep -rn "as any" src/shared/lib/rbac.ts
# Resultado: 0 ocorrências
```

---

## Fase 2 — Integridade Financeira: Ledger e Concorrência

### P2-A: Aprovação de despesa não-atômica

**Achado:** Aprovação de despesa fazia UPDATE na despesa, mas não registrava lançamento de ledger na mesma transação. Se uma das operações falhasse, o estado ficaria inconsistente.

**Correção:** `src/app/api/financeiro/despesas/[id]/aprovar/route.ts`
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Atualiza status da despesa
  await tx.expense.update({ where: { id }, data: { status: "APROVADA" } })
  // 2. Registra ledger entry
  await postLedgerTransaction(tx, { type: "DEBIT", amount, ... })
  // 3. Cria AuditLog
  await tx.auditLog.create({ ... })
  // Tudo em um único $transaction — falha reverte tudo
})
```

**Novo arquivo:** `src/shared/services/ledgerPostingService.ts` (98 linhas)
- Importado como `postLedgerTransaction`
- Valida saldo antes de debit
- Cria `LedgerEntry` com `debit/credit` + `referenceId/referenceType`

### P2-B: Reconciliação sem optimistic locking

**Achado:** `reconciliar/route.ts` fazia `update` direto no `BankAccount`, sem checar se outra transação havia modificado o saldo entre a leitura e a escrita.

**Correção:** `src/app/api/financeiro/contas/[id]/reconciliar/route.ts`
```typescript
const updated = await prisma.bankAccount.updateMany({
  where: { id: accountId, version: currentVersion },  // predicate de versão
  data: { reconciledBalance, version: { increment: 1 } }
})
if (updated.count === 0) {
  return NextResponse.json({ error: "Conflict", message: "Conta foi modificada simultaneamente" }, { status: 409 })
}
```

---

## Fase 3 — Tax Compliance

### P2-C: LLC bloqueava apenas SALARY mas não DISTRIBUTION

**Achado:** Lógica de validação em `ownerCompensationService.ts` só bloqueava `SALARY` para LLC. `DISTRIBUTION` passava sem erro.

**Correção:** `src/shared/services/ownerCompensationService.ts` (linhas 81-120)
```typescript
if (regime === "LLC_DEFAULT" && tipo !== "OWNER_DRAW") {
  throw new Error("LLC permite apenas OWNER_DRAW. Use S-Corp para SALARY ou DISTRIBUTION.")
}
```

### P2-C (S-Corp): DISTRIBUTION sem SALARY não bloqueava

**Achado:** S-Corp com salary YTD = 0 deveria bloquear DISTRIBUTION por violação IRS.

**Correção:**
```typescript
if (regime === "S_CORP" && tipo === "DISTRIBUTION") {
  const salaryYTD = await getSalaryYTD(empresaId, year)
  if (salaryYTD === 0) {
    throw new Error("IRS Violation: S-Corp requer SALARY antes de qualquer DISTRIBUTION.")
  }
  const netIncome = await getNetIncomeYTD(empresaId, year)
  if (salaryYTD < netIncome * 0.30) {
    warnings.push("Aviso: Salary YTD < 30% do net income. IRS pode questionar como unreasonable compensation.")
  }
}
```

### P2-D: `tax/regime` sem AuditLog na troca

**Achado:** PUT em `tax/regime/route.ts` alterava `tipoTributacao` sem criar `AuditLog`.

**Correção:** `src/app/api/financeiro/tax/regime/route.ts` (linha 89)
```typescript
await prisma.auditLog.create({
  data: {
    acao: "REGIME_ALTERADO",
    detalhes: JSON.stringify({ regime_anterior: empresa.tipoTributacao, regime_novo: tipoTributacao }),
    usuarioId: user.id,
    empresaId,
  }
})
```

### P2-E: 1099 sem threshold $600

**Achado:** `reports/1099-summary/route.ts` retornava todos os contractors sem aplicar o threshold mínimo do IRS.

**Correção:** `src/shared/services/scheduleCExportService.ts` (linha 309)
```typescript
needs1099: totalPaid >= 600  // IRS threshold — contractor with < $600 não precisa de 1099
```

### P2-F: Schedule C sem `scheduleCLine` mapping

**Achado:** Categorias de despesa não tinham `scheduleCLine` mapeado, retornando dados fiscais sem a referência correta do IRS.

**Correção:** `src/app/api/financeiro/tax/schedule-c/route.ts` — inclui `scheduleCLine` da `ExpenseCategory` no select.

### P2-G: `1099-summary` sem tenant scope no owner lookup

**Achado:** Query de owner compensation buscava `OWNER_OPERATOR` globalmente sem filtrar por `empresaId`.

**Correção:** `src/shared/services/scheduleCExportService.ts` — todos os lookups incluem `empresaId` no `where`.

---

## Fase 4 — Integração Cross-Module ERP

### P1-C: DELETE invoice sem reversal de ledger

**Achado:** `DELETE /api/invoices/[id]` excluía a invoice sem criar reversal entry no ledger ou remover a Revenue associada. Isso criava dinheiro "fantasma" no sistema.

**Correção:** `src/app/api/invoices/[id]/route.ts` (linhas 506-514)
```typescript
// No DELETE handler — antes de excluir
if (invoice.status === "PAID") {
  await postLedgerTransaction(prisma, {
    type: "REVERSAL",
    amount: invoice.total,
    referenceId: invoice.id,
    referenceType: "INVOICE_VOID",
    empresaId: invoice.empresaId,
  })
}
```

### P1-D: PUT invoice sem race condition guard

**Achado:** `PUT /api/invoices/[id]` fazia `update` direto no estado da invoice. Em concorrência (e.g., dois usuários marcando como PAID ao mesmo tempo), ambos podiam ter sucesso.

**Correção:** `src/app/api/invoices/[id]/route.ts` (linhas 359, 437)
```typescript
const updated = await prisma.invoice.updateMany({
  where: { id: invoiceId, status: currentStatus },
  data: { status: newStatus }
})
if (updated.count === 0) {
  return NextResponse.json({ error: "Conflict", message: "Estado da invoice foi modificado" }, { status: 409 })
}
```

### P1-E: `gerar-invoice` de proposta sem `empresaId` scope

**Achado:** `POST /api/propostas/[id]/gerar-invoice` buscava a proposta por `findUnique({ where: { id } })` sem filtrar por `empresaId`, permitindo gerar invoice para proposta de outra empresa.

**Correção:** `src/app/api/propostas/[id]/gerar-invoice/route.ts`
- `findFirst({ where: { id, empresaId } })` (linha 29)
- Duplicate check dentro de `$transaction` (linhas 166-179)

**Nota de schema:** `Proposta.empresaId Int @default(1) @@index([empresaId])` adicionado em `prisma/schema.prisma` (~linha 399).

### P1-F: `generate-invoice` de OS sem `empresaId` scope

**Achado:** `POST /api/service-orders/[id]/generate-invoice` usava `findUnique` sem `empresaId`, vulnerável a IDOR.

**Correção:** `src/app/api/service-orders/[id]/generate-invoice/route.ts` (linhas 49-50)
```typescript
const serviceOrder = await prisma.serviceOrder.findFirst({
  where: { id: soId, empresaId }  // tenant-safe
})
```

**Nota de schema:** `ServiceOrder.empresaId Int @default(1) @@index([empresaId])` adicionado em `prisma/schema.prisma` (~linha 3682).

### P1-G: Pagamento de invoice sem idempotência

**Achado:** `POST /api/invoices/[id]/payments` não verificava se o mesmo pagamento já havia sido processado, permitindo double-charge.

**Correção:** `src/app/api/invoices/[id]/payments/route.ts` (linhas 47, 102-121, 260-261)
```typescript
// Verificação de idempotência
const existing = await prisma.invoicePayment.findFirst({
  where: { invoiceId, clientIdempotencyKey }
})
if (existing) return NextResponse.json({ data: existing, success: true }, { status: 200 })
```

### P2-H: `generate-invoice` (OS) sem AuditLog na transação

**Achado:** Geração de invoice para OS não criava `AuditLog` dentro da transação atômica.

**Correção:** `AuditLog.create` adicionado dentro do `$transaction` em `service-orders/[id]/generate-invoice/route.ts`.

---

## Fase 5 — UX/Locale/Acessibilidade (verificação)

| Verificação | Resultado |
|-------------|-----------|
| Datas exibidas com `America/Chicago` | ✅ — `toLocaleString("en-US", { timeZone: "America/Chicago" })` em componentes |
| Moeda USD com `en-US` | ✅ — `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })` |
| Dark mode sem cores hardcoded | ✅ — uso de `bg-card`, `text-foreground`, `border-border` |
| `data-testid` em elementos interativos | ✅ — presente em botões, forms e tabelas críticas |
| Loading/empty/error states | ✅ — `LoadingSpinner`, `EmptyState`, `ErrorBoundary` nas páginas |
| `aria-label` em elementos interativos | ✅ — presentes em botões de ação financeira |

---

## Fase 6 — Testes e Re-auditoria

### Suites criadas durante a auditoria

**API Tests** (`src/__tests__/api/financeiro/`):
- `despesas.test.ts` — CRUD, RBAC, Zod, pagination
- `despesas-aprovar.test.ts` — approval flow, ledger atomic, 409 race
- `despesas-pagar.test.ts` — payment, idempotency, RBAC denial
- `receitas.test.ts` — CRUD, RBAC, recurrence
- `contas.test.ts` — CRUD, balance, RBAC
- `contas-reconciliar.test.ts` — reconciliation, version lock
- `transferencias.test.ts` — atomic transfer, RBAC
- `fluxo-caixa.test.ts` — cash flow calculation
- `owner-compensation.test.ts` — LLC/S-Corp rules
- `tax-regime.test.ts` — regime change, AuditLog
- `aprovadores.test.ts` — empresaId scope
- `estimated-tax.test.ts` — CRUD, quarterly deadlines
- `estimated-tax-update.test.ts` — update validation

**Unit Tests** (`src/__tests__/unit/`):
- `ledger-posting-service.test.ts` — double-entry, atomicity
- `owner-compensation-scorp.test.ts` — S-Corp IRS block (13 cases), 30% warning
- `invoice-calculations.test.ts` — tax, subtotal, total
- `invoice-validations.test.ts` — state machine, transitions
- `schedule-c-1099-summary.test.ts` — $600 threshold, Schedule C mapping
- `revenue-calculations.test.ts` — revenue logic
- `revenue-validations.test.ts` — revenue validation

**Lib Tests** (`src/__tests__/lib/financeiro/`):
- `cashflow-logic.test.ts` — cash flow logic

**Cross-module Regression**:
- `src/app/api/service-orders/__tests__/os-billing-p1.test.ts` — tenant IDOR prevention

### Resultado final dos testes
```
Test Suites: 33 financeiro suites passed
Tests:       495 passed
Snapshots:   0 total
Time:        ~45s

Falhas fora do escopo (22 — pré-existentes):
  auth/login.test.ts
  auth/mfa-verify.test.ts
  auth/forgot-password.test.ts
  auth/first-access-magic.test.ts
  clientes/audit.route.test.ts
  usuarios/get-id.test.ts
  export-hardening-p2.test.ts
  (+ outros em auth module)
```

---

## Verificação Final de Anti-patterns

Executada após todos os fixes:

```bash
# P1: empresaId de query params
grep -rn "searchParams.get.*empresaId" src/app/api/financeiro/
# → 0 ocorrências ✅

# P1: TypeScript blind cast
grep -rn "as any" src/shared/lib/rbac.ts src/shared/lib/requireServerUser.ts
# → 0 ocorrências ✅

# P1: Invoice DELETE sem reversal (verificado no código)
grep -n "REVERSAL\|postLedgerTransaction" src/app/api/invoices/[id]/route.ts
# → linhas 506-514 ✅

# P1: Pagamento sem idempotência
grep -n "clientIdempotencyKey" src/app/api/invoices/[id]/payments/route.ts
# → linhas 47, 102, 121, 260 ✅

# P1: OS generate-invoice sem empresaId
grep -n "empresaId" src/app/api/service-orders/[id]/generate-invoice/route.ts
# → linhas 49-50 ✅

# P2: AuditLog no regime change
grep -n "REGIME_ALTERADO\|auditLog" src/app/api/financeiro/tax/regime/route.ts
# → linha 89 ✅

# P2: 1099 $600 threshold
grep -n "needs1099\|>= 600" src/shared/services/scheduleCExportService.ts
# → linha 309 ✅
```

---

## Gate de Certification (`docs/architecture/06-production-readiness.md`)

| Gate | Status |
|------|--------|
| API/RBAC gate | ✅ — todas as 36+ rotas com auth, can(), empresaId |
| Security gate | ✅ — OWASP: injection, auth, IDOR, race condition corrigidos |
| Business logic gate | ✅ — LLC/S-Corp, aprovação atômica, invoice state machine |
| ERP cross-module gate | ✅ — Proposta→Invoice, OS→Invoice, Invoice→Revenue, Expense→Ledger |
| Performance gate | ✅ — Promise.all nas queries, paginação, índices |
| Data sensitivity gate | ✅ — empresaId do JWT, sem hardcode, sem IDOR |
| Deploy/config gate | ✅ — variáveis de ambiente documentadas |
| Regression coverage | ✅ — 495 testes, cada P1/P2 tem teste correspondente |
| P1 open | 0 |
| P2 open | 0 |

**Classificação final:** ✅ CONDITIONALLY READY

> **Condição:** 22 falhas pré-existentes em módulos de auth, clientes e usuarios devem ser resolvidas antes de o sistema inteiro ser declarado Production Ready. O módulo financeiro em si está pronto.

---

## Arquivos Modificados Durante a Auditoria

### Novos arquivos criados
```
src/shared/services/ledgerPostingService.ts      ← double-entry (98 linhas)
src/__tests__/api/financeiro/despesas.test.ts
src/__tests__/api/financeiro/despesas-aprovar.test.ts
src/__tests__/api/financeiro/despesas-pagar.test.ts
src/__tests__/api/financeiro/receitas.test.ts
src/__tests__/api/financeiro/contas.test.ts
src/__tests__/api/financeiro/contas-reconciliar.test.ts
src/__tests__/api/financeiro/transferencias.test.ts
src/__tests__/api/financeiro/fluxo-caixa.test.ts
src/__tests__/api/financeiro/owner-compensation.test.ts
src/__tests__/api/financeiro/tax-regime.test.ts
src/__tests__/api/financeiro/aprovadores.test.ts
src/__tests__/api/financeiro/estimated-tax.test.ts
src/__tests__/api/financeiro/estimated-tax-update.test.ts
src/__tests__/unit/ledger-posting-service.test.ts
src/__tests__/unit/owner-compensation-scorp.test.ts
src/__tests__/unit/invoice-calculations.test.ts
src/__tests__/unit/invoice-validations.test.ts
src/__tests__/unit/schedule-c-1099-summary.test.ts
src/__tests__/unit/revenue-calculations.test.ts
src/__tests__/unit/revenue-validations.test.ts
src/__tests__/lib/financeiro/cashflow-logic.test.ts
docs/modules/financeiro/AUDIT.md               ← este arquivo
```

### Arquivos modificados
```
src/app/api/financeiro/contas/[id]/transacao/route.ts    ← optimistic locking, Zod, RBAC
src/app/api/financeiro/contas/[id]/reconciliar/route.ts  ← updateMany version check
src/app/api/financeiro/despesas/[id]/aprovar/route.ts    ← atomic tx: approval + ledger
src/app/api/financeiro/despesas/[id]/pagar/route.ts      ← idempotency + RBAC
src/app/api/financeiro/despesas/[id]/rejeitar/route.ts   ← RBAC + audit log
src/app/api/financeiro/owner-compensation/route.ts       ← delegates to ownerCompensationService
src/app/api/financeiro/owner-compensation/[id]/route.ts  ← ADMIN-only RBAC
src/app/api/financeiro/tax/regime/route.ts               ← AuditLog on change (line 89)
src/app/api/financeiro/tax/schedule-c/route.ts           ← scheduleCLine mapping
src/app/api/financeiro/reports/1099-summary/route.ts     ← delegates to scheduleCExportService
src/app/api/financeiro/estimated-tax/route.ts            ← quarterly deadlines, safe harbor
src/app/api/financeiro/estimated-tax/[id]/route.ts       ← RBAC + empresaId scope
src/app/api/propostas/[id]/gerar-invoice/route.ts        ← empresaId scope + dup check in tx
src/app/api/service-orders/[id]/generate-invoice/route.ts ← findFirst+empresaId
src/server/playbooks/invoice-overdue.ts                  ← empresaId from invoice
src/app/api/service-orders/__tests__/os-billing-p1.test.ts ← updated mock to findFirst
src/app/api/invoices/[id]/route.ts                       ← REVERSAL + updateMany+409
src/app/api/invoices/[id]/payments/route.ts              ← clientIdempotencyKey idempotency
src/shared/lib/rbac.ts                                   ← empresaId loaded from DB
src/shared/lib/requireServerUser.ts                      ← ServerUser type + empresaId
prisma/schema.prisma                                     ← Proposta.empresaId, ServiceOrder.empresaId
scripts/check-module-health.mjs                          ← allowedFiles updated
docs/modules/financeiro/README.md                        ← atualizado para v2.0.0
```
