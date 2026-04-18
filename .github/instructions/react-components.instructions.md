---
description: "Use when creating or modifying React components. Covers component library imports, accessibility, dark mode, touch targets, and role-based visibility."
applyTo: "src/components/**/*.tsx"
---

# Component Standards

## Component Library
- Import from `@gladpros/ui` when available: Button, Badge, Card, Input, Select, Dialog, Toast, Tabs, PageHeader, Pagination, EmptyState, etc.
- Fallback to `@/components/ui/` only for local shadcn components not in @gladpros/ui
- Never duplicate a component that exists in @gladpros/ui

## Accessibility (WCAG 2.1 AA)
- All interactive elements MUST have `aria-label` or associated `<label>`
- Use semantic HTML elements (`<nav>`, `<main>`, `<section>`, `<button>`)
- Add `role` attributes where semantic HTML is insufficient
- Implement focus management in dialogs and modals
- Support keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Maintain visible focus indicators

## Dark Mode
- Use CSS variables from the design system — never hardcode colors
- Class-based toggling (`.dark` on `<html>`)
- Test both themes: light and dark
- Default theme: dark

## Touch Targets
- Minimum 48×48px for all interactive elements (buttons, links, inputs)
- Adequate spacing between touch targets (minimum 8px gap)

## Shapes & Spacing
- Standard border radius: `rounded-2xl` (16px)
- Spacing grid: 8px base unit
- Consistent padding: `p-4 sm:p-6`

## Role-Based Visibility
When components need to show/hide based on user role:
```typescript
import { can, type Role, type ModuleKey } from "@/shared/lib/rbac-core"

// Show element only if user has permission
{can(user.role as Role, "financeiro", "read") && (
  <FinanceSection />
)}
```
Never hide elements via CSS for RBAC — conditionally render them.

## Brand Colors
- Primary: `#0098DA` (Blue) — `text-brand-primary`, `bg-brand-primary`
- Secondary: `#FF8C00` (Orange) — `text-brand-secondary`, `bg-brand-secondary`
- Use semantic classes: `text-success`, `text-warning`, `text-error`, `text-info`

## Typography
- Titles/H1: `font-title font-display` (Neuropol)
- Body/everything else: default `font-sans` (Roboto)
