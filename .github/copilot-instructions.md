# GladPros — Project Guidelines

## Commands

```bash
# Development
npm run dev          # starts Next.js dev server (auto-builds @gladpros/ui first)
npm run storybook    # Storybook for @gladpros/ui component development (port 6006)

# Build & Validate
npm run build        # production build (auto-builds packages first)
npm run lint         # ESLint — zero warnings allowed
npm run lint:fix     # auto-fix lint errors
npm run type-check   # tsc --noEmit (uses tsconfig.typecheck.json)
npm run secret:scan  # scan for accidental secrets in source files

# Testing
npm test                           # unit tests (jsdom environment)
npm run test:unit                  # alias for unit tests
npx jest path/to/file.test.ts      # run a single test file
npx jest -t "test name"            # run tests matching a name pattern
npm run test:integration           # integration tests (node environment, runs serially)
npm run test:e2e                   # Playwright E2E tests
npx playwright test tests/e2e/clientes/clientes-crud.spec.ts  # single E2E spec

# Database
npm run db:migrate   # prisma migrate dev (requires shadow DB — see note below)
npm run db:generate  # prisma generate (must run after schema changes)
npm run db:studio    # Prisma Studio UI
```

> Full suite: `npm run check` (lint + type-check + unit tests) — `npm run check:all` also runs a production build.

> **⚠️ Schema changes:** The MySQL user may lack shadow DB permissions, causing `prisma migrate dev` to fail. In that case use `npx prisma db push --accept-data-loss` to apply schema changes directly. No migration history file is created; rollback must be done manually. Always run `npm run db:generate` afterwards.

## Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: MySQL 8 + Prisma ORM 6.x
- **UI**: @gladpros/ui (internal monorepo package, 43+ components), shadcn/ui (new-york style), Tailwind CSS **v4**
- **Auth**: JWT (jose), MFA via TOTP, RBAC with role hierarchy
- **Validation**: Zod schemas
- **Charts**: Recharts, Chart.js
- **Animations**: Framer Motion
- **Testing**: Jest (unit/integration), Playwright (E2E)

## Operation Context
- **Location**: Dallas, Texas, USA
- **Currency**: USD — always use `en-US` locale for formatting
- **Timezone**: `America/Chicago` — never use UTC for display
- **Interface language**: Portuguese (pt-BR) labels for now — i18n planned for later
- **Business**: Construction/services company ERP
- **Tenant**: Single-tenant (`empresaId=1`, GladPros) — no multi-tenant logic
- **Legal entity**: GladPros LLC (Texas) — S-Corp election possible (`Empresa.tipoTributacao`)

## Architecture

### Monorepo Structure
The project uses npm workspaces. Internal packages live in `packages/`:
- `packages/ui` → `@gladpros/ui` — shared component library (built before dev/build)
- `packages/auth-core`, `packages/proposals-core`, etc. — domain logic shared between app and packages

`src/` is organized by concern, not by feature:
```
src/
  app/          # Next.js App Router pages + API routes
  shared/       # Cross-cutting utilities (rbac, auth, helpers, hooks)
  lib/          # Infrastructure (prisma, security, cache, crypto)
  components/   # Feature-specific React components
  domains/      # Domain logic (business rules, not UI)
  services/     # Service layer (external integrations)
  schemas/      # Zod schemas shared between API and UI
```

### Middleware Pipeline (middleware.ts)
Every request goes through (in order):
1. IP block check
2. Rate limiting (in-memory or Redis)
3. JWT verification — propagates `x-user-id`, `x-user-role`, `x-user-email` headers
4. Route protection — redirects unauthenticated users to `/login`
5. Security headers (CSP with nonce in production)
6. CORS enforcement

Public routes that skip auth: `/api/auth/*`, `/api/portal/*`, `/api/webhooks/*`

### Test Structure
- **Unit** (`npm test`): `src/**/__tests__/**/*.test.ts` — jsdom environment, mocked DB
- **Integration** (`npm run test:integration`): `src/**/__tests__/integration/**/*.test.ts` — real DB, node environment, serial execution
- **E2E** (`npm run test:e2e`): `tests/e2e/**/*.spec.ts` — Playwright, full browser

Coverage thresholds are enforced per module in `config/jest.config.js`. When auditing a module, add its threshold entry there.

### Test Mock Patterns

