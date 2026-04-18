---
name: financial-tax-compliance
description: "Use when working on tax compliance, owner compensation, estimated tax, Schedule C, expense deductibility, LLC vs S-Corp, fiscal dashboards, or accountant export reports. Covers the full US federal tax workflow for a single-member LLC or S-Corp election."
---

# Skill: Financial Tax Compliance (US Federal)

## When to Use
- Creating or modifying any financial feature related to taxation, deductibility, or IRS reporting
- Working with owner compensation (draws, salary, distributions)
- Building or modifying expense categories with Schedule C mapping
- Implementing estimated quarterly tax tracking
- Creating fiscal dashboards or tax-related components
- Generating accountant export reports (Schedule C, P&L, 1099)
- Switching between LLC and S-Corp tax regimes
- Adding the owner as a Worker (OWNER_OPERATOR) in the system

## Reference
See [PLAYBOOK.md](./PLAYBOOK.md) for the complete IRS rules, Schedule C line mapping, deductibility rules, and owner compensation details.

---

## Core Schema Requirements

### Empresa — Tax Regime

The `Empresa` model must include:
```prisma
enum TipoTributacao {
  LLC_DEFAULT   // Single-member LLC → Schedule C
  S_CORP        // S-Corp election → Form 1120-S + K-1
}

model Empresa {
  // ... existing fields
  tipoTributacao TipoTributacao @default(LLC_DEFAULT)
  tipoTributacaoDesde DateTime?  // Date the current regime took effect
}
```

**Rules**:
- Default: `LLC_DEFAULT`
- Change triggers `AuditLog` entry
- Change does NOT retroact — historical transactions keep the regime they were created under
- UI must show current regime and date of effect

### Worker — OWNER_OPERATOR Classification

```prisma
enum WorkerClassification {
  W2_EMPLOYEE
  CONTRACTOR_1099
  SUBCONTRACTOR
  OWNER_OPERATOR   // ← NEW: business owner who also works
}
```

**Rules**:
- Only ONE Worker with `OWNER_OPERATOR` per empresa
- Links to the owner's `Usuario` (nivel = ADMIN)
- Can be assigned to projects via `Assignment`
- Can log hours via `WorkEntry`
- Worker MUST have a `WorkerFinancialProfile` (for tax rate tracking)
- Creates related `Funcionario` record so existing tech assignment flows work

### Expense — Deductibility Fields

```prisma
model Expense {
  // ... existing fields
  dedutivel             Boolean  @default(true)
  percentualDedutivel   Int?     // null = 100%, 50 = 50% (meals), etc.
}
```

### ExpenseCategory — Schedule C Mapping

```prisma
model ExpenseCategory {
  // ... existing fields
  scheduleCLine    String?   // "Line 8", "Line 11", "Line 22", etc.
  slug             String?   @unique  // "advertising", "contract-labor", etc.
  dedutivel        Boolean   @default(true)
}
```

### OwnerCompensation — New Model

```prisma
enum TipoCompensacao {
  OWNER_DRAW     // LLC: withdrawal of profit (not deductible)
  SALARY         // S-Corp: W-2 salary (deductible for company)
  DISTRIBUTION   // S-Corp: K-1 distribution (not deductible)
}

model OwnerCompensation {
  id            Int              @id @default(autoincrement())
  empresaId     Int
  workerId      Int              // OWNER_OPERATOR worker
  tipo          TipoCompensacao
  valor         Decimal          @db.Decimal(14, 2)
  data          DateTime
  descricao     String?
  referencia    String?          // check number, transaction ref
  bankAccountId Int?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  empresa       Empresa          @relation(fields: [empresaId], references: [id])
  worker        Worker           @relation(fields: [workerId], references: [id])
  bankAccount   BankAccount?     @relation(fields: [bankAccountId], references: [id])
}
```

**Validation rules**:
- LLC regime: only `OWNER_DRAW` allowed
- S-Corp regime: `SALARY` must exist before any `DISTRIBUTION`
- S-Corp: if SALARY total YTD < 30% of net income → trigger warning alert
- S-Corp: if SALARY total YTD = 0 and DISTRIBUTION > 0 → BLOCK (IRS violation)

### EstimatedTaxPayment — New Model

