---
name: semgrep-rules
description: "Use quando precisar criar, manter ou entender as regras Semgrep do GladPros. Cobre criação de regras YAML, padrões TypeScript, integração com pre-commit e CI."
---

# Skill: Semgrep Rules

## O que é Semgrep no GladPros

O Semgrep é a **Camada 2 do Swiss Cheese Model** de segurança do GladPros. Ele faz análise estática **semântica** — entende o código, não apenas strings.

Localização das regras: `.semgrep/gladpros/`

---

## Regras Existentes

| Arquivo | O que detecta | Severidade |
|---------|---------------|------------|
| `tokenVersion-on-user-deactivation.yml` | DELETE/update de usuário sem tokenVersion++  | ERROR |
| `can-check-on-usuarios-route.yml` | Rotas de usuarios sem `can()` RBAC | ERROR |
| `empresaId-on-prisma-where.yml` | `findUnique`/`findFirst` sem empresaId no where | WARNING |
| `banned-imports.yml` | Imports legados (@/server/db, requireAuth, etc.) | ERROR |

---

## Como Criar uma Nova Regra

### Template base

```yaml
rules:
  - id: nome-da-regra-kebab-case
    message: |
      Descrição clara do problema.
      Por que isso é perigoso e o que deve ser feito.
    severity: ERROR  # ERROR, WARNING, INFO
    languages: [typescript]
    
    # Para padrões simples:
    pattern: |
      código que é problemático
    
    # Para padrões com exceção:
    patterns:
      - pattern: |
          código problemático
      - pattern-not: |
          código correto (exceção)
    
    # Para padrão em qualquer um de N formatos:
    pattern-either:
      - pattern: |
          formato1
      - pattern: |
          formato2
    
    metadata:
      category: security  # security, correctness, performance, maintainability
      confidence: HIGH    # HIGH, MEDIUM, LOW
      cwe: "CWE-XXX"     # opcional — Common Weakness Enumeration
      fix: |
        Como corrigir: ...
```

### Dicas de Sintaxe TypeScript

```yaml
# Capturar qualquer expressão: use $EXPR
pattern: prisma.usuario.update({ data: { status: $STATUS } })

# Capturar identificadores: use $VAR
pattern: const $RESULT = await prisma.$MODEL.findUnique(...)

# "..." significa "qualquer código no meio"
pattern: |
  prisma.usuario.update({
    ...,
    data: { ..., status: 'INATIVO', ... }
  })

# pattern-not: padrão que exclui (o correto)
pattern-not: |
  prisma.usuario.update({
    ...,
    data: { ..., tokenVersion: ..., ... }
  })
```

---

## Quando Criar uma Nova Regra

Criar regra Semgrep sempre que:

1. Um **P1 ou P2 de segurança** foi encontrado e corrigido
2. Um **padrão de código** causou bug e pode ocorrer em outros lugares
3. Uma **convenção nova** foi adotada no projeto (ex: novo import obrigatório)
4. Um **anti-pattern** foi adicionado à seção 15 do AGENTS.md

**Regra de ouro**: se você corrigiu um bug, crie uma regra para detectar se ele voltar.

---

## Testar uma Regra Localmente

```bash
# Testar regra específica
semgrep --config=.semgrep/gladpros/nome-da-regra.yml src/

# Testar todas as regras GladPros
semgrep --config=.semgrep/gladpros --metrics=off src/

# Testar com arquivo específico
semgrep --config=.semgrep/gladpros/nome-da-regra.yml src/app/api/usuarios/

# Ver todas as violations com contexto
semgrep --config=.semgrep/gladpros --metrics=off --verbose src/
```

---

## Integração com Pre-commit e CI

O pre-commit (`.husky/pre-commit`) já roda Semgrep nos arquivos staged:

```bash
# Trecho do pre-commit
semgrep --config=.semgrep/gladpros --metrics=off $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
```

O CI (`.github/workflows/quality-gate.yml`) roda Semgrep em todo o `src/`:

```yaml
- name: Semgrep scan
  run: pip install semgrep && semgrep --config=.semgrep/gladpros --metrics=off --error src/
```

---

## Falsos Positivos

Se uma regra estiver gerando falso positivo, use a anotação inline:

```typescript
// nosemgrep: nome-da-regra
const resultado = prisma.usuario.findUnique({ where: { id } })
```

**Atenção**: Use `nosemgrep` com moderação. Cada supressão deve ter um comentário explicando por quê.

---

## Catálogo de Padrões GladPros

### Segurança
- Toda mutação em Usuario deve incluir `tokenVersion: { increment: 1 }` quando muda `status → INATIVO`
- Todo endpoint sensível deve ter `can(user.role, modulo, acao)`
- Todo `findUnique`/`findFirst` em modelo com `empresaId` deve incluir `empresaId` no `where`

### Imports
- Nunca importar de `@/server/db`, `@/server/db-temp`, `@/shared/lib/prisma`
- Nunca usar `requireAuth` ou `requireApiUser` (legados)
- Prisma sempre de `@/lib/prisma`
- Auth sempre de `@/shared/lib/rbac` (API) ou `@/shared/lib/requireServerUser` (Server Components)

### Performance
- Nunca `await` dentro de `.map()` ou `.forEach()` sem `Promise.all`
- Nunca `findMany` sem `take` e `skip` em rotas de listagem
