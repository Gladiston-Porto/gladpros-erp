---
name: ui-ux
description: "Use when working on UI, UX, design, interface, layout, pages, visual components, or making the system beautiful and intuitive. Provides design tokens, component catalog, page patterns, accessibility, and responsive guidelines."
---

# Skill: UI/UX — Design & Interface

> **Versão**: 3.1 — Atualizado em 2026-04-17  
> **Padrão atual**: ModulePageHeader + sub-path imports + CSS oklch tokens

## When to Use
- Criar ou modificar qualquer página, componente ou layout
- Desenhar novas features ou redesenhar existentes
- Revisar consistência visual, acessibilidade ou responsividade
- Construir formulários, tabelas, dashboards ou páginas de detalhe

## Design System Quick Reference

### Brand Identity
- **Primary**: `#0098DA` (Blue) — botões, links, estados ativos
- **Secondary**: `#FF8C00` (Orange) — CTAs, ênfase, acentos
- **Gradiente de hero** (módulos): definido via `ModulePageHeader accentColor="#0098DA"` — NÃO usar `bg-hero-gradient` diretamente em páginas internas
- **`bg-hero-gradient`**: reservado para landing pages e portal público
- **H1/Titles de página**: Neuropol (`font-title font-display`)
- **Body e todo o resto**: Roboto (`font-sans`)
- **Border radius**: `rounded-2xl` (16px) — padrão GladPros para cards e painéis
- **Touch targets**: mínimo 48px
- **Base font**: 16px

### ⚠️ Regra crítica de imports — sub-path obrigatório
O `@gladpros/ui` usa sub-path exports. **NUNCA** importar tudo de um barrel:

```typescript
// ❌ ERRADO — não funciona ou importa bundle desnecessário
import { Button, Card, Badge } from "@gladpros/ui"

// ✅ CORRETO — sub-path imports
import { ModulePageHeader } from '@gladpros/ui/module-page-header'
import { Button } from '@gladpros/ui/button'
import { Badge } from '@gladpros/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card'
import { StatCard } from '@gladpros/ui/stat-card'
import { Input } from '@gladpros/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@gladpros/ui/select'
import { useToast } from '@gladpros/ui/toast'
import { useConfirm } from '@gladpros/ui/confirm-dialog'
import { Skeleton } from '@gladpros/ui/skeleton'
import { PageHeader } from '@gladpros/ui/page-header'
import { AdvancedPagination } from '@gladpros/ui/pagination'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@gladpros/ui/tabs'
```

### Cabeçalho de módulo — padrão atual (ModulePageHeader)
```tsx
import { ModulePageHeader } from '@gladpros/ui/module-page-header'
import { SomeIcon } from 'lucide-react'

<ModulePageHeader
  title="Nome do Módulo"
  description="Descrição breve do módulo"
  icon={<SomeIcon />}
  accentColor="#0098DA"
  breadcrumbs={[
    { label: "Dashboard", href: "/dashboard" },
    { label: "Módulo" },
  ]}
  actions={<Button>Ação Principal</Button>}
/>
```

## References
- [Design Tokens](./references/design-tokens.md) — Colors, typography, spacing, shadows, z-index
- [Component Catalog](./references/component-catalog.md) — 43+ componentes com guia de uso
- [Page Patterns](./references/page-patterns.md) — 5 layouts padrão de página
- [Accessibility](./references/accessibility.md) — Checklist WCAG 2.1 AA
- [Responsive](./references/responsive.md) — Breakpoints tablet-first e padrões

## Templates (Copiar e Adaptar)
- [Page Template](./assets/page-template.tsx) — ModulePageHeader + stats + content + RBAC + states
- [Form Template](./assets/form-template.tsx) — react-hook-form + Zod + @gladpros/ui
- [Table Template](./assets/table-template.tsx) — Sorting + filters + paginação + bulk actions

## Quick Checklist
1. Usando sub-path imports de `@gladpros/ui`? (ex: `from '@gladpros/ui/button'`)
2. Usando `ModulePageHeader` para o cabeçalho da página? (não `bg-hero-gradient` em páginas internas)
3. `ModulePageHeader` tem `title`, `icon`, `accentColor` e `breadcrumbs`?
4. `rounded-2xl` em cards e painéis?
5. Touch targets ≥ 48px?
6. Skeleton de carregamento para conteúdo assíncrono?
7. `EmptyState` para listas vazias?
8. `aria-label` em elementos interativos?
9. Dark mode usa CSS variables — ZERO cores hardcoded (`bg-white`, `text-gray-*`)?
10. Grid responsivo: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`?

## ❌ Anti-patterns — nunca usar
```tsx
// ❌ Cores hardcoded — quebram dark mode
className="bg-white text-gray-700 border-gray-200"
className="dark:bg-gray-800 dark:text-gray-300"

// ✅ Usar tokens semânticos
className="bg-card text-foreground border-border"
className="bg-background text-muted-foreground"

// ❌ Import errado
import { Button } from "@gladpros/ui"

// ✅ Sub-path
import { Button } from "@gladpros/ui/button"

// ❌ bg-hero-gradient em páginas internas do dashboard
<div className="bg-hero-gradient"><PageHeader /></div>

// ✅ ModulePageHeader para módulos internos
<ModulePageHeader title="..." accentColor="#0098DA" ... />
```