```prisma
enum QuarterLabel {
  Q1  // Jan-Mar, due Apr 15
  Q2  // Apr-May, due Jun 15
  Q3  // Jun-Aug, due Sep 15
  Q4  // Sep-Dec, due Jan 15
}

enum EstimatedTaxStatus {
  PENDING
  PAID
  PARTIAL
  OVERDUE
}

model EstimatedTaxPayment {
  id              Int                @id @default(autoincrement())
  empresaId       Int
  taxYear         Int                // e.g. 2026
  quarter         QuarterLabel
  dueDate         DateTime
  estimatedAmount Decimal            @db.Decimal(14, 2)  // system-calculated
  paidAmount      Decimal            @db.Decimal(14, 2)  @default(0)
  paidDate        DateTime?
  status          EstimatedTaxStatus @default(PENDING)
  notas           String?            @db.Text
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  empresa         Empresa            @relation(fields: [empresaId], references: [id])

  @@unique([empresaId, taxYear, quarter])
}
```

---

## Services Architecture

### TaxCalculationEngine

**File**: `src/shared/services/taxCalculationEngine.ts`

**Purpose**: Calculate taxable income and estimated tax based on current regime.

```typescript
interface TaxCalculationInput {
  empresaId: number
  regime: 'LLC_DEFAULT' | 'S_CORP'
  period: { startDate: Date; endDate: Date }
}

interface TaxCalculationResult {
  grossRevenue: number           // Schedule C Line 7
  totalDeductibleExpenses: number // Schedule C Lines 8-27 total
  netIncome: number              // grossRevenue - deductibleExpenses
  ownerSalaryYTD: number         // S-Corp only
  selfEmploymentTax: number      // LLC only (15.3% on 92.35% of net)
  estimatedIncomeTax: number     // Based on tax brackets
  totalEstimatedTax: number      // income tax + SE tax
  quarterlyPaymentTarget: number // totalEstimatedTax / 4
  expensesByScheduleCLine: Record<string, number>  // Line 8: $X, Line 11: $Y, etc.
}
```

**Procedure**:
1. Query all `Revenue` for the period with `empresaId`
2. Query all `Expense` for the period where `dedutivel = true`
3. For expenses with `percentualDedutivel`, apply the percentage
4. Group expenses by `ExpenseCategory.scheduleCLine`
5. Calculate net income
6. If LLC: calculate SE tax (net × 92.35% × 15.3%)
7. If S-Corp: subtract owner salary from expenses, no SE tax on distributions
8. Apply tax brackets for estimated income tax
9. Return complete breakdown

### OwnerCompensationService

**File**: `src/shared/services/ownerCompensationService.ts`

**Purpose**: Manage owner draws, salary, and distributions with regime-appropriate validation.

```typescript
interface CreateCompensationInput {
  empresaId: number
  workerId: number   // must be OWNER_OPERATOR
  tipo: 'OWNER_DRAW' | 'SALARY' | 'DISTRIBUTION'
  valor: number
  data: Date
  descricao?: string
  referencia?: string
  bankAccountId?: number
}
```

**Validation rules to implement**:
1. Verify worker is `OWNER_OPERATOR`
2. Check `Empresa.tipoTributacao` matches the compensation type
3. LLC → reject SALARY and DISTRIBUTION (only OWNER_DRAW)
4. S-Corp + DISTRIBUTION → verify SALARY exists in current year (else BLOCK)
5. S-Corp + SALARY → verify amount aligns with reasonable compensation
6. Create `AuditLog` entry for every compensation
7. If `bankAccountId` provided, verify sufficient balance

### EstimatedTaxService

**File**: `src/shared/services/estimatedTaxService.ts`

**Purpose**: Track quarterly estimated tax payments and generate alerts.

```typescript
interface QuarterlyEstimate {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  dueDate: Date
  estimatedAmount: number
  paidAmount: number
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE'
  daysUntilDue: number
  alertLevel: 'none' | 'info' | 'warning' | 'critical'
}
```

**Procedure**:
1. Get current tax year
2. Calculate YTD income using `TaxCalculationEngine`
3. Annualize: `(YTD income / months elapsed) × 12`
4. Calculate estimated annual tax
5. Divide by 4 for quarterly target
6. Compare with actual payments in `EstimatedTaxPayment`
7. Generate alerts based on due dates and payment status

### ScheduleCExportService

**File**: `src/shared/services/scheduleCExportService.ts`

**Purpose**: Generate Schedule C-mapped reports for accountant in Excel and PDF.

