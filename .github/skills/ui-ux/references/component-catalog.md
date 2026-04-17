# Component Catalog — @gladpros/ui

> **v3.1** — Sempre usar sub-path imports: `from '@gladpros/ui/button'`, não `from '@gladpros/ui'`

43+ componentes. Sempre importar do `@gladpros/ui/*` quando disponível.

## Layout

| Componente | Sub-path | Props principais |
|-----------|----------|-----------------|
| `ModulePageHeader` | `@gladpros/ui/module-page-header` | `title`, `description`, `icon`, `accentColor`, `breadcrumbs`, `actions`, `badges` — **cabeçalho padrão para módulos internos** |
| `Card` | `@gladpros/ui/card` | className |
| `CardHeader` | `@gladpros/ui/card` | — |
| `CardTitle` | `@gladpros/ui/card` | — |
| `CardDescription` | `@gladpros/ui/card` | — |
| `CardContent` | `@gladpros/ui/card` | — |
| `CardFooter` | `@gladpros/ui/card` | — |
| `StatCard` | `@gladpros/ui/stat-card` | `title`, `value`, `icon`, `trend`, `description` — KPI cards nos dashboards |
| `PageHeader` | `@gladpros/ui/page-header` | `title`, `description`, `breadcrumbs`, `actions` — usar apenas onde ModulePageHeader não couber |
| `FinanceCard` | Financial KPI card with icon + value + trend | title, value, icon, trend |
| `Separator` | Horizontal/vertical line divider | orientation |

## Buttons & Actions

| Component | Usage | Key Props |
|-----------|-------|-----------|
| `Button` | Primary action trigger | variant (default/destructive/outline/secondary/ghost/link), size (default/sm/lg/icon), disabled, asChild |
| `LoadingButton` | Button with spinner while loading | loading, loadingText |
| `SubmitButton` | Form submit with auto-loading | — |
| `LogoutButton` | Pre-styled logout button | — |

## Form Inputs

| Component | Usage | Key Props |
|-----------|-------|-----------|
| `Input` | Text input field | type, placeholder, disabled |
| `TextInput` | Enhanced text input with label | label, error |
| `Textarea` | Multi-line text input | rows |
| `Select` | Dropdown selection | options |
| `Checkbox` | Boolean toggle (square) | checked, onCheckedChange |
| `Switch` | Boolean toggle (pill) | checked, onCheckedChange |
| `Label` | Form field label | htmlFor |
| `AuthInput` | Login-specific input styling | — |
| `AuthPassword` | Password input with show/hide | — |
| `PasswordInput` | General password input | — |
| `DateRangePicker` | Date range selection | from, to, onChange |

## Feedback & Status

| Component | Usage | Key Props |
|-----------|-------|-----------|
| `Badge` | Status labels (20+ variants) | variant (default/secondary/destructive/outline + custom) |
| `StockBadge` | Inventory status badge | status |
| `Progress` | Progress bar | value (0-100) |
| `Loading` | Full-page loading overlay | — |
| `LoadingSpinner` | Inline spinner | size |
| `Skeleton` | Content placeholder while loading | className |
| `Toast` / `Toaster` | Notification messages | title, description, variant |
| `ToastContainer` | Toast mount point (already in DashboardShell) | — |

## Dialogs & Overlays

| Component | Usage | Key Props |
|-----------|-------|-----------|
| `Dialog` | Modal dialog | open, onOpenChange |
| `DialogTrigger` | Opens the dialog | asChild |
| `DialogContent` | Dialog body | — |
| `DialogHeader` | Dialog top section | — |
| `DialogTitle` | Dialog heading | — |
| `DialogDescription` | Dialog subtitle | — |
| `AlertDialog` | Confirmation dialog | — |
| `ConfirmDialog` | Pre-built confirm/cancel dialog | — |
| `useConfirm` | Hook for programmatic confirmations | confirm({ title, message, tone }) |
| `Popover` | Floating content panel | — |
| `DropdownMenu` | Context menu / actions menu | — |

## Navigation & Data

| Component | Usage | Key Props |
|-----------|-------|-----------|
| `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` | Tab navigation | value, defaultValue |
| `AdvancedPagination` | Table/list pagination | page, pageSize, total, onPageChange |
| `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableHead` / `TableCell` | Data table | — |

## Specialized

| Component | Usage | Key Props |
|-----------|-------|-----------|
| `SignaturePad` | Digital signature capture | onSave |
| `ProposalSignaturePad` | Proposal-specific signature | — |
| `OptimizedImage` | Next.js Image with lazy loading | src, alt, width, height |
| `PDFExportButton` | Export content as PDF | — |
| `Calendar` | Date picker calendar | selected, onSelect |
| `Avatar` | User avatar with fallback | src, fallback |
| `Form` / `FormContainer` / `FormError` | Form wrapper components | — |

## Local Components (not in @gladpros/ui)
When a component is not available in `@gladpros/ui`, use from `@/components/ui/`:
- Local shadcn components
- `EmptyState` from `@/components/estoque/shared/EmptyState`

## Accessibility Components (from `@/components/accessibility/`)
- `SkipLinks` — Skip navigation for keyboard users
- `ScreenReaderAnnouncer` — Live region announcements
- `PoliteAnnouncer` — Non-urgent announcements
- `AccessibleFormField` — Form field with auto ARIA bindings
- `AccessibleButton` — Button with aria-busy support
