---
applyTo: "**/*.ts,**/*.tsx"
---

# Instruções para Correção de Bugs

Quando corrigir um bug no GladPros ERP, seguir este protocolo obrigatório.

## 1. Antes do Fix — Investigação

1. Verificar se o bug já existe em `relatorios/known-bugs.json`
2. Se não existir, adicionar como `status: "OPEN"` antes de começar
3. Identificar **todos** os arquivos afetados — não só o principal
4. Verificar sub-paths, helpers e funções reutilizadas pelo handler
5. Verificar se o bug existe em outros módulos com lógica similar

## 2. O Fix

- Fazer a **mudança mínima necessária** — não refatorar junto
- Cobrir **todos os locais afetados** identificados na investigação
- Não alterar comportamento de código não relacionado
- Preservar todos os imports e tipos existentes

### Padrões de Fix Seguros

```typescript
// P2 de tokenVersion — sempre ao mudar status para INATIVO
await prisma.usuario.update({
  where: { id, empresaId: user.empresaId },
  data: {
    status: 'INATIVO',
    tokenVersion: { increment: 1 },  // ← obrigatório
    atualizadoEm: new Date()
  }
})

// P2 de RBAC ausente — sempre antes de operações sensíveis
if (!can(user.role as Role, 'modulo', 'acao')) {
  return NextResponse.json(
    { error: 'Forbidden', message: 'Sem permissão', success: false },
    { status: 403 }
  )
}

// P2 de IDOR — sempre incluir empresaId no where
const registro = await prisma.modelo.findUnique({
  where: { id: Number(params.id), empresaId: user.empresaId }  // ← obrigatório
})
```

## 3. Criar Teste de Regressão (OBRIGATÓRIO)

```typescript
// src/__tests__/api/[modulo]/regression/[BUG-ID].test.ts
// @bug:[BUG-ID]
// @description: [o que causava o problema]
// @fix: [arquivo:linha — o que foi mudado]

describe('REGRESSION [BUG-ID]', () => {
  it('deve [comportamento correto]', async () => { ... })
})
```

## 4. Atualizar known-bugs.json

```json
{
  "id": "MODULO-P2-XXX",
  "status": "FIXED",
  "fixedAt": "YYYY-MM-DD",
  "fixedInCommit": "abc1234",
  "regressionTest": "src/__tests__/api/[modulo]/regression/[BUG-ID].test.ts"
}
```

**⚠️ NUNCA marcar FIXED sem `regressionTest` preenchido.**

## 5. Criar/Atualizar Regra Semgrep (se bug de invariante)

Se o bug representa uma invariante do sistema (ex: "sempre incrementar tokenVersion ao desativar"),
criar regra em `.semgrep/gladpros/nome-da-regra.yml`.

Consultar `.github/skills/semgrep-rules/SKILL.md` para o template.

## 6. Validação Final

```bash
npm test -- --testPathPattern="[BUG-ID]"  # teste de regressão passa?
node scripts/check-module-health.mjs       # health check limpo?
npm run lint                               # zero warnings?
```

## 7. Commit

Mensagem de commit deve referenciar o bug ID:

```
fix([modulo]): [BUG-ID] — [descrição curta do fix]

- Problema: [o que causava]
- Fix: [o que foi mudado e onde]
- Teste: src/__tests__/.../[BUG-ID].test.ts

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## Anti-patterns ao Corrigir Bugs

- ❌ Marcar FIXED sem teste de regressão
- ❌ Corrigir apenas o arquivo principal, esquecendo sub-paths/helpers
- ❌ Refatorar junto com o fix (mistura responsabilidades)
- ❌ Declarar "corrigido" baseado em teste manual sem teste automatizado
- ❌ Não atualizar known-bugs.json
- ❌ Criar teste com `.only` (bloqueia CI — detectado pelo ESLint)