```typescript
interface ScheduleCExportInput {
  empresaId: number
  taxYear: number
  format: 'excel' | 'pdf' | 'both'
}

interface ScheduleCReport {
  income: {
    line1_grossReceipts: number
    line2_returnsAllowances: number
    line4_cogs: number
    line6_otherIncome: number
    line7_grossIncome: number
  }
  expenses: Record<string, {  // keyed by schedule C line
    lineName: string
    lineNumber: string
    total: number
    items: ExpenseDetail[]
  }>
  line28_totalExpenses: number
  line31_netProfit: number
  ownerCompensation: {
    totalDraws: number
    totalSalary: number
    totalDistributions: number
  }
}
```

**Excel format**:
- Sheet 1: "Summary" — Schedule C lines with totals
- Sheet 2: "Income Detail" — All revenue entries
- Sheet 3: "Expense Detail" — All expenses by category/line
- Sheet 4: "Owner Compensation" — All draws/salary/distributions
- Sheet 5: "Quarterly Taxes" — Estimated payments status

**PDF format**:
- Page 1: Summary (mini Schedule C)
- Pages 2+: Detail by section
- Header: GladPros logo, company info, period
- Footer: "DRAFT — For CPA review" + page numbers

---

## API Routes

### Tax Dashboard
- `GET /api/financeiro/tax/dashboard` — Fiscal dashboard data (YTD income, tax estimate, alerts)
- `GET /api/financeiro/tax/schedule-c?year=2026` — Schedule C preview
- `GET /api/financeiro/tax/regime` — Current tax regime info

### Owner Compensation
- `GET /api/financeiro/owner-compensation` — List compensations (with filters)
- `POST /api/financeiro/owner-compensation` — Create draw/salary/distribution
- `GET /api/financeiro/owner-compensation/summary?year=2026` — YTD summary

### Estimated Tax
- `GET /api/financeiro/estimated-tax?year=2026` — All quarters for year
- `POST /api/financeiro/estimated-tax` — Record a payment
- `PUT /api/financeiro/estimated-tax/:id` — Update payment

### Reports Export
- `GET /api/financeiro/reports/schedule-c?year=2026&format=excel` — Export Schedule C
- `GET /api/financeiro/reports/pnl?year=2026&period=quarterly&format=pdf` — P&L report
- `GET /api/financeiro/reports/1099-summary?year=2026` — Contractor payments for 1099

### Expense Categories (updated)
- `GET /api/financeiro/expense-categories` — List with scheduleCLine mapping
- `PUT /api/financeiro/expense-categories/:id` — Update category mapping

---

## Expense Category Seed — Schedule C Aligned

Replace existing seed data with:

```javascript
const categories = [
  { nome: 'Advertising',                         slug: 'advertising',       scheduleCLine: 'Line 8',  dedutivel: true },
  { nome: 'Car & Truck Expenses',                slug: 'car-truck',         scheduleCLine: 'Line 9',  dedutivel: true },
  { nome: 'Commissions & Fees',                  slug: 'commissions-fees',  scheduleCLine: 'Line 10', dedutivel: true },
  { nome: 'Contract Labor',                      slug: 'contract-labor',    scheduleCLine: 'Line 11', dedutivel: true },
  { nome: 'Depreciation',                        slug: 'depreciation',      scheduleCLine: 'Line 13', dedutivel: true },
  { nome: 'Employee Benefits',                   slug: 'employee-benefits', scheduleCLine: 'Line 14', dedutivel: true },
  { nome: 'Insurance',                           slug: 'insurance',         scheduleCLine: 'Line 15', dedutivel: true },
  { nome: 'Interest (Mortgage)',                  slug: 'interest-mortgage', scheduleCLine: 'Line 16a', dedutivel: true },
  { nome: 'Interest (Other)',                     slug: 'interest-other',    scheduleCLine: 'Line 16b', dedutivel: true },
  { nome: 'Legal & Professional Services',       slug: 'legal-professional', scheduleCLine: 'Line 17', dedutivel: true },
  { nome: 'Office Expense',                      slug: 'office-expense',    scheduleCLine: 'Line 18', dedutivel: true },
  { nome: 'Pension & Profit-Sharing Plans',      slug: 'pension-plans',     scheduleCLine: 'Line 19', dedutivel: true },
  { nome: 'Rent (Equipment)',                     slug: 'rent-equipment',    scheduleCLine: 'Line 20a', dedutivel: true },
  { nome: 'Rent (Business Property)',             slug: 'rent-property',     scheduleCLine: 'Line 20b', dedutivel: true },
  { nome: 'Repairs & Maintenance',               slug: 'repairs-maintenance', scheduleCLine: 'Line 21', dedutivel: true },
  { nome: 'Supplies',                            slug: 'supplies',          scheduleCLine: 'Line 22', dedutivel: true },
  { nome: 'Taxes & Licenses',                    slug: 'taxes-licenses',    scheduleCLine: 'Line 23', dedutivel: true },
  { nome: 'Travel',                              slug: 'travel',            scheduleCLine: 'Line 24a', dedutivel: true },
  { nome: 'Meals (50% Deductible)',              slug: 'meals',             scheduleCLine: 'Line 24b', dedutivel: true },
  { nome: 'Utilities',                           slug: 'utilities',         scheduleCLine: 'Line 25', dedutivel: true },
  { nome: 'Wages',                               slug: 'wages',             scheduleCLine: 'Line 26', dedutivel: true },
  { nome: 'Other Expenses',                      slug: 'other-expenses',    scheduleCLine: 'Line 27a', dedutivel: true },
  { nome: 'Materials (COGS)',                     slug: 'materials-cogs',    scheduleCLine: 'COGS',    dedutivel: true },
  { nome: 'Owner Draw',                          slug: 'owner-draw',        scheduleCLine: null,      dedutivel: false },
  { nome: 'Personal / Non-Deductible',           slug: 'non-deductible',    scheduleCLine: null,      dedutivel: false },
]
```