```typescript
// Prisma mock (unit tests)
jest.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  }
}))
import { prisma } from '@/lib/prisma'
const mockFindMany = prisma.cliente.findMany as jest.MockedFunction<typeof prisma.cliente.findMany>
mockFindMany.mockResolvedValue([{ id: 1, nome: 'John Smith', empresaId: 1 }])

// Auth mock (unit tests)
jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn().mockResolvedValue({ id: 1, email: 'admin@gladpros.com', role: 'ADMIN', empresaId: 1 }),
  can: jest.fn().mockReturnValue(true),
}))

// Test RBAC denial
;(requireUser as jest.Mock).mockResolvedValue({ id: 2, role: 'USUARIO', empresaId: 1 })
;(can as jest.Mock).mockReturnValue(false)
expect((await GET(mockRequest)).status).toBe(403)
```

E2E: use `data-testid` on all interactive elements (`data-testid="btn-salvar"`, `data-testid="input-nome"`). Auth states are pre-saved in `tests/.auth/[role].json`.

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

### Prisma Schema Rules
Every model MUST have these four fields + index:
```prisma
id          Int      @id @default(autoincrement())
empresaId   Int
criadoEm    DateTime @default(now())
atualizadoEm DateTime @updatedAt
@@index([empresaId])
```
- **Money fields**: always `Decimal @db.Decimal(10, 2)` — never `Float`
- **N-M relations**: use explicit join table with `@@id([aId, bId])`, never implicit `@relation` many-to-many
- **Soft delete**: `deletadoEm DateTime?` + always filter `where: { deletadoEm: null }` in queries
- Every FK field must have a matching `@@index`

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

### RBAC Permission Matrix

| Module | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|--------|-------|---------|------------|---------|---------|---------|
| dashboard | ALL | RO | RO | RO | RO | — |
| usuarios | ALL | — | — | — | — | — |
| clientes | ALL | RW | RO | RO | RW | — |
| propostas | ALL | ALL | ALL | — | — | — |
| projetos | ALL | ALL | ALL | ALL | ALL | RO |
| service-orders | ALL | ALL | RO | RO | RW | — |
| estoque | ALL | RO | RO | ALL | RO | — |
| financeiro | ALL | RO | ALL | — | — | — |
| invoices | ALL | ALL | ALL | — | RO | RO |
| rh | ALL | ALL | RO | — | — | — |
| workforce | ALL | ALL | RO | — | RO | — |
| reports | ALL | RO | RO | — | — | — |
| analytics | ALL | RO | — | — | — | — |
| documents | ALL | ALL | RO | RO | RW | — |
| aprovacoes | ALL | ALL | RW | — | RO | — |
| configuracoes | ALL | RO | — | — | — | — |

**ALL** = CRUD | **RW** = Read+Create+Update | **RO** = Read Only | **—** = No access

### RBAC in Components
Never hide elements via CSS for RBAC — always conditionally render:
```tsx
import { can, type Role } from "@/shared/lib/rbac-core"
{can(user.role as Role, "financeiro", "read") && <FinanceSection />}
```

### Performance — Required Patterns

```typescript
// ❌ N+1 — NEVER await inside a loop
items.map(async (item) => await prisma.something.findUnique(...))

// ✅ Use include/relation or Promise.all for independent queries
const [data, total] = await Promise.all([
  prisma.model.findMany({ where, take, skip, select: { id: true, name: true } }),
  prisma.model.count({ where }),
])

// ❌ Unbounded findMany — NEVER list without pagination
prisma.ordemServico.findMany()

// ✅ Always paginate
prisma.model.findMany({ take: pageSize, skip: (page - 1) * pageSize, orderBy: { criadoEm: 'desc' } })
```

Ensure filterable fields have `@@index` in the Prisma schema. Call `requireUser()` only once per request.

### Tailwind v4 Syntax
This project uses Tailwind **v4** — the syntax differs from v3:
```tsx
// ❌ v3 — not valid in this project
className="w-[var(--size)]"

// ✅ v4 — CSS custom property shorthand
style={{ '--bar': '50%' } as React.CSSProperties}
className="w-(--bar)"

// Static arbitrary values still work:
className="w-[200px]"  // ✅
```
Theme configuration is in `app/globals.css`, not `tailwind.config.js`.

