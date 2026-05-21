# Regras Semgrep — GladPros ERP

Regras semânticas (AST) que detectam bugs P1/P2 específicos do sistema.

## Por que Semgrep?

Regex normal detecta o que **está presente** mas não o que **está faltando**.
Semgrep usa a AST da linguagem e suporta `pattern-not`, detectando ausência de padrões seguros.

Exemplo: "código que chama `prisma.usuario.update` com `status: INATIVO` mas **sem** `tokenVersion: { increment: 1 }`"
Isso é impossível com regex — é trabalho para análise semântica.

## Regras ativas

| Arquivo | Severidade | Bug | O que detecta |
|---------|------------|-----|---------------|
| `tokenVersion-on-user-deactivation.yml` | ERROR | USUARIOS-P2-003 | `update` com status INATIVO sem tokenVersion |
| `can-check-on-usuarios-route.yml` | ERROR | USUARIOS-P2-004 | Rota em `/api/usuarios/**` sem `can()` |
| `empresaId-on-prisma-where.yml` | WARNING | USUARIOS-P2-005 | `findUnique/findFirst` sem empresaId |
| `banned-imports.yml` | ERROR | — | `@/server/db`, `requireAuth` legados |

## Usar localmente

```bash
# Instalar
brew install semgrep         # macOS
pip install semgrep          # Linux

# Rodar todas as regras
npm run semgrep

# Só nos arquivos staged
npm run semgrep:staged
```

## Criar nova regra

1. Criar `.semgrep/gladpros/<nome-do-bug>.yml`
2. Testar: `semgrep --config=.semgrep/gladpros/<arquivo>.yml src/`
3. Adicionar entrada no `known-bugs.json` com `semgrepRule` apontando para o arquivo
4. Documentar neste README

## Referências

- [Semgrep Docs — Patterns](https://semgrep.dev/docs/writing-rules/pattern-syntax)
- [Semgrep Registry](https://semgrep.dev/r)
- [Slack Engineering — Semgrep at Scale](https://slack.engineering/mitigating-vulnerability-classes-with-semgrep/)