---

## UI Components

### Tax Regime Badge
```tsx
function TaxRegimeBadge({ regime }: { regime: 'LLC_DEFAULT' | 'S_CORP' }) {
  return (
    <Badge variant={regime === 'LLC_DEFAULT' ? 'default' : 'secondary'}>
      {regime === 'LLC_DEFAULT' ? 'LLC' : 'S-Corp'}
    </Badge>
  )
}
```

### Quarterly Tax Card
Shows each quarter with: estimated amount, paid amount, status (visual), days until due, alert indicator.

### Owner Compensation Form
- Dynamic fields based on `Empresa.tipoTributacao`
- LLC mode: only "Owner Draw" option
- S-Corp mode: "Salary" and "Distribution" options
- Validation inline: regime check, balance check, reasonable salary warning

### Schedule C Preview Widget
Mini table showing Line → Category → YTD Amount, sortable by line number.

### Fiscal Alerts Panel
List of active alerts with severity colors, actionable links.

---

## Permission Mapping

| Action | Module | Minimum Role |
|--------|--------|-------------|
| View tax dashboard | `financeiro` | FINANCEIRO (3) |
| View Schedule C report | `financeiro` | FINANCEIRO (3) |
| Create owner compensation | `financeiro` | ADMIN (1) |
| Change tax regime | `configuracoes` | ADMIN (1) |
| Export reports | `financeiro` | FINANCEIRO (3) |
| Record estimated tax payment | `financeiro` | ADMIN (1) or FINANCEIRO (3) |

---

## Implementation Phases

### Phase 1 — Schema & Migrations
1. Add `tipoTributacao` + `tipoTributacaoDesde` to `Empresa`
2. Add `OWNER_OPERATOR` to `WorkerClassification`
3. Add `dedutivel` + `percentualDedutivel` to `Expense`
4. Add `scheduleCLine` + `slug` + `dedutivel` to `ExpenseCategory`
5. Create `OwnerCompensation` model
6. Create `EstimatedTaxPayment` model
7. Create migration + seed updated expense categories
8. Create Worker record for owner (Gladiston Porto)

### Phase 2 — Backend Services
1. `TaxCalculationEngine` — net income, SE tax, estimated tax
2. `OwnerCompensationService` — CRUD + regime validation
3. `EstimatedTaxService` — quarterly tracking + alerts
4. Update expense create/edit flows with deductibility fields

### Phase 3 — API Routes
1. Tax dashboard endpoint
2. Owner compensation CRUD endpoints
3. Estimated tax CRUD endpoints
4. Expense category endpoints (updated with schedule C)
5. RBAC on all routes

### Phase 4 — Frontend
1. Tax dashboard page with KPIs
2. Owner compensation management page
3. Estimated tax quarterly view
4. Expense category management with Schedule C mapping
5. Fiscal alerts integration in sidebar/header
6. Tax regime selector in Settings

### Phase 5 — Reports & Export
1. Schedule C export (Excel + PDF)
2. P&L report with schedule C alignment
3. Owner compensation summary report
4. 1099 contractor summary
5. Quarterly estimate vs actual comparison
