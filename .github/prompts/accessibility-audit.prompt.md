---
description: "Accessibility audit: ARIA labels, keyboard navigation, color contrast, touch targets, screen reader support"
agent: "agent"
---

# Accessibility Audit — WCAG 2.1 AA

Audit GladPros for accessibility compliance.

## Checks

1. **ARIA Labels**: Search for interactive elements (`<button`, `<a`, `<input`) without `aria-label` or associated `<label>`. Every interactive element needs one.

2. **Touch Targets**: Search for buttons and clickable elements. Verify minimum 48×48px:
   - Check for `min-h-[48px]` or equivalent
   - Icon-only buttons should be at least `h-12 w-12`

3. **Skip Links**: Verify `SkipLinks` component is rendered in the main layout (`src/app/(dashboard)/layout.tsx`).

4. **Keyboard Navigation**: Check that dialogs/modals use focus trapping:
   - Dialog components should trap focus
   - Escape key should close modals
   - Focus returns to trigger on close

5. **Color Contrast**: Check for potential contrast issues:
   - Light text on light backgrounds
   - `text-gray-400` or similar low-contrast text
   - Placeholder text contrast

6. **Screen Reader**: Search for:
   - Images without `alt` text
   - Icons without `aria-hidden="true"` or `aria-label`
   - Dynamic content changes without `aria-live` regions

7. **Form Accessibility**: Each form should have:
   - Labels for all inputs
   - Error messages linked via `aria-describedby`
   - Required fields with `aria-required`

## Output Format
```markdown
## Accessibility Audit — [Date]

### ARIA Labels: X missing
[list elements without labels]

### Touch Targets: X undersized
[list small interactive elements]

### Skip Links: ✅/❌

### Keyboard: X issues
[list focus management problems]

### Contrast: X potential issues
[list low-contrast elements]

### Screen Reader: X issues
[list missing alt text, aria-hidden]

### Forms: X issues
[list unlabeled inputs, missing error links]

### Priority Fixes
1. [most critical]
2. ...
3. ...
```
