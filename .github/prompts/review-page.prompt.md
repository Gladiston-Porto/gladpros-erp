---
description: "Full review of a single page: design, usability, accessibility, RBAC, states, responsiveness"
agent: "agent"
---

# Review Page — Comprehensive Page Audit

Perform a thorough review of a single page in the GladPros system.

**Ask the user which page to review** (e.g., `/clientes`, `/usuarios`, `/dashboard`).

## Review Points

### 1. Structure
- [ ] PageHeader with Neuropol title + breadcrumbs?
- [ ] Hero section with `bg-hero-gradient`?
- [ ] Stats cards (if applicable)?
- [ ] Content area properly structured?
- [ ] `<Suspense>` wrapping async content?

### 2. RBAC
- [ ] `requireServerUser()` called?
- [ ] `can(role, module, "read")` checked, redirect to /403?
- [ ] Action buttons (Create, Edit, Delete) conditionally rendered by permission?
- [ ] Data filtered by user context (not showing cross-tenant data)?

### 3. States
- [ ] **Loading**: Skeleton shown while data loads?
- [ ] **Empty**: EmptyState component shown when no data?
- [ ] **Error**: Error boundary or error handling with user-friendly message?
- [ ] **Partial**: Graceful handling when some data fails?

### 4. Design
- [ ] Using `@gladpros/ui` components (Button, Card, Badge, Input)?
- [ ] `rounded-2xl` on cards/panels?
- [ ] Brand colors via CSS variables (no hardcoded)?
- [ ] Dark mode compatible?
- [ ] Consistent spacing (8px grid: p-2, p-4, p-6)?

### 5. Responsiveness
- [ ] Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`?
- [ ] Touch targets ≥ 48px?
- [ ] Content readable at 768px width?
- [ ] No horizontal scroll at tablet width?

### 6. Accessibility
- [ ] `aria-label` on interactive elements?
- [ ] Heading hierarchy (h1 → h2 → h3)?
- [ ] Form labels and error associations?
- [ ] Focus management in modals?

### 7. Data & API
- [ ] API uses `requireUser()` + RBAC check?
- [ ] Pagination for lists?
- [ ] Currency in USD, dates in America/Chicago?
- [ ] No `console.log` in code?

## Output Format
```markdown
## Page Review: [Page Name]
Path: src/app/(dashboard)/[path]/page.tsx
Date: [Date]

### Score: X/7 sections pass

| Section | Status | Issues |
|---------|--------|--------|
| Structure | ✅/⚠️/❌ | [details] |
| RBAC | ✅/⚠️/❌ | [details] |
| States | ✅/⚠️/❌ | [details] |
| Design | ✅/⚠️/❌ | [details] |
| Responsive | ✅/⚠️/❌ | [details] |
| Accessibility | ✅/⚠️/❌ | [details] |
| Data & API | ✅/⚠️/❌ | [details] |

### Critical Issues
1. ...

### Improvements
1. ...
```
