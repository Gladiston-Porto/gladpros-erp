---
name: erp-data-flow
description: "Use when working on data exchange between ERP modules: proposta → projeto → estoque → financeiro → invoice. Documents FK relationships, status machines, trigger rules, and business constraints for precise inter-module integration."
---

# Skill: ERP Data Flow

## When to Use
- Creating or modifying any entity that links Proposta, Projeto, Estoque, Invoice, or Financeiro
- Validating that cross-module data references are correct (FKs, status guards)
- Implementing a new feature that spans more than one module
- Reviewing if a flow mutation (status change, material allocation, invoice trigger) is allowed at each stage

---

## Core Billing Flow (Critical Path)

```
Proposta [RASCUNHO → ENVIADA → ASSINADA → APROVADA]
  │
  │  gatilhoFaturamento: NA_APROVACAO | INICIO_PROJETO | CONCLUSAO_PROJETO | MANUAL | POR_ETAPAS
  │  projetoId: Int? @unique  ← FK that links the approved proposal to a project
  │
  ▼
Projeto [PLANEJADO → EM_EXECUCAO → EM_INSPECAO → CONCLUIDO → ARQUIVADO]
  │
  ├─── ProjetoMaterialEstoque[]  ←── Estoque: RESERVA → USO (material allocation)
  │      materialId, quantidade, status, projetoId
  │
  ├─── MaterialMovimentacao[]    ←── Estoque: physical stock movement (baixa)
  │      materialId, tipo (ENTRADA/SAIDA/AJUSTE), quantidade, projetoId?
  │
  ├─── Expense[]                 ←── Costs added to project (@relation "ProjetoExpenses")
  ├─── PurchaseOrder[]           ←── Material purchasing linked to project
  ├─── ChangeOrder[]             ←── Scope changes that affect billing
  │
  └─── Invoice[]                 ←── Faturamento (1 Projeto : N Invoices)
         projetoId: Int?
         clienteId: Int
         status: DRAFT → SENT → VIEWED → APPROVED → PARTIALLY_PAID → PAID
                 └→ DISPUTED → WRITTEN_OFF | CANCELLED
         │
         └─── ledgerTransactionId: Int? @unique  ←── Financeiro: LedgerTransaction
                                                       (double-entry bookkeeping)
```

---

## Parallel Flow: ServiceOrder (Independent Module)

ServiceOrder is **NOT** part of the Proposta → Projeto critical path.
It has its own lifecycle and can invoice independently:

```
ServiceOrder [DRAFT → SCHEDULED → IN_PROGRESS → COMPLETED → CLOSED]
  │                                                          └→ CANCELLED | WRITTEN_OFF
  │
  ├─── projetoId: Int?    ← Optional: links to a project (field work orders)
  │                         When set: SO is an operational task within a project
  │                         When null: SO is standalone (client repair call, etc.)
  │
  ├─── invoiceId: Int? @unique  ← Direct billing — creates its own Invoice
  │                               WITHOUT going through Proposta → Projeto
  │
  ├─── ServiceOrderMaterial[]   ←── Estoque consumption at SO level
  ├─── Expense[]                ←── @relation "ServiceOrderExpenses"
  ├─── PurchaseOrder[]
  └─── ChangeOrder[]
```

**Key rule**: ServiceOrder billing is DIRECT (`invoiceId @unique`).
A project-linked SO can EITHER bill through the project's Invoice OR through its own Invoice — not both.

---

## FK Map: What Connects to What

| Source Model        | FK Field               | Target Model      | Constraint       |
|---------------------|------------------------|-------------------|------------------|
| Projeto             | propostaId             | Proposta          | optional, unique |
| Proposta            | projetoId              | Projeto           | optional, unique |
| Invoice             | projetoId              | Projeto           | optional         |
| Invoice             | clienteId              | Cliente           | required         |
| Invoice             | ledgerTransactionId    | LedgerTransaction | optional, unique |
| ServiceOrder        | projetoId              | Projeto           | optional         |
| ServiceOrder        | invoiceId              | Invoice           | optional, unique |
| ProjetoMaterialEstoque | materialId          | Material          | required         |
| ProjetoMaterialEstoque | projetoId           | Projeto           | required         |
| MaterialMovimentacao | materialId            | Material          | required         |
| Expense             | projetoId              | Projeto           | @relation "ProjetoExpenses" |
| Expense             | serviceOrderId         | ServiceOrder      | @relation "ServiceOrderExpenses" |
| PurchaseOrder       | projetoId              | Projeto           | optional         |
| ChangeOrder         | projetoId              | Projeto           | optional         |

