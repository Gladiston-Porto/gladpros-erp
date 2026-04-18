---
name: web-design-reviewer
description: "Use when reviewing website design running locally or remotely to identify and fix design issues. Triggers on: 'review website design', 'check the UI', 'fix the layout', 'find design problems'. Detects issues with responsive design, accessibility, visual consistency, and layout breakage, then performs fixes at the source code level."
---

# Web Design Reviewer

This skill inspeciona visualmente o site rodando e identifica/corrige problemas de design no código-fonte.

> **Pré-requisito**: O servidor de desenvolvimento deve estar rodando (ex: `npm run dev` → `http://localhost:3000`)
> Para capturas de tela automáticas, o Playwright MCP precisa estar configurado.

## Escopo de Aplicação

- Next.js (App Router)
- React + Tailwind CSS
- Qualquer página local ou em staging

---

## Fluxo de Trabalho

```
Passo 1: Coletar Informações
  → Confirmar URL, framework, método de estilização

Passo 2: Inspeção Visual
  → Navegar pelas páginas
  → Capturar screenshots
  → Identificar problemas

Passo 3: Corrigir Problemas
  → Priorizar por severidade
  → Aplicar correções mínimas
  → Respeitar o design system existente

Passo 4: Verificar Novamente
  → Confirmar que as correções funcionaram
  → Checar regressões

Passo 5: Relatório Final
```

---

## Passo 1: Coleta de Informações

### 1.1 Confirmar URL
Se a URL não for fornecida, perguntar:
> "Por favor, informe a URL do site (ex: `http://localhost:3000`)"

### 1.2 Detecção Automática do Projeto (GladPros)

Para o GladPros, as informações já são conhecidas:

| Item | Valor |
|------|-------|
| Framework | Next.js 15 (App Router) |
| Estilização | Tailwind CSS 4 |
| Componentes | @gladpros/ui + shadcn/ui |
| Fonte Título | Neuropol (`font-title`) |
| Fonte Corpo | Roboto (padrão) |
| Cor Primária | `#0098DA` |
| Cor Secundária | `#FF8C00` |
| Tema padrão | Dark mode |
| Dispositivo alvo | Tablet (768-1024px) |

---

## Passo 2: Inspeção Visual

### Problemas de Layout

| Problema | Descrição | Severidade |
|----------|-----------|------------|
| Overflow de elemento | Conteúdo saindo do container | Alta |
| Sobreposição | Elementos sobrepostos involuntariamente | Alta |
| Alinhamento | Problemas de grid/flex | Média |
| Espaçamento inconsistente | Padding/margin variando sem padrão | Média |
| Texto cortado | Texto longo sem tratamento | Média |

### Problemas Responsivos

| Problema | Descrição | Severidade |
|----------|-----------|------------|
| Layout quebrado em tablet | Layout não funciona em 768px | Alta |
| Breakpoints errados | Transições incorretas entre tamanhos | Média |
| Touch targets pequenos | Botões menores que 48px em tablet | Média |

### Acessibilidade

| Problema | Descrição | Severidade |
|----------|-----------|------------|
| Contraste insuficiente | Razão de contraste < 4.5:1 | Alta |
| Sem estado de foco | Focus não visível no teclado | Alta |
| Alt text faltando | Imagens sem texto alternativo | Média |

### Consistência Visual (Específico GladPros)

| Problema | Descrição | Severidade |
|----------|-----------|------------|
| Cores hardcoded | Usando `bg-white` em vez de `bg-card` | Alta |
| Fonte errada | Usando sans em vez de Neuropol nos títulos | Alta |
| Sem gradient hero | Seção hero sem o gradient da marca | Média |
| border-radius errado | Não usando `rounded-2xl` (16px) padrão | Baixa |
| Cores sem dark mode | Cores que não mudam no dark mode | Alta |

### Viewports para Testar

| Nome | Largura | Dispositivo |
|------|---------|-------------|
| Mobile | 375px | iPhone |
| Tablet | 768px | iPad (FOCO PRINCIPAL) |
| Tablet Paisagem | 1024px | iPad landscape |
| Desktop | 1280px | PC padrão |

---

## Passo 3: Correção de Problemas

### Prioridade

```
P1 — Corrigir Imediatamente (layout quebrado, dark mode incorreto, cores hardcoded)
P2 — Corrigir em seguida (inconsistência visual, espaçamento, tipografia errada)
P3 — Corrigir se possível (ajustes menores, melhorias cosméticas)
```

### Como Encontrar os Arquivos

1. Buscar pelo nome da classe no workspace: `grep_search`
2. Buscar pelo componente pelo texto/estrutura: `semantic_search`
3. Padrões de arquivo:
   - Estilos globais: `src/app/globals.css`
   - Componentes: `src/components/**/*`
   - Páginas: `src/app/**/page.tsx`

### Princípios de Correção

1. **Mudança mínima**: só o necessário para resolver o problema
2. **Respeitar o padrão existente**: seguir o design system do GladPros
3. **Sem breaking changes**: não afetar outras áreas
4. **Dark mode sempre**: qualquer cor deve usar variáveis CSS, não valores fixos

---

## Passo 4: Verificação

1. Recarregar o browser (HMR do Next.js deve atualizar automaticamente)
2. Capturar screenshot das áreas corrigidas
3. Comparar antes e depois
4. Verificar que outros elementos não foram afetados
5. Se um problema precisar de mais de 3 tentativas: consultar o usuário

---

## Formato de Relatório

```markdown
# Resultado da Revisão de Design

## Resumo

| Item | Valor |
|------|-------|
| URL Alvo | {URL} |
| Framework | Next.js 15 |
| Tema | Dark mode |
| Viewports Testados | Mobile, Tablet, Desktop |
| Problemas Encontrados | {N} |
| Problemas Corrigidos | {M} |

## Problemas Detectados

### [P1] {Título do Problema}
- **Página**: {caminho}
- **Elemento**: {descrição}
- **Problema**: {detalhes}
- **Arquivo Corrigido**: `{caminho}`
- **Correção**: {o que foi mudado}

## Problemas Não Corrigidos (se houver)
### {Título}
- **Motivo**: {por que não foi corrigido}
- **Recomendação**: {o que o usuário pode fazer}

## Recomendações Futuras
- {sugestões}
```

---

## Boas Práticas

### FAZER ✅
- Salvar screenshots antes de corrigir
- Corrigir um problema por vez e verificar
- Seguir o design system do GladPros (cores, fontes, breakpoints)
- Usar variáveis CSS para cores (`bg-card`, `text-foreground`, etc.)
- Confirmar com o usuário antes de mudanças grandes

### NÃO FAZER ❌
- Refatoração em larga escala sem confirmação
- Ignorar o design system ou as brand guidelines
- Corrigir múltiplos problemas de uma vez
- Usar cores hardcoded (`bg-white`, `text-gray-900`, etc.)
- Ignorar o dark mode
