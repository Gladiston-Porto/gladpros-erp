---
name: module-audit
description: "Use when auditing, reviewing, or checking quality of a module. Provides a 15-point checklist based on real problems found across the GladPros codebase."
---

# Skill: Module Audit

## When to Use
- Reviewing a module before release or user testing
- Auditing code quality after major changes
- Checking compliance with GladPros standards
- Onboarding to an unfamiliar module

## Audit Procedure

When asked to audit a module, check ALL 15 points below. For each point, report:
- ✅ Pass — meets the standard
- ⚠️ Warning — partially compliant, needs improvement
- ❌ Fail — violates the standard, must fix

## 15-Point Checklist

### Security & Auth
1. **Auth**: All API routes in the module call `requireUser()` as first operation? (except `/api/auth/*`, `/api/portal/*`, `/api/webhooks/*`)
2. **RBAC**: `can(role, module, action)` checked before create/update/delete operations?
3. **Sidebar**: Module visible only to roles with read access? (check `filterNavGroupsByRole` in sidebar)

### Data Integrity
4. **Prisma Import**: Only `import { prisma } from "@/lib/prisma"`? No `@/server/db`, `@/server/db-temp`, `@/shared/lib/prisma`
5. **Mock Data**: No hardcoded mock/fake data in production code?
6. **empresaId**: Retrieved from user context (not hardcoded `empresaId: 1`)?

### Locale & Formatting
7. **Currency**: All money values formatted as USD with `en-US`? No `R$`, `BRL`, or Brazilian formatting?
8. **Timezone**: All displayed dates use `timeZone: "America/Chicago"`? No raw UTC display?

### UX & States
9. **Suspense**: Async server pages wrapped in `<Suspense>` with skeleton fallback?
10. **Loading**: Async client components show skeleton/spinner while loading?
11. **Empty State**: Lists show visual empty state (EmptyState component) when no data?
12. **Error Handling**: try/catch in API routes + user-friendly error messages in UI?

### Quality
13. **Pagination**: Lists with >20 items use `AdvancedPagination`?
14. **Console.log**: No `console.log` debug statements in production code? (use proper logger if needed)
15. **Accessibility**: Interactive elements have `aria-label`? Touch targets ≥48px? Color contrast passes WCAG AA?

## How to Run an Audit

1. Identify the module's files:
   - Pages: `src/app/(dashboard)/<module>/`
   - API: `src/app/api/<module>/`
   - Components: `src/components/<module>/`
   - Services: `src/services/<module>/` or `src/shared/services/`

2. Search for violations:
   ```
   grep -r "console.log" src/app/api/<module>/
   grep -r "@/server/db" src/app/(dashboard)/<module>/
   grep -r "BRL\|R\$" src/app/(dashboard)/<module>/
   grep -r "empresaId.*=.*1" src/app/api/<module>/
   ```

3. Check each page for RBAC + Suspense + loading/empty states

4. Check each API route for requireUser + can() + Zod validation

5. Report findings with file paths and line numbers

## Output Format
```markdown
## Audit: [Module Name]
Date: YYYY-MM-DD
Files audited: X pages, Y API routes, Z components

### Results
| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Auth | ✅ | All routes use requireUser() |
| 2 | RBAC | ⚠️ | Missing can() in PUT /api/module/[id] |
...

### Critical Issues (must fix)
1. [file:line] Description

### Warnings (should fix)
1. [file:line] Description

### Recommendations
1. Description
```
