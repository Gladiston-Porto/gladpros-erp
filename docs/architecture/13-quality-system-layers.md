# Arquitetura de Qualidade em Camadas — GladPros ERP
# Swiss Cheese Model: Nenhuma camada é perfeita, mas juntas cobrem todos os buracos

## Por que este sistema existe?

O módulo `usuarios` passou por **4 ciclos de auditoria** e mesmo assim 4 bugs P2 escaparam para produção.
Investigação revelou a causa raiz:

- `known-bugs.json` tinha **2 objetos raiz** — `JSON.parse()` falha silenciosamente no segundo
- 6 bugs OPEN ficavam **invisíveis** ao hook pre-commit
- Bugs FIXED estavam **sem teste de regressão** — qualquer refatoração poderia reintroduzí-los
- CI nunca rodou porque o repo era **100% local** (sem remote configurado)

## As 7 Camadas

```
┌─────────────────────────────────────────────────────────────────────┐
│                  CÓDIGO PRODUTIVO                          │
│                                                              │
│  CAMADA 0 ─ known-bugs.json + validador                     │
│    Registro auditável de TODOS os bugs conhecidos.           │
│    Exit 1 se JSON inválido, IDs duplicados, OPEN sem files. │
│                                                              │
│  CAMADA 1 ─ check-module-health.mjs (regex)                 │
│    Anti-patterns via regex: imports proibidos, console.log,  │
│    ausencia de requireUser, res sem success field.           │
│                                                              │
│  CAMADA 2 ─ Semgrep (AST semântico)                         │
│    O que regex não detecta: ausência de padrões seguros.    │
│    "update com status INATIVO mas SEM tokenVersion"         │
│                                                              │
│  CAMADA 2b ─ ESLint + TypeScript tsc                        │
│    Estilo + tipos estáticos.                                 │
│                                                              │
│  CAMADA 4 ─ Testes de regressão 1:1                        │
│    Cada bug FIXED tem teste @bug:ID que falha se regridir.   │
│                                                              │
│  CAMADA 5 ─ Certificação programada (certify-module.mjs)   │
│    Veredito baseado em evidência, não em opinião.           │
│                                                              │
│  CAMADA 6 ─ GitHub Actions (quality-gate.yml)               │
│    CI obrigatório em todo PR. Não faz merge sem verde.      │
└─────────────────────────────────────────────────────────────────────┘
```

## Por que precisamos de TODAS as camadas?

### Swiss Cheese Analogy
Nenhum queijo suíço tem buracos alinhados. Cada fatia tem buracos em posições diferentes.
Um bug precisa atravessar TODAS as camadas para chegar à produção.

| Camada | Detecta | Não detecta |
|--------|---------|-------------|
| 0 (known-bugs) | regressão de bug DOCUMENTADO | bug novo desconhecido |
| 1 (regex) | padrões textuais simples | padrões semânticos |
| 2 (Semgrep) | ausência de padrões seguros | lógica de negócio |
| 2b (lint/tsc) | tipos e estilo | bugs de runtime |
| 4 (testes) | regressão específica | casos não cobertos |
| 5 (certificação) | status real do módulo | bugs futuros |
| 6 (CI) | qualquer bypass local | ambiente de dev |

## Como grandes empresas resolvem isto

### Slack Engineering
> "Semgrep nos permite escrever regras que detectam a ausência de padrões seguros, não apenas a presença de padrões inseguros."

Referencia: https://slack.engineering/mitigating-vulnerability-classes-with-semgrep/

### GitLab
Branch protection obrigatória + REQUIRED status checks + no bypass, nem para admins.

### Snowflake
Teste de regressão 1:1 por bug crítico: cada incidente gera automaticamente um teste que falha se o incidente se repetir.

## Regras deste projeto

1. **Bug FIXED sem regressionTest = FRÁGIL** — warn agora, error a partir de 2026-07-01
2. **`--no-verify` local não escapa ao CI** — CI sempre roda no PR independente do local
3. **known-bugs.json corrompido = exit 1 imediato** — não aceita estado inválido
4. **Governance.json com vencimento expirado = issue automática** — auditoria nunca fica atrasada silenciosamente
5. **Certificação depende de evidência** — `certify-module.mjs` lê o estado real, não opinão

## Arquivos do sistema

```
.semgrep/gladpros/          # Regras Semgrep (AST)
scripts/validate-known-bugs.mjs  # Camada 0
scripts/check-governance.mjs     # Verifica vencimentos
scripts/generate-weekly-report.mjs  # Relatório auto
.github/workflows/quality-gate.yml     # CI por PR
.github/workflows/weekly-audit.yml     # Cron semanal
.github/workflows/monthly-deep-audit.yml  # Cron mensal
relatorios/known-bugs.json              # Registro mestre
relatorios/modulos/*/governance.json   # Governance por módulo
```
