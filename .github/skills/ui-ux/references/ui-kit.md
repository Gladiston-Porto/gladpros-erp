---
title: GladPros UI Kit — Resumo Rápido
---

# GladPros UI Kit (resumo)

Objetivo: fornecer um resumo prático dos tokens e padrões visuais para aplicar o redesign consistente em todas as páginas.

## Tokens principais (fonte: packages/ui/src/tokens)
- **Primary**: `brand-primary` — #0098DA (botões, links, estados ativos)
- **Secondary**: `brand-secondary` — #FF8C00 (CTAs, ênfases)
- **Success / Warning / Error / Info**: semantic tokens (success, warning, error, info)
- **Neutrals**: escala 50 → 900 disponível em `neutral-*`
- **Gradiente Hero**: `bg-hero-gradient` → linear-gradient(135deg, #0098DA 0%, #006899 100%)

## Tipografia
- H1 / titles: Neuropol — `font-title font-display`
- Body / inputs: Roboto — `font-sans`
- Base: 16px, Tablet-first

## Espaçamento e bordas
- Grid base: 8px
- Border radius padrão: `rounded-2xl` (16px)

## Componentes padrão (uso recomendado)
- `PageHeader` — sempre no topo de página (title + breadcrumbs + actions)
- `Card` / `CardHeader` / `CardContent` — painéis principais (usar `rounded-2xl`)
- `EmptyState` — substituir tabelas vazias
- `Skeleton` / `LoadingSpinner` — para componentes async
- `AdvancedPagination` — novo componente (padrão moderno, acessível)

## Padrões de interação
- Ações primárias: `brand-primary` com textos brancos
- Ações secundárias: `brand-secondary-outline` ou `outline`
- Feedback: use `Toast` para confirmações e `Alert` para erros persistentes

## Paginação — guideline rápida
- Mostrar página atual, botões anteriores/próximos, atalhos para primeira/última quando muitas páginas
- Permitir seleção de `pageSize` (10, 25, 50, 100)
- Oferecer campo de "ir para a página" em listas longas
- Sempre `aria-label` em botões e `aria-current="page"` no número atual

## Acessibilidade
- Todos os componentes interativos devem ter `aria-*` apropriados
- Focus visible: garantir `focus:outline`/ring consistente
- Contraste: checar contrast ratios para texto em hero e badges

## Aplicação prática
1. Corrigir `PageHeader` global (feito)
2. Padronizar `EmptyState`, `Skeleton` e `PageHeader` em todas páginas (próximo)
3. Substituir hardcoded colors por tokens
4. Rodar `/consistency-check` e aplicar correções por módulo

Referências: `design-tokens.md`, `component-catalog.md`, `page-patterns.md`.
