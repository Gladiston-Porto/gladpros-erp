# ARQUIVO — Documentação Histórica do Módulo Projetos

> ⚠️ Estes documentos são **registros históricos** de como o módulo foi construído fase a fase.
> **NÃO use estes arquivos como fonte da verdade sobre o estado atual do módulo.**
>
> A fonte da verdade única e atual está em: `docs/modules/projetos/README.md`

## Conteúdo deste arquivo

| Arquivo | Período | O que contém |
|---|---|---|
| `01-implementation-plan.md` | set/2025 | Plano original de 8 fases |
| `01-modulo-projetos-completo.md` | set/2025 | Descrição da entrega da Fase 2 (domain services) |
| `02-stages-integration.md` | set/2025 | Entrega da Fase 3 (etapas + materiais) |
| `RELATORIO-FASE-5-COMPLETO.md` | out/2025 | Entrega da Fase 5 (integração estoque) |
| `RELATORIO-FASE-6-COMPLETO.md` | out/2025 | Entrega da Fase 6 (sistema de triagem) |
| `RELATORIO-FASE-7-COMPLETO.md` | out/2025 | Entrega da Fase 7 (integração financeira) |
| `RELATORIO-FASE-8-COMPLETO.md` | nov/2025 | Entrega da Fase 8 (eventos/notificações — parcialmente implementado) |
| `RELATORIO-FINAL-MODULO-PROJECTS.md` | jan/2026 | Consolidado pós-Fase 8 (296 testes — número desatualizado) |
| `05-production-hardening-plan.md` | mai/2026 | Plano de hardening antes da auditoria profunda |

## O que mudou desde o "RELATORIO-FINAL"

O módulo passou por ciclos intensos de hardening e novas features após janeiro/2026:

- **Health Score engine** com 7 tipos de alertas operacionais e financeiros
- **Cálculo de margem real** (inclui labor + expenses, não só materiais)
- **Separação de visibilidade GERENTE vs FINANCEIRO** nos dados financeiros
- **Bloqueio de conclusão** com invoices abertas (P1)
- **Change Orders** — CRUD completo (create/approve/reject)
- **Billing schedule** — planejado vs executado por tipo de invoice
- **AuditLog de eventos de projeto** — corrigido (era bug pré-existente)
- **EventBus handlers** para project.statusChanged e project.completed
- Suite de testes: **159 suites / 2060 testes** (não 296 como no relatório antigo)
