# Módulo Clientes — Atualização 2026-04-19

**Tipo**: Correção de qualidade (design system + cobertura de checklist expandido)  
**Status**: ✅ Aplicado

---

## O que foi feito

### 1. `Pagination.tsx` — migração completa para design tokens

**Problema**: O componente `src/components/clientes/Pagination.tsx` estava com todas as cores hardcoded (Tailwind direto), sem usar os tokens do design system do projeto. O mesmo componente é reutilizado pelo módulo `propostas`.

**Correção aplicada**:

| Antes | Depois |
|---|---|
| `bg-white` | `bg-card` |
| `text-gray-700` / `text-gray-500` | `text-foreground` / `text-muted-foreground` |
| `border-gray-200` / `border-gray-300` | `border-border` |
| `hover:bg-gray-50` | `hover:bg-muted` |
| `bg-blue-50 border-blue-500 text-blue-600` (página ativa) | `bg-brand-primary/10 border-brand-primary text-brand-primary` |
| `rounded-lg` / `rounded-md` | `rounded-2xl` / `rounded-xl` |
| SVGs inline para setas | `ChevronLeft` / `ChevronRight` do lucide-react |

`'use client'` adicionado (componente usa event handlers).

**Impacto**: Corrige dark mode e consistência visual em `clientes` e `propostas` (único consumidor externo).

---

### 2. Remoção de dark mode hardcoded em componentes de clientes

**Problema identificado pelo checklist expandido (§8.5 AGENTS.md)**: Hardcodes `dark:text-*` sobreescrevem a variável CSS correta com uma cor fixa, quebrando o sistema de temas.

**Arquivos corrigidos**:

| Arquivo | Ocorrências removidas |
|---|---|
| `ClienteDetailsModal.tsx` | `dark:text-green-400` (badge ativo/inativo) |
| `ClienteHistorico.tsx` | `dark:text-green-400` (6×), `dark:text-blue-400` (2×), `dark:text-yellow-400` (3×) |
| `ClienteCard.tsx` | `dark:text-green-400` (badge ativo/inativo) |
| `ClienteForm.tsx` | `dark:text-yellow-400`, `dark:text-yellow-500`, `dark:hover:text-yellow-300` |
| `ClientesTable.tsx` | `dark:text-white` (redundante com `text-foreground`) |

---

### 3. `ClienteFilters.tsx` — migração completa para design tokens

**Problema**: Componente de filtros com todas as cores hardcoded (`bg-white`, `border-gray-300`, `placeholder-gray-500`, `dark:bg-gray-800`, `dark:text-white`, `focus:ring-blue-500`, `bg-blue-100`, `bg-purple-100`, `bg-green-100`).

**Correção aplicada**:

| Antes | Depois |
|---|---|
| `bg-white rounded-lg border-gray-200` (container) | `bg-card rounded-2xl border-border` |
| `text-gray-700` (labels) | `text-muted-foreground` |
| SVG inline de busca | `Search` do lucide-react |
| `bg-white border-gray-300 dark:bg-gray-800 dark:text-white` (inputs) | `bg-background border-border text-foreground` |
| `placeholder-gray-500` | `placeholder:text-muted-foreground` |
| `focus:ring-blue-500 focus:border-blue-500` | `focus:ring-brand-primary focus:border-brand-primary` |
| `rounded-md` (inputs/selects) | `rounded-xl` |
| `text-gray-700 bg-gray-100` (botão limpar) | `text-muted-foreground bg-muted` |
| `border-gray-100` (separador) | `border-border` |
| `text-gray-500` (label filtros ativos) | `text-muted-foreground` |
| `bg-blue-100 text-blue-800` (badge busca) | `bg-brand-primary/10 text-brand-primary` |
| `bg-purple-100 text-purple-800` (badge tipo) | `bg-muted text-foreground` |
| `bg-green-100 text-green-800` (badge ativo) | `bg-green-500/10 text-green-600` |
| SVGs inline dos botões X | `X` do lucide-react + `aria-label` adicionado |

**Resultado**: Zero cores hardcoded, zero `dark:` hardcodes, zero SVGs inline. Design consistente com todos os outros módulos.

---

## Checklist de novos itens (processo expandido)

| Check | Resultado |
|---|---|
| Middleware cobre o módulo | ✅ Matcher universal cobre todas as rotas |
| `requireServerUser()` nas pages | ✅ Todas as páginas têm auth |
| Variáveis `process.env` documentadas | ✅ `APP_URL`, `ASSETS_BASE_URL`, `SUPPORT_EMAIL` adicionadas ao `.env.example` |
| Cores hardcoded — varredura expandida | ✅ Zero ocorrências em todo o módulo |
| Dark mode hardcodes | ✅ Zero `dark:text-*` ou `dark:bg-*` em todo o módulo |
| Lint sem erros | ✅ |
| TypeScript sem erros | ✅ |
