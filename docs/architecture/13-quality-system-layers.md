# 13 — Sistema de Qualidade em Camadas (Swiss Cheese Model)

> **Status**: Implementado parcialmente em 2026-05-21. Camadas 0, 1, 2, 6 ativas. Camadas 3-5 em construção.
>
> **Origem**: 4 ciclos sucessivos de auditoria do módulo `usuarios` mostraram que bugs P2 reapareciam mesmo após "correção certificada". O sistema anterior (`known-bugs.json` + pre-commit regex) falhou por: JSON corrompido invisível ao parser, dependência de cadastro manual, regex incapaz de detectar AUSÊNCIA de patterns seguros, e ausência de gate em CI.

## Princípio

Nenhuma camada sozinha é suficiente. Cada camada captura uma classe diferente de erro, e juntas formam um filtro robusto inspirado no [Swiss Cheese Model](https://en.wikipedia.org/wiki/Swiss_cheese_model) usado em segurança aeronáutica e por equipes de engenharia da **GitLab, Slack, Snowflake, Dropbox**.

## As 7 Camadas

| # | Nome | Ferramenta | Onde roda | Bloqueante? |
|---|---|---|---|---|
| 0 | Registro auditável de bugs | `relatorios/known-bugs.json` + schema + validador | pre-commit + CI | **Sim** |
| 1 | Anti-patterns por regex | `scripts/check-module-health.mjs` | pre-commit + CI | **Sim** |
| 2 | Regras semânticas (AST) | **Semgrep** (`.semgrep/gladpros/`) | pre-commit + CI | **Sim** |
| 2b | Estilo + tipos | ESLint + tsc | CI | **Sim** |
| 3 | Análise de fluxo | CodeQL (`.github/workflows/codeql.yml`) | CI (PR) | **Sim** |
| 4 | Teste de regressão 1:1 por bug | Jest com tag `// @bug:ID` | CI | **Sim** |
| 5 | Certificação por script | `scripts/certify-module.mjs` (a construir) | manual + cron semanal | **Sim** para release |
| 6 | Workflow GitHub | PR Template + CODEOWNERS + branch protection | GitHub | **Sim** |

## Camada 0 — Registro auditável

**Arquivo**: `relatorios/known-bugs.json` + `relatorios/known-bugs.schema.json`

Regras invioláveis:
1. Único objeto raiz JSON (parser falha em múltiplos)
2. Schema validado em pre-commit e CI
3. Bug FIXED **exige** `fixedAt`, `fixedBy`, `fixCommit`
4. Bug FIXED com `regressionTest: null` é marcado FRÁGIL (warn hoje, error em 2026-Q3)
5. `affectedFiles` não pode ser vazio em bug OPEN
6. IDs únicos no padrão `MODULO-Pn-NNN`

Comando: `npm run known-bugs:validate`

## Camada 1 — Regex anti-patterns

**Arquivo**: `scripts/check-module-health.mjs`

Cobre violações simples e literais: imports legados, `console.log`, `R$`, `BRL`, `empresaId: 1` hardcoded, etc.

**Limitação**: não detecta AUSÊNCIA. Por exemplo, "código que MODIFICA status='INATIVO' mas NÃO chama tokenVersion" — isto é trabalho da Camada 2.

Comando: `npm run health:check`

## Camada 2 — Semgrep (semantic patterns)

**Diretório**: `.semgrep/gladpros/`

Por que Semgrep é diferente:
- Entende a estrutura sintática (AST), não apenas texto
- Suporta `pattern-not` → detecta o que está FALTANDO
- YAML legível, sem build de plugin
- Mesma ferramenta usada por GitLab/Slack/Snowflake

Regras ativas hoje:
| Arquivo | Bug | Detecta |
|---|---|---|
| `tokenVersion-on-user-deactivation.yml` | USUARIOS-P2-003 | `prisma.usuario.update` com status INATIVO sem tokenVersion |
| `can-check-on-usuarios-route.yml` | USUARIOS-P2-004 | Rota em `/api/usuarios/**` sem `can()` |
| `empresaId-on-prisma-where.yml` | USUARIOS-P2-005 | `findUnique/findFirst` sem empresaId |
| `banned-imports.yml` | — | `@/server/db`, `requireAuth` |

Comando: `npm run semgrep`

**Instalar localmente**: `brew install semgrep` (macOS) | `pip install semgrep` (Linux)

## Camada 3 — CodeQL

Já configurada em `.github/workflows/codeql.yml`. Roda análise de fluxo padrão GitHub. Próximo passo: queries customizadas para padrões GladPros (taint analysis em rotas API).

## Camada 4 — Teste de regressão 1:1

**Regra de OURO**: todo bug FIXED **deve** ter um teste com tag `// @bug:ID` no comentário inicial.

Exemplo:
```typescript
// @bug:USUARIOS-P2-003
// Garante que DELETE de Usuario incrementa tokenVersion.
test('DELETE /api/usuarios/[id] incrementa tokenVersion', async () => {
  // ...
});
```

O validador (`scripts/validate-known-bugs.mjs`) cruza referências: bug FIXED → arquivo em `regressionTest` → grep por `@bug:ID` no arquivo.

## Camada 5 — Certificação por script

Substitui certificações em Markdown que ficam desatualizadas. Um módulo é "Production Ready" apenas se `scripts/certify-module.mjs --module=<X>` retornar exit 0.

Checa programaticamente todos os gates de `docs/architecture/06-production-readiness.md`.

## Camada 6 — GitHub workflow

- **`.github/workflows/quality-gate.yml`** — roda todas as camadas em todo PR.
- **Branch protection** (a configurar no GitHub): `main` exige PR review + quality-gate passing.
- **CODEOWNERS** — módulos sensíveis (auth, financeiro, usuarios) exigem review do dono.
- **PR Template** — força declarar bug ID corrigido + teste de regressão criado.

## Por que isto resolve o problema do 4º ciclo

| Falha anterior | Camada que resolve |
|---|---|
| JSON com 2 root objects → parser silencioso lia só metade | 0 — validador exit 1 se inválido |
| Bug cadastrado em arquivo mas faltou em outro | 2 — Semgrep busca AST no codebase inteiro |
| "Corrigido" sem teste, regrediu em refactor | 4 — bug→teste 1:1 obrigatório |
| Certificado em Markdown sem evidência programática | 5 — certificação por script |
| Dev pode `git commit --no-verify` | 6 — CI roda mesmas checagens, PR bloqueado |
| Bug nunca foi auditado, certificação mentiu | 2 — Semgrep varre tudo, não confia em escopo manual |

## Bypass de emergência

`git commit --no-verify` é tecnicamente possível mas:
1. CI roda os mesmos checks → PR não merge
2. Hook envia log para `relatorios/quality-bypass.log` (a implementar)
3. Branch protection do `main` impede push direto

## Roadmap

- [x] Camada 0 — known-bugs.json válido + schema + validador
- [x] Camada 1 — health check existente
- [x] Camada 2 — Semgrep base com 4 regras + workflow
- [x] Camada 6 — quality-gate workflow
- [ ] Camada 2 — adicionar 10+ regras (uma por anti-pattern do AGENTS.md)
- [ ] Camada 3 — CodeQL queries customizadas
- [ ] Camada 4 — converter bugs FIXED em testes de regressão (6 frágeis hoje)
- [ ] Camada 5 — `certify-module.mjs` programático
- [ ] Camada 6 — PR Template + CODEOWNERS + branch protection

Ver plano completo em `relatorios/plan-meta-qualidade.md`.

## Referências externas

- [Semgrep Rules — GitLab](https://gitlab.com/gitlab-org/security-products/sast-rules)
- [Swiss Cheese Model — Wikipedia](https://en.wikipedia.org/wiki/Swiss_cheese_model)
- [Slack Engineering — Semgrep at Slack](https://slack.engineering/mitigating-vulnerability-classes-with-semgrep/)
- [Snowflake — Security as Code](https://www.snowflake.com/blog/security-as-code/)
