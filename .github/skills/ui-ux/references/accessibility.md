# Accessibility — WCAG 2.1 AA

## Available Components
Import from `@/components/accessibility/`:

| Component | Purpose |
|-----------|---------|
| `SkipLinks` | Skip navigation links (visible on focus) |
| `ScreenReaderAnnouncer` | Assertive live region |
| `PoliteAnnouncer` | Polite live region |
| `AccessibleFormField` | Form field with auto ARIA bindings |
| `AccessibleButton` | Button with `aria-busy` for loading |

Hook: `useAccessibility()` from `@/shared/hooks/useAccessibility`
- `announce(message)` — Screen reader announcement
- `skipToContent()` — Scroll to main content
- `createFocusTrap(element)` — Trap focus in modals
- `prefersReducedMotion` — Respect motion preferences
- `prefersContrast` — Detect high contrast mode

## Checklist

### Interactive Elements
- [ ] All `<button>` and `<a>` have `aria-label` or visible text
- [ ] Touch targets ≥ 48×48px (class: `min-h-[48px] min-w-[48px]`)
- [ ] 8px minimum gap between adjacent targets
- [ ] Loading buttons use `aria-busy="true"`
- [ ] Disabled buttons use `disabled` attribute (not just styling)

### Forms
- [ ] Every `<input>` has associated `<label>` (via `htmlFor`) or `aria-label`
- [ ] Error messages use `aria-describedby` linking to the input
- [ ] Required fields use `aria-required="true"`
- [ ] Form submission errors announced to screen readers

### Dialogs & Modals
- [ ] Focus trapped inside open dialog
- [ ] `Escape` key closes the dialog
- [ ] Focus returns to trigger element on close
- [ ] `role="dialog"` and `aria-modal="true"`
- [ ] Dialog has `aria-labelledby` pointing to title

### Navigation
- [ ] `SkipLinks` component present in layout
- [ ] Sidebar has `aria-label="Sidebar"`
- [ ] Active nav item has visual + ARIA indicator
- [ ] Keyboard: Tab cycles through items, Enter activates

### Color & Contrast
- [ ] Text contrast ratio ≥ 4.5:1 (normal text)
- [ ] Large text contrast ≥ 3:1
- [ ] Never convey info through color alone (add icon/text)
- [ ] Dark mode tested for contrast compliance
- [ ] Use CSS variables (never hardcoded colors)

### Motion
- [ ] Respect `prefers-reduced-motion` for Framer Motion animations
- [ ] No auto-playing animations without user control
- [ ] Transitions ≤ 200ms for micro-interactions

### Semantic HTML
- [ ] Use `<main>`, `<nav>`, `<section>`, `<article>`, `<aside>` appropriately
- [ ] Heading hierarchy (`h1` → `h2` → `h3`, no skips)
- [ ] Lists use `<ul>`/`<ol>` + `<li>`
- [ ] Tables use `<th>` with `scope` attribute

### Screen Reader
- [ ] Dynamic content changes announced via live regions
- [ ] Loading states announced ("Carregando...")
- [ ] Action outcomes announced ("Cliente criado com sucesso")
- [ ] Data table values readable in logical order
