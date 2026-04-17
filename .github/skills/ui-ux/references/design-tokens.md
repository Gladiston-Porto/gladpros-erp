# Design Tokens

> **v3.1** — Atualizado em 2026-04-17. Fonte de verdade: `src/app/globals.css` (oklch colors)

## Brand Colors

| Token | Valor | Tailwind | Uso |
|-------|-------|----------|-----|
| Primary | `#0098DA` | `brand-primary`, `text-brand-primary`, `bg-brand-primary` | Botões, links, estados ativos |
| Primary Light | `#4AC4F5` | `brand-primary-light` | Hover, fundos suaves |
| Primary Dark | `#00569E` | `brand-primary-dark` | Pressed, bordas |
| Secondary | `#FF8C00` | `brand-secondary`, `text-brand-secondary`, `bg-brand-secondary` | CTAs, ênfase, acentos |
| Secondary Light | `#FFB84D` | `brand-secondary-light` | Hover |
| Secondary Dark | `#E67300` | `brand-secondary-dark` | Pressed |

## Cores Semânticas — SEMPRE usar estes em vez de hardcoded

| Token | Tailwind | Uso |
|-------|----------|-----|
| Fundo principal | `bg-background` | Fundo da página, substitui `bg-gray-50`, `bg-gray-100` de fundo |
| Cards / superfícies | `bg-card` | Substitui `bg-white`, `bg-gray-800` (dark) |
| Texto principal | `text-foreground` | Substitui `text-gray-900`, `text-gray-700`, `dark:text-white` |
| Texto secundário | `text-muted-foreground` | Substitui `text-gray-600`, `text-gray-500`, `text-slate-600` |
| Bordas | `border-border` | Substitui `border-gray-100/200`, `border-slate-200`, `dark:border-white/10` |
| Área mutada | `bg-muted` | Substitui `bg-gray-100`, `bg-gray-200` em badges/chips/áreas secundárias |
| Hover interativo | `hover:bg-accent` | Substitui `hover:bg-gray-100`, `dark:hover:bg-gray-700` |
| Input | `bg-input` | Fundo de campos de formulário |

## Gradientes

| Nome | Tailwind | Uso |
|------|----------|-----|
| Hero | `bg-hero-gradient` | **Portal público, landing pages** — NÃO usar em módulos internos |
| Sidebar | `bg-sidebar-gradient` | Sidebar do dashboard |

> ⚠️ **ModulePageHeader** renderiza seu próprio gradiente via `accentColor` prop — não precisa do `bg-hero-gradient`

## Tipografia

| Nível | Font Family | Tailwind | Weight |
|-------|-------------|----------|--------|
| H1 / Display | Neuropol | `font-title font-display` | 700 |
| H2–H6 | Roboto | `font-sans` | 600 |
| Body | Roboto | `font-sans` | 400 |
| Mono | Roboto Mono | `font-mono` | 400 |

### Font Sizes (base 16px)
```
xs: 12px | sm: 14px | base: 16px | lg: 18px
xl: 20px | 2xl: 24px | 3xl: 30px | 4xl: 36px
```

## Spacing (grid de 8px)
```
1: 4px | 2: 8px | 3: 12px | 4: 16px | 5: 20px | 6: 24px
8: 32px | 10: 40px | 12: 48px | 16: 64px | 20: 80px | 24: 96px
```

## Border Radius

| Token | Valor | Tailwind | Uso |
|-------|-------|----------|-----|
| sm | 4px | `rounded-sm` | Elementos pequenos, badges de tag |
| default | 8px | `rounded` | Inputs, dropdowns |
| md | 12px | `rounded-md` | Cards secundários |
| **lg** | **16px** | **`rounded-2xl`** | **Padrão GladPros — cards, painéis, botões principais** |
| xl | 24px | `rounded-3xl` | Seções hero |
| full | 9999px | `rounded-full` | Avatares, pills |

## Shadows
```
sm:  0 1px 2px rgba(0,0,0,0.05)
md:  0 4px 6px rgba(0,0,0,0.1)
lg:  0 10px 15px rgba(0,0,0,0.1)
xl:  0 20px 25px rgba(0,0,0,0.1)
```

## Z-Index Layers
```
base: 0 | dropdown: 10 | sticky: 20 | fixed: 30 | overlay: 40
modal: 50 | popover: 60 | toast: 70 | tooltip: 80 | max: 9999
Sidebar: z-40 | Header: z-30
```

## Dark Mode — Implementação oklch

O sistema usa oklch() no globals.css para cores mais perceptualmente uniformes:
```css
/* Dark mode background */
--background: oklch(0.14 0.01 260);  /* similar ao GitHub dark #0d1117 */
--card: oklch(0.18 0.01 260);
--foreground: oklch(0.98 0 0);
--muted-foreground: oklch(0.65 0.01 260);
--border: oklch(0.28 0.01 260);
```

Dark mode ativado via classe `.dark` no `<html>`. Padrão: dark.
