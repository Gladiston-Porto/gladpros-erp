# GladPros ERP

Sistema de gestão empresarial para GladPros LLC — Dallas, Texas.

Next.js 15 · Prisma + MySQL 8 · TypeScript · Tailwind v4

## Sistema de Qualidade em Camadas (Swiss Cheese Model)

Este repositório tem um sistema de qualidade em 7 camadas que impede bugs P1/P2 de regredir:

| Camada | Ferramenta | Onde roda |
|--------|------------|----------|
| 0 — Registro auditável | `known-bugs.json` + validador | pre-commit + CI |
| 1 — Regex anti-patterns | `check-module-health.mjs` | pre-commit + CI |
| 2 — AST semântico | **Semgrep** `.semgrep/gladpros/` | pre-commit + CI |
| 2b — Estilo + tipos | ESLint + tsc | CI |
| 4 — Regressão 1:1 | Jest `@bug:ID` | CI |
| 5 — Certificação | `certify-module.mjs` | cron semanal |
| 6 — GitHub workflow | quality-gate + branch protection | todo PR |

Ver: `docs/architecture/13-quality-system-layers.md`

## Auditoria agendada

- **Semanal** (toda segunda 06:00 CT): `.github/workflows/weekly-audit.yml`
- **Mensal** (dia 1 de cada mês): `.github/workflows/monthly-deep-audit.yml`
- **A cada PR**: `.github/workflows/quality-gate.yml`

## Governança por módulo

Cada módulo tem `relatorios/modulos/<MODULO>/governance.json` com critérios de certificação e data de vencimento.

## Primeiros passos

```bash
npm install
npm run db:generate
npm run dev
```

## Comandos de qualidade

```bash
npm run semgrep          # rodar regras semânticas
npm run known-bugs:validate  # validar registro de bugs
npm run quality:gate     # rodar todas as camadas
```
