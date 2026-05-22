---
description: "Cria uma nova regra Semgrep para o GladPros ERP com base em um bug ou invariante descrito. Gera o arquivo YAML pronto para uso."
---

# Add Semgrep Rule

Crie uma nova regra Semgrep para o GladPros baseada no bug ou padrão descrito.

## Instruções

Você é um especialista em Semgrep e segurança do GladPros ERP.

**Antes de criar**, pergunte ao usuário:
1. Qual é o padrão problemático? (ex: "DELETE de usuario sem tokenVersion")
2. Qual é o padrão correto? (o que deve existir em vez disso)
3. Em que arquivos/diretórios deve aplicar?
4. É um ERROR (bloquear CI) ou WARNING (alertar)?

---

## Template de Regra

Salvar em: `.semgrep/gladpros/[nome-kebab-case].yml`

```yaml
rules:
  - id: [nome-kebab-case]
    message: |
      [Descrição clara do problema.]
      [Por que é perigoso.]
      [O que deve ser feito em vez disso.]
    severity: ERROR  # ou WARNING, INFO
    languages: [typescript]
    
    patterns:
      - pattern: |
          [padrão problemático]
      - pattern-not: |
          [padrão correto — exclui falsos positivos]
    
    metadata:
      category: security  # security | correctness | performance | maintainability
      confidence: HIGH    # HIGH | MEDIUM | LOW
      module: [modulo]    # usuarios | financeiro | etc.
      bug-id: "[BUG-ID]" # se relacionado a bug conhecido
      fix: |
        [Instrução de correção em 1-2 linhas]
```

---

## Dicas de Sintaxe

```yaml
# Qualquer expressão intermediária: ...
patterns:
  - pattern: |
      prisma.usuario.update({
        ...,
        data: { ..., status: 'INATIVO', ... }
      })

# Exceção (padrão correto que exclui):
  - pattern-not: |
      prisma.usuario.update({
        ...,
        data: { ..., tokenVersion: ..., ... }
      })

# Ou entre vários padrões:
pattern-either:
  - pattern: prisma.$MODEL.findUnique({ where: { id: $ID } })
  - pattern: prisma.$MODEL.findFirst({ where: { id: $ID } })
```

---

## Testar a Regra

```bash
# Testar contra o código existente
semgrep --config=.semgrep/gladpros/[nome-arquivo].yml src/

# Testar contra arquivo específico
semgrep --config=.semgrep/gladpros/[nome-arquivo].yml src/app/api/[modulo]/

# Ver com contexto de código
semgrep --config=.semgrep/gladpros/[nome-arquivo].yml --verbose src/
```

---

## Após Criar a Regra

1. Confirmar zero falsos positivos: `semgrep ... src/ 2>&1 | grep ERROR | wc -l`
2. Se a regra foi criada para um bug, atualizar `relatorios/known-bugs.json` com referência à regra
3. Confirmar que a regra está sendo executada no pre-commit: ver `.husky/pre-commit`
4. Confirmar que a regra está no CI: ver `.github/workflows/quality-gate.yml`

---

## Catálogo de Regras Existentes

| Arquivo | Detecta |
|---------|---------|
| `tokenVersion-on-user-deactivation.yml` | UPDATE/DELETE de Usuario sem tokenVersion++ |
| `can-check-on-usuarios-route.yml` | Rotas de usuarios sem can() |
| `empresaId-on-prisma-where.yml` | findUnique/findFirst sem empresaId |
| `banned-imports.yml` | Imports legados proibidos |
