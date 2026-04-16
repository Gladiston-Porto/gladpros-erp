---
name: service-order-module
title: "Service Order Module"
description: "Domain knowledge and rules for Service Orders."
type: "project"
---

# Service Order Module — Domain Knowledge

## Activation
Use this skill when working on any file under:
- `src/app/ordens-servico/`
- `src/app/api/service-orders/`

---

## Status Machine

```
DRAFT → SCHEDULED → IN_PROGRESS → COMPLETED → AWAITING_PAYMENT → CLOSED
                  ↘ WRITE_OFF (skip billing)
Any status → CANCELED (from DRAFT or SCHEDULED only)
CANCELED → DRAFT (reopen, requires reason)
```

### Transition Rules
| From | To | Requirement |
|---|---|---|
| DRAFT | SCHEDULED | Must have `scheduledDate` OR (`scheduleDateStart` + `scheduleDateEnd`) |
| SCHEDULED | IN_PROGRESS | No blockers |
| IN_PROGRESS | COMPLETED | No blockers |
| COMPLETED | AWAITING_PAYMENT | No Invoice exists (auto-creates) |
| COMPLETED | WRITE_OFF | Write-off reason provided |
| AWAITING_PAYMENT | CLOSED | Payment recorded |
| DRAFT/SCHEDULED | CANCELED | Reason required |
| CANCELED | DRAFT | Reason required |

---

## Material Flow

### Two sources of materials:

**1. From Stock (internal)**
- Has `materialId` (FK to `Produto`)
- Created with status `PENDING` if stock is sufficient, or `NEEDS_PURCHASE` if short
- Must use **POST** `/api/service-orders/[id]/materials` with `materialId`
- Reserve: **POST** `/api/service-orders/[id]/materials/reserve` (bulk reserves all PENDING)
- Consume: **POST** `/api/service-orders/[id]/materials/consume` with `{ materialId, quantityUsed }`
  - Decrements `Produto.quantidadeEstoque`
  - Creates `MovimentacaoEstoque` record
- Return: **POST** `/api/service-orders/[id]/materials/return` (returns RESERVED back to stock)

**2. Field Purchase (external)**
- Has `materialId = null`
- Created with status `NEEDS_PURCHASE`
- Created via POST `/api/service-orders/[id]/materials` WITHOUT `materialId` (just `name`, `unit`, `quantityPlanned`, optional `unitCostEstimated`)
- Tech buys it → mark as consumed via **PATCH** `/api/service-orders/[id]/materials/[matId]`
  - `{ status: 'CONSUMED', quantityUsed, unitCostActual }`
- The PATCH endpoint guards: stock-linked materials (`materialId !== null`) CANNOT use PATCH to set CONSUMED — must use `/consume`

### Material Status Labels
| Status | Label | Meaning |
|---|---|---|
| PENDING | Pendente | Linked to stock, not yet reserved |
| NEEDS_PURCHASE | Aguardando Compra | Insufficient stock or external buy |
| RESERVED | Reservado | Stock decremented/reserved |
| CONSUMED | Consumido | Used on the job |
| RETURNED | Devolvido | Returned to stock |

---

## Scope Items (Checklist)

- Separate model `ServiceOrderScopeItem`
- API: `/api/service-orders/[id]/scope-items`
  - GET: returns array `{ id, sortOrder, description, status }`
  - POST: `{ description, sortOrder? }`
  - PATCH `/:itemId`: `{ status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED' }`
- Loaded in `[id]/page.tsx` via `loadScopeItems()` separately from `loadOrder()`
- Created during OS creation in `nova/page.tsx` as post-save best-effort loop

---

## Work Entries (Diário de Obra)

- Model `ServiceOrderWorkEntry`
- Allowed in statuses: `SCHEDULED`, `IN_PROGRESS`
- Fields: `funcionarioId`, `startedAt`, `endedAt`, `notes`
- API: POST `/api/service-orders/[id]/work-entries`
- Calculates `totalMinutes` and `totalCost` (minutes × hourlyRate / 60)
- Auto-populates `laborTotal` on the parent service order

---

## API Endpoints Reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/service-orders` | List all OS with filters |
| POST | `/api/service-orders` | Create new OS |
| GET | `/api/service-orders/[id]` | Get full OS detail (includes materials, workEntries, Invoice, AssignedTech, Cliente) |
| PATCH | `/api/service-orders/[id]` | Update OS fields (status, schedule dates, assignedTechId, notes, etc.) |
| POST | `/api/service-orders/[id]/materials` | Add material (stock or external) |
| PATCH | `/api/service-orders/[id]/materials/[materialId]` | Update individual material (external only → CONSUMED) |
| POST | `/api/service-orders/[id]/materials/reserve` | Bulk reserve all PENDING stock materials |
| POST | `/api/service-orders/[id]/materials/consume` | Consume a RESERVED material |
| POST | `/api/service-orders/[id]/materials/return` | Return RESERVED material to stock |
| GET/POST | `/api/service-orders/[id]/scope-items` | List/create checklist items |
| PATCH | `/api/service-orders/[id]/scope-items/[itemId]` | Update item status |
| POST | `/api/service-orders/[id]/work-entries` | Log work time |
| POST | `/api/service-orders/[id]/generate-invoice` | Auto-generate invoice from OS |

---

## Page Structure

### `/ordens-servico/nova/page.tsx` — Creation Form
- Client-side `'use client'`
- Fetches clients and technicians at mount
- Schedule section: FIXED (single datetime) or FLEXIBLE (date range)
- Pre-creation material list with qty (external or stock lookup)
- Pre-creation checklist items (`scopeItems: string[]`)
- On submit: POST OS → loop save materials → loop save scope items
- Toast reports count: "OS #123 criada! (2/3 materiais, 4/4 tarefas)"