### Sensitive Data
- SSN/ITIN/EIN: encrypted via AES-GCM (`src/shared/lib/crypto.ts`), stored as `documentoEnc` + `docLast4` + `docHash`. Never expose full value.
- JWT tokens: `httpOnly` cookies only — never `localStorage`
- Passwords: bcrypt, salt ≥ 12 — never log or return
- All critical actions must create an `AuditLog` record

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
- **Never hardcode colors** — use CSS variables. Common context → correct class:

| Context | Class |
|---------|-------|
| Page background | `bg-background` |
| Cards / surfaces | `bg-card` |
| Primary text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Borders | `border-border` |
| Primary button | `bg-brand-primary` |
| Destructive button | `bg-destructive` |
| Badge success | `bg-green-500/10 text-green-600` |
| Badge warning | `bg-yellow-500/10 text-yellow-600` |
| Badge error | `bg-destructive/10 text-destructive` |

```tsx
// ❌ Never — breaks dark mode
<div className="bg-white text-gray-700 border-gray-200">
// ✅ Always
<div className="bg-card text-foreground border-border">
```
- Default theme: dark

## Code Patterns

### API Response Format
```typescript
// Success
return NextResponse.json({ data: T, success: true }, { status: 200 })

// Success with pagination
return NextResponse.json({ data, pagination: { page, pageSize, total, totalPages }, success: true }, { status: 200 })

// Error
return NextResponse.json({ error: string, message: string, success: false }, { status: 4xx })
```

**Status codes**: `400` validation | `401` unauthenticated | `403` forbidden | `404` not found | `409` conflict/duplicate | `500` server error

### Page Structure
Every main page should have:
1. Hero section with brand gradient
2. PageHeader with Neuropol title + breadcrumbs
3. Stats cards (when applicable)
4. Content area with loading/empty/error states

Wrap async Server Component pages in `<Suspense>` with a skeleton fallback:
```tsx
export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><AsyncContent /></Suspense>
}
```

Pages inside `(dashboard)` must verify access:
```typescript
const user = await requireServerUser()
const mod = routeToModule("/current-path")
if (mod && !can(user.role as Role, mod, "read")) redirect("/403")
```

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

## Key Environment Variables

These affect runtime performance and must be set in production:

| Variable | Value | Effect |
|---|---|---|
| `TOKEN_VERSION_COLUMN_EXISTS` | `1` | Skips `INFORMATION_SCHEMA` query on boot — prevents ~10s cold start latency |
| `RBAC_TRUST_JWT` | `1` | Skips DB lookup per request — JWT already verified in middleware |
| `REDIS_DISABLED` | `true` | Forces in-memory rate limiter (use when Redis is not available) |

> **⚠️ Sentry is intentionally disabled in `npm run dev`** (`config/next.config.ts`). It adds ~3,000 extra webpack modules per route, causing 60-340s compile times and OOM restarts. Sentry remains active for `npm run build` / production. Never re-enable `withSentryConfig` in dev mode.

## Specialized Agents & Chat Modes

> The instruction files in `.github/instructions/` auto-apply in Copilot based on file type (API routes, pages, components, Prisma schemas, tests). Full business rules in `AGENTS.md`.

Use these for complex tasks within Copilot Chat:

| Agent / Mode | When to use |
|---|---|
| `@erp-architect` | Schema changes, cross-module impact, architectural decisions |
| `@bug-hunter` | Stack traces, root cause analysis, minimal patches |
| `@api-audit` | Creating or reviewing API routes against project standards |
| `@security-review` | Auth, RBAC gaps, OWASP, token/data exposure |
| `@db-migration` | Prisma schema changes and migration safety |
| `@test-generator` | Generating Jest/Playwright tests for existing modules |

Reusable prompts (use `/prompt-name` in Copilot Chat):
`/new-feature`, `/fix-bug`, `/rbac-review`, `/review-page`, `/audit-queries`, `/deploy-checklist`, `/generate-tests`

## Detailed References

- API route standards → `.github/instructions/api-routes.instructions.md`
- Page component patterns → `.github/instructions/react-pages.instructions.md`
- Component patterns → `.github/instructions/react-components.instructions.md`
- Prisma schema rules → `.github/instructions/prisma-schema.instructions.md`
- Test patterns → `.github/instructions/tests.instructions.md`
- Tax/fiscal rules → `.github/skills/financial-tax-compliance/SKILL.md`
- Full business rules & anti-patterns → `AGENTS.md`
