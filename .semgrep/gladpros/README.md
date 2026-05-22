# Semgrep — Regras GladPros

Regras semânticas (AST-based) que detectam violações de padrões críticos do ERP que `grep` simples não consegue capturar.

## Por que Semgrep?

Empresas como **GitLab, Slack, Snowflake, Dropbox** usam Semgrep como guard de PR/commit. Diferente de regex, Semgrep entende a estrutura sintática do código — pode detectar "uso de `prisma.usuario.update` com `status: 'INATIVO'` SEM `tokenVersion: { increment: 1 }`", o que regex não consegue.

## Regras ativas

| Arquivo | Bug ID | Severidade | O que detecta |
|---|---|---|---|
| `tokenVersion-on-user-deactivation.yml` | USUARIOS-P2-003 | ERROR | `prisma.usuario.update` com status INATIVO sem incrementar tokenVersion |
| `can-check-on-usuarios-route.yml` | USUARIOS-P2-004 | ERROR | Rota em `/api/usuarios/**` sem chamada a `can()` |
| `empresaId-on-prisma-where.yml` | USUARIOS-P2-005 | WARNING | `findUnique`/`findFirst` em modelos críticos sem `empresaId` no where |
| `banned-imports.yml` | — | ERROR | Imports legados (`@/server/db`, `requireAuth`) |

## Como rodar

```bash
# Local (precisa Semgrep instalado: brew install semgrep | pip install semgrep)
npm run semgrep

# Em CI (workflow .github/workflows/semgrep.yml)
# Roda automaticamente em PRs
```

## Como adicionar nova regra

1. Identifique o bug e crie entrada em `relatorios/known-bugs.json` com `semgrepRule` apontando para arquivo aqui
2. Escreva regra YAML (use `pattern-not` para detectar AUSÊNCIA de algo seguro)
3. Teste localmente: `semgrep --config=.semgrep/gladpros/sua-regra.yml src/`
4. Crie teste de regressão em `src/__tests__/` com tag `// @bug:ID`
5. Marque bug como FIXED apenas quando Semgrep não reportar nada nos `affectedFiles`

## Filosofia

Camada 1 do Swiss Cheese Model de qualidade do GladPros (ver `plan-meta-qualidade.md`):
- Regex (Camada 0) → falsos positivos, ignora contexto
- **Semgrep (Camada 1) → entende AST, detecta ausência**
- ESLint plugins (Camada 2) → TypeScript-specific
- CodeQL (Camada 3) → análise de fluxo
- Testes de regressão por bug ID (Camada 4) → garantia 1:1