### `/ordens-servico/[id]/page.tsx` — Detail + Actions
**State:**
- `order` — full OS data
- `scopeItems` — loaded separately, managed with local toggle
- `history` — timeline events
- `showAddMaterial`, `addMaterialMode ('stock' | 'external')` — controls add modal
- `editingSchedule`, `scheduleForm` — inline schedule edit in DRAFT/SCHEDULED
- `showCancelModal`, `cancelReasonText` — cancel confirmation modal
- `showReopenModal`, `reopenReasonText` — reopen confirmation modal

**Key handlers:**
- `loadOrder()` — fetches GET /api/service-orders/[id]
- `loadScopeItems()` — fetches GET scope-items and sets `scopeItems`
- `changeStatus(newStatus, reason?)` — PATCH status on order
- `reserveMaterials()` — POST /materials/reserve
- `consumeMaterial()` — POST /materials/consume (for RESERVED stock materials)
- `returnMaterial(mat)` — POST /materials/return
- `saveSchedule()` — PATCH /api/service-orders/[id] with schedule fields
- `addExternalMaterial()` — POST /materials with no materialId (field purchase)
- `markAsPurchased(matId, qty, cost)` — PATCH /materials/[matId] → CONSUMED
- `addWorkEntry()` — POST /work-entries
- `assignTech(id)` — PATCH assignedTechId
- `generateInvoice()` — POST /generate-invoice

---

## RBAC Rules

- All OS routes: check `can(user.role, 'ordens-servico', 'read' | 'write')`
- Roles with write access: ADMIN, GERENTE, USUARIO (field tech)
- FINANCEIRO: read only (for billing visibility)
- CLIENTE: no access to OS module

---

## Common Pitfalls & Lessons Learned

### 1. Window.prompt() is gone
Cancel and Reopen used `window.prompt()` — now replaced with proper modals (`showCancelModal` / `showReopenModal`). Never bring back `prompt()`.

### 2. Schedule is required to advance DRAFT → SCHEDULED
The API rejected advancement without a scheduled date. The UI now shows a yellow warning banner and "Definir agora" button in `DRAFT` status when no date is set.

### 3. External materials have `materialId = null`
The Prisma schema allows `materialId` to be null. When null, the material is a field purchase — NOT managed by stock system. Use PATCH `/materials/[id]` to mark as CONSUMED; do NOT use `/consume` endpoint (which requires a real stock materialId).

### 4. `order.description` must be displayed
The `description` field is saved to DB but was not shown in the detail page. Always render a "Descrição do Problema" card when `order.description` is truthy.

### 5. Modal dark mode
All modals must use `bg-card border border-border` (not `bg-white`). All inputs: `bg-background text-foreground border-border`. All secondary text: `text-muted-foreground`.

### 6. scopeItems load separately
`loadScopeItems()` is called independently of `loadOrder()`. If you add a new useEffect, make sure both are called.

### 7. materialTotal recalculation
When marking a material as CONSUMED via PATCH, the endpoint recalculates `materialTotal` on the parent OS using a `_sum` aggregate. This is intentional — do not remove it.

### 8. Work entries allowed in SCHEDULED
Field techs often log time after scheduling. The work entry button must be visible in SCHEDULED and IN_PROGRESS statuses.

---

## Full OS Lifecycle Example (Happy Path)

1. **DRAFT** — Sales creates OS: client, address, description, materials (from stock + external), checklist items
2. **DRAFT** — Reservar materials: all PENDING stock items become RESERVED; insufficient stock items stay NEEDS_PURCHASE
3. **DRAFT → SCHEDULED** — Set date via Schedule card edit form, then Avançar
4. **SCHEDULED** — Assign technician (setShowTechAssign), log work if done same day
5. **SCHEDULED → IN_PROGRESS** — On arrival, advance status
6. **IN_PROGRESS** — Log work entries, consume reserved materials, mark external as purchased
7. **IN_PROGRESS → COMPLETED** — Mark done after finalizing
8. **COMPLETED** — Generate invoice → AWAITING_PAYMENT
9. **AWAITING_PAYMENT → CLOSED** — Payment recorded in financial module

---

## Prisma Models (Abbreviated)

```prisma
model ServiceOrder {
  id                  Int
  ticketNumber        String  @unique  // e.g. OS-20250001
  title               String
  description         String?
  status              ServiceOrderStatus
  scheduleType        String?   // FIXED | FLEXIBLE
  scheduledDate       DateTime?
  scheduleDateStart   DateTime?
  scheduleDateEnd     DateTime?
  estimatedHours      Decimal?
  hourlyRate          Decimal?
  materialSupply      String?   // COMPANY | CLIENT | MIXED
  laborTotal          Decimal   @default(0)
  materialTotal       Decimal   @default(0)
  total               Decimal   @default(0)
  clienteId           Int
  assignedTechId      Int?
  materials           ServiceOrderMaterial[]
  workEntries         ServiceOrderWorkEntry[]
  Invoice             Invoice?
}

model ServiceOrderMaterial {
  id                  Int
  serviceOrderId      Int
  materialId          Int?      // null = external field purchase
  name                String
  unit                String?
  status              MaterialStatus  // PENDING | NEEDS_PURCHASE | RESERVED | CONSUMED | RETURNED
  quantityPlanned     Decimal
  quantityUsed        Decimal   @default(0)
  unitCostEstimated   Decimal?
  unitCostActual      Decimal?
  consumedAt          DateTime?
}
```
