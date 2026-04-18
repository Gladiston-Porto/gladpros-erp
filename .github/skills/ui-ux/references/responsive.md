# Responsive Design — Tablet-First

## Strategy
- **Primary device**: Tablets (768–1024px landscape)
- **Approach**: Design for tablet first, then scale down (mobile) and up (desktop)

## Breakpoints (Tailwind)

| Prefix | Min Width | Device |
|--------|-----------|--------|
| *(none)* | 0px | Mobile (portrait) |
| `sm:` | 640px | Mobile (landscape) |
| `md:` | 768px | **Tablet** (primary target) |
| `lg:` | 1024px | Desktop / Tablet landscape |
| `xl:` | 1280px | Large desktop |
| `2xl:` | 1536px | Extra large |

## Standard Grid Patterns

### Stats Cards
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
```

### Content Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

### Two-Column Layout
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

### Form Fields
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

## Sidebar
- **Expanded**: `w-[280px]` — full labels + icons
- **Collapsed**: `w-[84px]` — icons only with tooltip
- **Content offset**: `pl-[280px]` / `pl-[84px]` with `transition-all`
- Toggle button always visible

## Touch Targets
From `packages/ui/src/tokens/spacing.ts`:

| Level | Size | Usage |
|-------|------|-------|
| Minimum | 48px | All interactive elements |
| Comfortable | 56px | Primary action buttons |
| Large | 64px | Prominent CTAs |
| Extra | 72px | Hero buttons |

### Implementation
```tsx
// Button minimum
<Button className="min-h-12">Action</Button>

// Icon button
<button className="h-12 w-12 rounded-2xl">  {/* 48px */}
  <Icon className="h-5 w-5" />
</button>
```

## Container
```tsx
<main className="mx-auto max-w-[1440px] p-4 sm:p-6">
```

## Responsive Patterns

### Hide/Show by Breakpoint
```tsx
<div className="hidden md:flex">      {/* Hide on mobile */}
<div className="flex md:hidden">       {/* Show only on mobile */}
```

### Responsive Text
```tsx
<h1 className="text-2xl md:text-3xl lg:text-4xl">
```

### Responsive Spacing
```tsx
<div className="p-4 sm:p-6 lg:p-8">
```

### Responsive Table → Cards
On mobile, consider converting table rows to stacked cards:
```tsx
{/* Desktop: table */}
<div className="hidden md:block">
  <Table>...</Table>
</div>
{/* Mobile: cards */}
<div className="md:hidden space-y-4">
  {items.map(item => <MobileCard key={item.id} item={item} />)}
</div>
```