---

## Inter-Module Business Rules

### Proposta → Projeto
- Only a Proposta with status `APROVADA` can generate a Projeto
- The link is bidirectional (`propostaId` on Projeto, `projetoId` on Proposta) — both must be set
- `gatilhoFaturamento` controls WHEN the Invoice is created:
  - `NA_APROVACAO` → Invoice created immediately when Proposta is approved
  - `INICIO_PROJETO` → Invoice created when Projeto moves to `EM_EXECUCAO`
  - `CONCLUSAO_PROJETO` → Invoice created when Projeto reaches `CONCLUIDO`
  - `MANUAL` → User manually creates Invoice at any time
  - `POR_ETAPAS` → Multiple Invoices, one per project stage/milestone

### Projeto → Estoque
- Materials must be **reserved** (`ProjetoMaterialEstoque` status = `RESERVADA`) before execution starts
- Materials are **consumed** (status = `UTILIZADA`) when work is performed
- `MaterialMovimentacao` records the actual stock debit (`tipo = SAIDA`)
- `MaterialSaldo` tracks real-time quantity for each material
- Block: Cannot delete a Projeto with unreturned/unconsumed reserved materials

### Projeto → Invoice
- A Projeto can have multiple Invoices (installments, phases)
- Invoice `valorTotal` must match work scope (Expenses + PurchaseOrders + ChangeOrders)
- Invoice transitions: `DRAFT` → (send) → `SENT` → (client views) → `VIEWED` →
  (approve) → `APPROVED` → (partial) → `PARTIALLY_PAID` → (full) → `PAID`
- `DISPUTED`: client disputes — triggers ChangeOrder or credit memo
- `WRITTEN_OFF`: bad debt — requires GERENTE or ADMIN role
- `CANCELLED`: voids the invoice

### Invoice → Financeiro (LedgerTransaction)
- When Invoice reaches `APPROVED` or `PARTIALLY_PAID` or `PAID`, a `LedgerTransaction` is posted
- `ledgerTransactionId @unique` — one LedgerTransaction per Invoice
- LedgerTransaction uses double-entry: Accounts Receivable DR / Revenue CR
- Payments against Invoice create `LedgerTransaction` entries (Cash DR / AR CR)

---

## Status Guards: What to Check Before Each Transition

| Action                              | Guard                                              |
|-------------------------------------|----------------------------------------------------|
| Create Projeto from Proposta        | `proposta.status === 'APROVADA'`                   |
| Reserve materials for Projeto       | `projeto.status === 'PLANEJADO'`                   |
| Consume materials                   | `projeto.status === 'EM_EXECUCAO'`                 |
| Generate Invoice from Projeto       | `gatilhoFaturamento` rule met (see above)          |
| Send Invoice to client              | `invoice.status === 'DRAFT'`                       |
| Mark Invoice PAID                   | `invoice.status !== 'CANCELLED' && payment >= valorTotal` |
| Close ServiceOrder                  | `serviceOrder.status === 'COMPLETED'`              |
| Post to LedgerTransaction           | `invoice.status IN ['APPROVED','PARTIALLY_PAID','PAID']` |

---

## RBAC: Minimum Permissions per Module

| Module     | Read        | Write       | Delete/Void  |
|------------|-------------|-------------|--------------|
| propostas  | USUARIO+    | USUARIO+    | GERENTE+     |
| projetos   | USUARIO+    | GERENTE+    | GERENTE+     |
| estoque    | ESTOQUE+    | ESTOQUE+    | GERENTE+     |
| financeiro | FINANCEIRO+ | FINANCEIRO+ | ADMIN only   |
| invoices   | FINANCEIRO+ | FINANCEIRO+ | GERENTE+     |
| service_orders | USUARIO+ | USUARIO+   | GERENTE+     |

Check using: `can(user.role as Role, moduleKey, action)` from `@/shared/lib/rbac-core`

---

## Anti-Patterns to Avoid

1. **DO NOT** create an Invoice without checking `gatilhoFaturamento` — use the trigger rule
2. **DO NOT** consume materials without a `MaterialMovimentacao` record — stock will be inconsistent
3. **DO NOT** post to LedgerTransaction directly — always go through the Invoice payment pipeline
4. **DO NOT** link aServiceOrder to both a Projeto invoice AND its own direct `invoiceId` for the same work — this creates double billing
5. **DO NOT** transition Proposta to CANCELADA after Projeto has been created — deactivate the Projeto first
6. **DO NOT** allow USUARIO role to access financeiro module — hard block at API level
