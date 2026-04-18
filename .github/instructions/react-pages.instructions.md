---
description: "Use when creating or modifying page components. Covers layout structure, hero sections, RBAC, loading/empty/error states, and responsive patterns for all pages."
applyTo: "src/app/**/page.tsx"
---

# Page Component Standards

## Server-Side Auth & RBAC
Every page inside `(dashboard)` MUST verify access:
```typescript
import { requireServerUser } from "@/shared/lib/requireServerUser"
import { can, routeToModule, type Role } from "@/shared/lib/rbac-core"
import { redirect } from "next/navigation"

export default async function Page() {
  const user = await requireServerUser()
  const mod = routeToModule("/current-path")
  if (mod && !can(user.role as Role, mod, "read")) redirect("/403")
  // ...
}
```

## Page Structure
Every main page follows this order:
1. **Hero section** — brand gradient `bg-hero-gradient` (`linear-gradient(135deg, #0098DA 0%, #006899 100%)`)
2. **PageHeader** — Neuropol title (`font-title font-display`) + breadcrumbs
3. **Stats cards** — when applicable (KPIs, counters)
4. **Content area** — with proper loading / empty / error states

## Suspense
Wrap async server pages in `<Suspense>` with a skeleton fallback:
```typescript
import { Suspense } from "react"

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AsyncContent />
    </Suspense>
  )
}
```

## States
- **Loading**: Use skeleton components or `LoadingSpinner`
- **Empty**: Use `EmptyState` component with descriptive message and action CTA
- **Error**: Use `error.tsx` boundary per route segment

## Responsive (Tablet-First)
- Base: single column
- `md:` (768px): two columns
- `lg:` (1024px): three columns
- Grid pattern: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Touch targets: minimum 48px (buttons, links, interactive elements)

## Typography
- Page title: `font-title font-display` (Neuropol)
- Section headings: `text-lg font-semibold`
- Body: default Roboto (`font-sans`)
- Base size: 16px

## Spacing & Shapes
- Spacing grid: 8px base unit (p-2, p-4, p-6, p-8)
- Cards/panels: `rounded-2xl` (16px)
- Use consistent padding: `p-4 sm:p-6`

## Data Formatting
- Currency: USD with `en-US` locale — never BRL
- Dates: `America/Chicago` timezone — never UTC for display
- Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` for money
- Use `Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago' })` for dates
