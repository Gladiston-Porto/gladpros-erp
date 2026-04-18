---
description: "Visual consistency audit: hero sections, PageHeader, brand colors, component usage, typography"
agent: "agent"
---

# Consistency Check — Visual & Design Standards

Audit the GladPros codebase for visual consistency against the design system.

## Checks

1. **Hero Sections**: Search for hero/gradient sections in pages. Every main page under `(dashboard)` should use `bg-hero-gradient`. Report pages missing the hero section.

2. **PageHeader**: Every page should use the `PageHeader` component from `@gladpros/ui` with:
   - Title using Neuropol font (`font-title font-display`)
   - Breadcrumbs
   - Optional action button
   Report pages using custom headers instead of PageHeader.

3. **Component Usage**: Check that pages use `@gladpros/ui` components (Button, Badge, Card, Input) instead of raw HTML. Search for:
   - `<button` without being a Button component
   - `<input` without being an Input component
   - Custom card divs instead of Card component

4. **Brand Colors**: Search for hardcoded color values that should use CSS variables:
   - `#0098DA` or `rgb(0,152,218)` → should be `brand-primary`
   - `#FF8C00` → should be `brand-secondary`
   - Any other hardcoded hex in className

5. **Border Radius**: Standard is `rounded-2xl` (16px). Search for `rounded-lg`, `rounded-md`, `rounded-xl` that should be `rounded-2xl`.

6. **Typography**: H1/titles should use `font-title font-display` (Neuropol). Search for `text-3xl`, `text-4xl` headings that don't use the correct font class.

## Output Format
```markdown
## Consistency Check — [Date]

### Hero: X/Y pages compliant
[list non-compliant pages]

### PageHeader: X/Y pages use it
[list pages with custom headers]

### Components: X violations found
[list raw HTML that should use @gladpros/ui]

### Colors: X hardcoded values
[list file:line with hardcoded colors]

### Border Radius: X non-standard
[list file:line with wrong radius]

### Typography: X violations
[list headings with wrong font]
```
