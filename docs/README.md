# GladPros ERP — Documentação Técnica

Sistema ERP para GladPros LLC — empresa de construção e serviços em Dallas, Texas.

> **Convenção de nomes**: todos os arquivos seguem o padrão `NN-slug.md` (número de ordem + slug descritivo).  
> **Arquivos obsoletos** (fases concluídas, duplicatas) estão em `docs/archive/` — preservados para referência.

---

## Índice Rápido

| Seção | Conteúdo |
|-------|---------|
| [Architecture](#architecture) | Visão geral do sistema, RBAC, TypeScript, escalabilidade |
| [Modules](#modules) | Documentação técnica de cada módulo e status de certificação |
| [Security](#security) | Relatórios de segurança, vulnerabilidades, análises |
| [Design System](#design-system) | Status, spec de redesign |
| [Runbooks](#runbooks) | Deploy, incidentes, KMS |
| [Archive](#archive) | Docs de fases concluídas e duplicatas removidas |

---

## Architecture

Documentação da arquitetura geral do sistema.

```
docs/architecture/
├── 00-audit-2025.md            # Auditoria de arquitetura (2025)
├── 01-system-overview.md       # Visão completa do sistema
├── 02-scalability.md           # Estratégia de escalabilidade
├── 03-quality-standards.md     # Padrões de qualidade de código
├── 04-rbac.md                  # Modelo de controle de acesso (RBAC)
├── 05-typescript-guide.md      # Guia TypeScript do projeto
├── 06-production-readiness.md  # Gate obrigatório para declarar módulo production-ready
├── 07-modular-arch-plan.md     # Plano de reorganização modular da documentação/código
├── 08-engineering-vision-and-action-plan.md  # Visão de engenharia e plano de discussão
├── 09-system-inventory-and-sidebar-audit-plan.md  # Plano inicial para inventário e sidebar
├── 10-system-inventory-and-sidebar-audit.md       # Inventário real, diagnóstico da sidebar e estratégia para discussão
├── 11-operational-system-map.md                   # Mapa operacional do ERP e fluxos entre módulos
└── 12-sidebar-and-module-hardening-decisions.md   # Decisões propostas para sidebar e hardening
```

---

## Modules

Documentação técnica de cada módulo.
Cada módulo segue o template de 10 seções: Visão Geral, Arquitetura, Modelo de Dados, API REST, Regras de Negócio, RBAC, Estados, Integrações, Problemas Conhecidos, Roadmap.

> **Importante:** documentação antiga dizendo "produção" ou "completo" não substitui a certificação atual.
> Um módulo só deve ser declarado **Production Ready** se passar pelo gate em `docs/architecture/06-production-readiness.md`.
> Certificação atual dos módulos auditados: `docs/modules/00-production-readiness-certification.md`.

### ✅ Auth
```
docs/modules/auth/
├── 00-spec.md                  # Especificação completa do módulo
└── 01-security-review.md       # Auditoria de segurança e correções
```

### ✅ Clientes
```
docs/modules/clientes/
├── 00-spec.md                  # Especificação completa do módulo
├── 01-audit.md                 # Revisão completa (qualidade + RBAC)
└── 02-security-fixes.md        # Correções de segurança implementadas
```

### ✅ Estoque
```
docs/modules/estoque/
├── 00-spec.md                  # Status final e especificação
├── 01-api-reference.md         # Referência de endpoints da API
├── 02-user-guide.md            # Guia do usuário
└── 03-quality-audit.md         # Auditoria de qualidade
```

### ✅ Financeiro
```
docs/modules/financeiro/
├── 00-overview.md              # Visão geral e resumo
├── 01-decisions.md             # Decisões de design confirmadas
├── 02-schema-invoice.md        # Schema do modelo Invoice
├── 03-schema-ledger.md         # Schema do Ledger / contabilidade
├── 04-chart-of-accounts.md     # Plano de contas (Texas)
├── 05-api-reference.md         # Referência da API
├── 06-reports.md               # Relatórios financeiros
├── 07-automation-hooks.md      # Automações e hooks
└── 08-executive-summary.md     # Sumário executivo
```

### ✅ Invoices *(novo)*
```
docs/modules/invoices/
└── 00-spec.md                  # Especificação completa: ciclo de vida, PDF, pagamentos, RBAC
```

### ✅ Projetos
```
docs/modules/projetos/
├── 00-spec.md                  # Especificação do módulo
├── 01-implementation-plan.md   # Plano de implementação
├── 02-stages-integration.md    # Integração de etapas
├── 03-bugfix-infinite-loop.md  # Fix: loop infinito
├── 04-atualizacao-2026-05.md   # Log de atualizações e auditoria parcial
└── 05-production-hardening-plan.md  # Plano de auditoria e hardening para production readiness
```

### ✅ Propostas
```
docs/modules/propostas/
├── 00-spec.md                  # Especificação e sumário de implementação
└── 01-layout-patterns.md       # Padrões de layout e padronização
```

### ✅ Reports (Relatórios) *(novo)*
```
docs/modules/reports/
└── 00-spec.md                  # Hub de relatórios, tipos, API, RBAC
```

### ✅ RH
```
docs/modules/rh/
└── 00-spec.md                  # Especificação completa do módulo RH
```

### ✅ Service Orders (Ordens de Serviço) *(novo)*
```
docs/modules/service-orders/
└── 00-spec.md                  # Ciclo completo: criação → execução → invoice, máquina de estados, RBAC
```

### ✅ Usuários *(novo)*
```
docs/modules/usuarios/
├── 00-spec.md                  # Gerenciamento de usuários, hierarquia de roles, RBAC, segurança
└── 01-audit.md                 # Auditoria histórica — revalidar pelo gate production-ready
```

### ✅ Workforce
```
docs/modules/workforce/
└── 00-spec.md                  # Especificação completa do módulo Workforce
```

---

## Security

Relatórios de segurança, análises de vulnerabilidades e correções.

```
docs/security/
├── 00-overview.md                  # Relatório geral de segurança
├── 01-vulnerabilities-fixed.md     # Correções implementadas
├── 02-vul-003-token-rotation.md    # Checklist VUL-003: Token Rotation
├── 03-vul-004-kms.md               # VUL-004: KMS — conclusão final
└── 04-login-security-analysis.md   # Análise de segurança do login
```

---

## Design System

```
docs/design-system/
├── 00-status-report.md         # Status atual do design system
└── 01-redesign-spec.md         # Proposta de redesign geral
```

> Preview interativo: [`public/design-system-preview.html`](../public/design-system-preview.html)

---

## Runbooks

Procedimentos operacionais para deploy, incidentes e operações de KMS.

```
docs/runbooks/
├── 00-deploy.md                # Checklist de deploy
├── 01-incident-response.md     # Resposta a incidentes
└── 02-kms-operations.md        # Operações de KMS (rotação de chaves)
```

---

## Outros

```
docs/gate-pre-beta-provas.md    # Critérios de qualidade pré-beta (gates)
```

---

## Archive

Documentos de fases concluídas, duplicatas e análises históricas.  
**Não deletados** — preservados para auditoria e referência.

```
docs/archive/
├── design-system/
│   ├── 2025-q4-execution-plan.md       # Plano de execução Q4/2025 (concluído)
│   ├── 2025-q4-sumario-executivo.md    # Sumário executivo Q4/2025
│   └── 2025-q4-gap-analysis.md         # Gap analysis Q4/2025
└── audits/
    ├── 2025-security-senior-review.md  # Senior review de módulos (Nov/2025)
    ├── 2025-vul-003-token-rotation.md  # Relatório VUL-003 original
    ├── 2025-financeiro-analise-completa.md
    ├── 2025-financeiro-contas-bancarias.md
    ├── 2025-financeiro-despesas-apis.md
    ├── 2025-financeiro-invoice-system.md
    ├── 2025-financeiro-receitas.md
    └── 2025-financeiro-despesas.md
```

---

## Status dos módulos (resumo rápido)

| Módulo | Status documental | Doc principal |
|--------|-------------------|--------------|
| Auth / MFA | Needs re-audit pelo gate production-ready | `modules/auth/00-spec.md` |
| Clientes | Needs re-audit pelo gate production-ready | `modules/clientes/00-spec.md` |
| Estoque | Needs re-audit pelo gate production-ready | `modules/estoque/00-spec.md` |
| Financeiro | Needs re-audit pelo gate production-ready | `modules/financeiro/00-overview.md` |
| Invoices | Needs re-audit pelo gate production-ready | `modules/invoices/00-spec.md` |
| Projetos | Needs re-audit pelo gate production-ready | `modules/projetos/00-spec.md` |
| Propostas | Needs re-audit pelo gate production-ready | `modules/propostas/00-spec.md` |
| Reports | Needs re-audit pelo gate production-ready | `modules/reports/00-spec.md` |
| RH | Needs re-audit pelo gate production-ready | `modules/rh/00-spec.md` |
| Service Orders | Needs re-audit pelo gate production-ready | `modules/service-orders/00-spec.md` |
| Usuários | Needs re-audit pelo gate production-ready | `modules/usuarios/00-spec.md` |
| Workforce | Needs re-audit pelo gate production-ready | `modules/workforce/00-spec.md` |

> Status "Needs re-audit" não significa que o módulo está quebrado; significa apenas que a documentação antiga não contém a evidência mínima exigida pelo gate atual.
