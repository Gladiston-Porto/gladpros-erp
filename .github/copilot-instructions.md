# GladPros — Project Guidelines

## Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: MySQL + Prisma ORM 6.x
- **UI**: @gladpros/ui (43 components), shadcn/ui (new-york style), Tailwind CSS 4
- **Auth**: JWT (jose), MFA, RBAC with role hierarchy
- **Validation**: Zod schemas
- **Charts**: Recharts, Chart.js
- **Animations**: Framer Motion
- **Testing**: Jest (unit), Playwright (E2E)

## Operation Context
- **Location**: Dallas, Texas, USA
- **Currency**: USD — always use `en-US` locale for formatting
- **Timezone**: `America/Chicago` — never use UTC for display
- **Interface language**: Portuguese (pt-BR) labels for now — i18n planned for later
- **Business**: Construction/services company ERP
- **Tenant**: Single-tenant (empresaId=1, GladPros)
- **Legal entity**: GladPros LLC (Texas) — S-Corp election possible (`Empresa.tipoTributacao`)

## Business Entity & Tax Context

GladPros is a **Texas LLC** that may operate under S-Corp election. The system must support both regimes.

### Tax Regime (`Empresa.tipoTributacao`)
```
LLC_DEFAULT → Schedule C, owner draw (not deductible), self-employment tax 15.3%
S_CORP      → Form 1120-S + K-1, reasonable salary required, FICA on salary only
```

### Key Rules
- **LLC**: Only `OWNER_DRAW` allowed as owner compensation — not a salary, not deductible
- **S-Corp**: `SALARY` must exist before any `DISTRIBUTION` — if salary = 0 and distribution > 0, **BLOCK** (IRS violation)
- **S-Corp**: If salary YTD < 30% of net income → show warning
- Regime change: creates `AuditLog`, does **NOT** retroact on past transactions
- Worker with `classification = OWNER_OPERATOR`: only one per empresa, linked to ADMIN user

### Client Document Fields (US taxpayer IDs)
- PF (individual): SSN or ITIN — stored encrypted as `documentoEnc`, only last 4 digits visible (`docLast4`)
- PJ (business): EIN — same encryption pattern
- Encryption: AES-GCM via `src/shared/lib/crypto.ts`, hash SHA-256 in `docHash`

> For full IRS rules, Schedule C line mapping, and owner compensation details:
> → `.github/skills/financial-tax-compliance/SKILL.md`

## Critical Conventions

### Prisma Import — ONLY ONE PATH
```typescript
import { prisma } from "@/lib/prisma"
```
Do NOT use `@/server/db`, `@/server/db-temp`, or `@/shared/lib/prisma`. If you find these imports, migrate them to `@/lib/prisma`.

### Authentication — ONLY `requireUser`
```typescript
import { requireUser } from "@/shared/lib/rbac"
```
For Server Components without request:
```typescript
import { requireServerUser } from "@/shared/lib/requireServerUser"
```
Do NOT use `requireAuth` from `@/lib/api/auth` or `requireApiUser`. These are legacy.

### RBAC — Permission Checks
```typescript
import { can, type Role, type ModuleKey } from "@/shared/lib/rbac-core"

// Check permission before any operation
if (!can(user.role as Role, "financeiro", "read")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

### Role Hierarchy
```
ADMIN (1)      → Full system control
GERENTE (2)    → Operations supervision
FINANCEIRO (3) → Financial management
ESTOQUE (4)    → Inventory control
USUARIO (5)    → Daily operations (field user)
CLIENTE (6)    → Limited external access (portal only)
```

### User Management Hierarchy
- ADMIN manages all roles
- GERENTE manages USUARIO, FINANCEIRO, ESTOQUE only
- Other roles cannot manage users

## Design System

### Brand Colors
- **Primary**: `#0098DA` (Blue) — buttons, links, active states
- **Secondary**: `#FF8C00` (Orange) — emphasis, CTAs, accents
- **Gradient hero**: `linear-gradient(135deg, #0098DA 0%, #006899 100%)`

### Typography
- **H1 / Titles**: Neuropol (brand identity font) — `font-title` / `font-display`
- **Body / All else**: Roboto — default sans
- **Base size**: 16px (tablet-optimized)

### Spacing & Shapes
- **Spacing grid**: 8px base unit
- **Border radius**: `rounded-2xl` (16px) — standard for all GladPros elements
- **Touch targets**: minimum 48px (Apple HIG, tablet-first)

### Responsive Strategy
- **Primary device**: Tablets (768-1024px landscape)
- **Approach**: Tablet-first with md/lg breakpoints
- **Grid pattern**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Sidebar**: Collapsible 280px → 84px

### Dark Mode
- Class-based (`.dark` on `<html>`)
- Use CSS variables, never hardcode colors
- Default theme: dark

## Code Patterns

### API Response Format
```typescript
// Success
{ data: T, pagination?: { page, pageSize, total, totalPages }, success: true }

// Error
{ error: string, message: string, success: false }
```

### Page Structure
Every main page should have:
1. Hero section with brand gradient
2. PageHeader with Neuropol title + breadcrumbs
3. Stats cards (when applicable)
4. Content area with loading/empty/error states

### Components
- Import from `@gladpros/ui` when available (Button, Badge, Card, Input, etc.)
- Fallback to `@/components/ui/` for local shadcn components
- Use `EmptyState` from `@/components/estoque/shared/EmptyState` for empty lists
- Use `LoadingSpinner` / skeleton for loading states

### Forms
- Use `react-hook-form` + `zodResolver` for form validation
- All inputs need `aria-label` or associated `<label>`
- Show validation errors inline, below the field

### Accessibility
- `aria-label` on interactive elements
- `role` attributes where semantic HTML is insufficient
- Focus management in dialogs/modals
- Keyboard navigation support
- Skip links available via `SkipLinks` component
