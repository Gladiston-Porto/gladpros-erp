# Módulo Projetos — Documentação Técnica

> **Fonte da verdade.** Atualizada em: 2026-05-14
> Última versão de código: commit `d5ba768`
> Testes: **162 suites / 2082 testes passando**
>
> 🏆 **PRODUCTION CERTIFIED — v1.8.2** — Todos os P1/P2 resolvidos. DEBT-005 reduzido a P3.
> Certificado em: 2026-05-14 | Co-produtor: Copilot Engineer-in-Chief

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Estado Atual](#2-estado-atual)
3. [Banco de Dados](#3-banco-de-dados)
4. [Machine de Estados](#4-machine-de-estados)
5. [RBAC e Controle de Acesso](#5-rbac-e-controle-de-acesso)
6. [API REST — 34 Endpoints](#6-api-rest--34-endpoints)
7. [Camada de Domínio](#7-camada-de-domínio)
8. [Sistema de Eventos](#8-sistema-de-eventos)
9. [Health Engine](#9-health-engine)
10. [Change Orders](#10-change-orders)
11. [Integração Financeira](#11-integração-financeira)
12. [Integração Estoque](#12-integração-estoque)
13. [Portal do Cliente](#13-portal-do-cliente)
14. [Testes](#14-testes)
15. [Débitos Técnicos](#15-débitos-técnicos)

---

## 1. Visão Geral

O módulo **Projetos** é o núcleo operacional do GladPros ERP. Ele transforma propostas aprovadas em projetos executáveis com controle integral de escopo, etapas, materiais, equipe, custos, saúde e auditoria.

**Responsabilidades:**
- Ciclo de vida completo de um projeto de construção/serviços
- Controle de etapas, tarefas, materiais e movimentações de estoque
- Geração de invoices e resumo financeiro com mascaramento por role
- Health score e alertas operacionais em tempo real
- Change Orders com aprovação
- Trilha completa de auditoria (AuditLog + EventBus)

---

## 2. Estado Atual

| Dimensão | Status | Observação |
|---|---|---|
| Segurança / Auth | ✅ Produção | `requireProjectPermission` em todas as 34 rotas |
| RBAC | ✅ Produção | `can()` + mascaramento financeiro por role |
| Validação Zod | ✅ Produção | Todos os bodies e query params validados |
| AuditLog | ✅ Produção | Corrigido em 2026-05-14 (era bug pré-existente) |
| Paginação | ✅ Produção | Todas as listagens com `take/skip` e `total` |
| Performance | ✅ Produção | `Promise.all` em queries independentes; índices corretos |
| Testes unitários | ✅ Produção | 159 suites / 2060 testes |
| Testes E2E | ⚠️ Pendente | Specs Playwright não foram criadas neste módulo |
| Formatação de moeda | ⚠️ Débito | `formatCurrency` usa `pt-BR/BRL` — deve ser `en-US/USD` |
| Cobertura de rotas | ⚠️ Parcial | 5 rotas sem testes dedicados (ver §14) |

---

## 3. Banco de Dados

### Tabelas Principais

| Tabela (model Prisma) | Descrição |
|---|---|
| `Projeto` | Entidade principal — dados financeiros, datas, responsável, status |
| `ProjetoEtapa` | Marcos/fases do projeto com progresso e checklist |
| `ProjetoMaterial` | Materiais planejados com status: pendente, liberado, devolvido |
| `ProjetoAnexo` | Arquivos anexos — público (visível no portal) ou interno |
| `ProjetoHistorico` | Log imutável de todas as ações no projeto |
| `ProjetoTarefa` | Tarefas vinculadas a etapa ou projeto com assignee |
| `ProjetoMovimentacaoEstoque` | Movimentações físicas de material (bridge com estoque) |
| `ProjetoMaterialEstoque` | Reservas de material no estoque para o projeto |
| `ProjetoEquipamento` | Equipamentos alocados ao projeto |
| `ChangeOrder` | Ordem de mudança de escopo com aprovação |
| `ChangeOrderItem` | Itens da change order (labor, material, fee, discount) |

### Campos Sensíveis (mascarados por role)

```typescript
// Visíveis SOMENTE para ADMIN e FINANCEIRO:
valorEstimado, custoPrevisto, custoReal,
margemPrevista, margemReal, lucroPrevisto, lucroReal
```

### Enums do Schema

```typescript
// Status do projeto (máquina de estados)
Projeto_status: planejado | em_execucao | em_inspecao |
                aguardando_devolucoes | concluido | arquivado |
                suspenso | cancelado

// Prioridade
Projeto_prioridade: baixa | media | alta | critica

// Change Order
ChangeOrderStatus: DRAFT | SENT | APPROVED | APPLIED | REJECTED | VOIDED
ChangeOrderType:  CLIENT_REQUEST | UNFORESEEN | COMPANY_ERROR | CODE_REQUIREMENT
ChangeOrderItemType: LABOR | MATERIAL | FEE | DISCOUNT
```

---

## 4. Machine de Estados

```
planejado
    │
    ▼
em_execucao ──────────► suspenso (reversível)
    │                       │
    ▼                       │
em_inspecao ◄───────────────┘
    │
    ▼
aguardando_devolucoes  (triagens abertas automaticamente)
    │
    ▼
concluido ──────────────► arquivado
    │
    ▼ (qualquer status exceto arquivado)
cancelado
```

**Regras de transição críticas:**
- `concluido` → **bloqueado** se houver invoices em aberto (DRAFT/SENT/OVERDUE) — P1 implementado
- `cancelado` → requer justificativa obrigatória
- `suspenso` → requer justificativa; materiais não podem estar em uso
- Toda transição gera entrada em `ProjetoHistorico` + evento no EventBus

**Ações que disparam eventos:**
- `alterarStatus()` → emite `project.statusChanged` → AuditLog `STATUS_ALTERADO`
- `alterarStatus(CONCLUIDO)` → emite `project.completed` → AuditLog `PROJETO_CONCLUIDO`
- `criar()` → emite `project.created` → Playbook (cria triagem, notifica)

---

## 5. RBAC e Controle de Acesso

### Permissões por Role

| Role | Projetos | Dados Financeiros | Materiais | Health/Alertas |
|---|---|---|---|---|
| ADMIN | CRUD total | ✅ Completo | ✅ | ✅ Todos os alertas |
| GERENTE | CRUD (sem financeiros) | ❌ Mascarado | ✅ | ✅ Só alertas operacionais |
| FINANCEIRO | Read + rotas financeiras | ✅ Completo | ❌ | ✅ Todos os alertas |
| ESTOQUE | Read + materiais | ❌ | ✅ | ❌ |
| USUARIO | Read + operacional | ❌ | ❌ | ✅ Só operacionais |
| CLIENTE | Próprios projetos (portal) | ❌ | ❌ | ❌ |

### Permissões Específicas (rbac-projects.ts)

```typescript
// 15 permissões granulares por role:
canViewProject, canCreateProject, canUpdateProject, canDeleteProject,
canChangeStatus, canManageStages, canManageMaterials, canManageTasks,
canManageAttachments, canViewHistory, canViewFinancials, canManageFinancials,
canViewHealthAlerts, canManageHealthAlerts, canViewPortal
```

### Separação GERENTE vs FINANCEIRO no Health

```typescript
// GET /api/projetos/[id]/health
// GERENTE: recebe apenas OPERATIONAL_ALERT_TYPES (sem cashGap, projectedProfit)
// ADMIN/FINANCEIRO: recebe todos os alertas + dados financeiros completos
```

---

## 6. API REST — 34 Endpoints

### Projeto (CRUD base)

| Método | Rota | Permissão | Testes |
|---|---|---|---|
| `GET` | `/api/projetos` | `canViewProject` | ✅ route.test.ts |
| `POST` | `/api/projetos` | `canCreateProject` | ✅ route.test.ts |
| `GET` | `/api/projetos/[id]` | `canViewProject` | ✅ detail.route.test.ts |
| `PUT` | `/api/projetos/[id]` | `canUpdateProject` | ✅ detail.route.test.ts |
| `DELETE` | `/api/projetos/[id]` | `canDeleteProject` | ✅ detail.route.test.ts |
| `PATCH` | `/api/projetos/[id]/status` | `canChangeStatus` | ✅ status.route.test.ts |

### Etapas

| Método | Rota | Permissão | Testes |
|---|---|---|---|
| `GET/POST` | `/api/projetos/[id]/etapas` | `canManageStages` | ✅ etapas.route.test.ts |
| `GET/PUT/DELETE` | `/api/projetos/[id]/etapas/[etapaId]` | `canManageStages` | ✅ etapas.route.test.ts |
| `POST` | `/api/projetos/[id]/etapas/reordenar` | `canManageStages` | ✅ etapas.route.test.ts |
| `GET/POST/PUT/DELETE` | `/api/projetos/[id]/etapas/[etapaId]/checklist` | `canManageStages` | ✅ checklist.route.test.ts |

### Materiais

| Método | Rota | Permissão | Testes |
|---|---|---|---|
| `GET/POST` | `/api/projetos/[id]/materiais` | `canManageMaterials` | ✅ materiais.route.test.ts |
| `PUT/DELETE` | `/api/projetos/[id]/materiais/[materialId]` | `canManageMaterials` | ✅ materiais.route.test.ts |
| `POST` | `/api/projetos/[id]/materiais/[materialId]/liberar` | `canManageMaterials` | ✅ liberar-devolver.route.test.ts |
| `POST` | `/api/projetos/[id]/materiais/[materialId]/devolver` | `canManageMaterials` | ✅ liberar-devolver.route.test.ts |
| `GET/POST` | `/api/projetos/[id]/materiais-estoque` | `canManageMaterials` | ✅ (via materiais test) |
| `POST` | `/api/projetos/[id]/materiais-estoque/verificar-reservas` | `canManageMaterials` | ⚠️ Sem testes |
| `POST` | `/api/projetos/[id]/materials/recompute` | ADMIN | ✅ (test próprio em route) |

### Tarefas

| Método | Rota | Permissão | Testes |
|---|---|---|---|
| `GET/POST` | `/api/projetos/[id]/tarefas` | `canManageTasks` | ✅ tarefas.route.test.ts |
| `PUT/DELETE` | `/api/projetos/[id]/tarefas/[tarefaId]` | `canManageTasks` | ✅ tarefas.route.test.ts |

### Financeiro

| Método | Rota | Permissão | Testes |
|---|---|---|---|
| `GET` | `/api/projetos/[id]/financeiro/resumo` | `canViewFinancials` | ✅ financeiro.route.test.ts |
| `GET` | `/api/projetos/[id]/financeiro/costs` | `canViewFinancials` | ✅ costs.route.test.ts |
| `GET` | `/api/projetos/[id]/financeiro/billing-schedule` | `canViewFinancials` | ✅ p3-billing-schedule.test.ts |
| `POST` | `/api/projetos/[id]/invoices/gerar` | `canManageFinancials` | ✅ `invoices-gerar.route.test.ts` |

### Health Engine

| Método | Rota | Permissão | Testes |
|---|---|---|---|
| `GET` | `/api/projetos/[id]/health` | `canViewHealthAlerts` | ✅ projectHealth.test.ts |
| `GET` | `/api/projetos/[id]/health/alerts` | `canViewHealthAlerts` | ✅ projectHealth.test.ts |
| `PATCH` | `/api/projetos/[id]/health/alerts/[alertId]` | `canManageHealthAlerts` | ✅ `health-alert-update.route.test.ts` |

### Change Orders

| Método | Rota | Permissão | Testes |
|---|---|---|---|
| `GET/POST` | `/api/projetos/[id]/change-orders` | `canUpdateProject` | ✅ change-orders.route.test.ts |
| `PATCH` | `/api/projetos/[id]/change-orders/[coId]/decision` | `canUpdateProject` | ✅ change-orders.route.test.ts |

### Outros

| Método | Rota | Permissão | Testes |
|---|---|---|---|
| `GET` | `/api/projetos/[id]/historico` | `canViewHistory` | ✅ `historico.route.test.ts` |
| `GET` | `/api/projetos/[id]/movimentacoes` | `canViewProject` | ✅ movimentacoes.route.test.ts |
| `GET/PUT/DELETE` | `/api/projetos/[id]/movimentacoes/[movId]` | `canViewProject` | ✅ movimentacoes.route.test.ts |
| `GET/POST` | `/api/projetos/[id]/anexos` | `canManageAttachments` | ✅ anexos.route.test.ts |
| `DELETE` | `/api/projetos/[id]/anexos/[anexoId]` | `canManageAttachments` | ✅ anexos.route.test.ts |
| `GET` | `/api/projetos/[id]/anexos/estatisticas` | `canViewProject` | ✅ (coberto por anexos) |
| `GET` | `/api/projetos/[id]/service-orders` | `canViewProject` | ✅ service-orders.route.test.ts |
| `GET` | `/api/projetos/dashboard` | `canViewProject` | ✅ route.test.ts |
| `GET` | `/api/projetos/relatorios/export` | ADMIN/GERENTE | ✅ (coberto parcialmente) |

---

## 7. Camada de Domínio

### Services

| Service | Responsabilidade |
|---|---|
| `ProjectService` | CRUD principal, transições de status, mascaramento |
| `ProjectStageService` | CRUD de etapas + reordenação + checklist |
| `ProjectMaterialService` | Materiais: planejar, liberar, devolver |
| `ProjectTaskService` | CRUD de tarefas com assignee |
| `ProjectAttachmentService` | Upload/delete de anexos, flag público |
| `ProjectHistoryService` | Log imutável de ações |
| `ProjectNumberService` | Geração sequencial `PRJ-YYYY-####` |
| `ProjectCloseoutService` | Validações de encerramento (bloqueios) |
| `ProjectHealthService` | Health score + 7 tipos de alerta |
| `ProjectHealthAlertService` | Persistência e update de alertas |
| `ProjectMaterialMetricsService` | Métricas e recompute de materiais |
| `ProjectProposalConversionService` | Conversão proposta aprovada → projeto |
| `PortalTokenService` | Geração/validação de token para portal do cliente |
| `InventoryMovementService` | Bridge com módulo de estoque |

### Gateways

| Gateway | Responsabilidade |
|---|---|
| `prisma-finance.gateway.ts` | Consultas financeiras: invoices, expenses, service orders |
| `prisma-inventory.gateway.ts` | Reservas e movimentações de estoque |
| `prisma-triage.gateway.ts` | Integração com sistema de triagem |

### Validadores

```
src/domains/projects/validators.ts — schemas Zod para todos os DTOs
```

---

## 8. Sistema de Eventos

### EventBus de Produção (`src/server/events/`)

| Evento | Emitido por | Handler | Efeito |
|---|---|---|---|
| `project.created` | `ProjectService.criar()` | `register-handlers.ts` | Playbook: cria triagem, configura notificações |
| `project.statusChanged` | `ProjectService.alterarStatus()` | `register-handlers.ts` | ✅ Escreve AuditLog `STATUS_ALTERADO` |
| `project.completed` | `ProjectService.alterarStatus(CONCLUIDO)` | `register-handlers.ts` | ✅ Escreve AuditLog `PROJETO_CONCLUIDO` |

> **Nota:** O EventBus persiste todos os eventos na tabela `DomainEvent` (campos: `id, name, aggregateType, aggregateId, payload, status, occurredAt`). Os handlers acima adicionam processamento real sobre isso.

### Sistema de Eventos de Domínio (Fase 8 — DEPRECATED)

```
src/domains/projects/events/
  emitter.ts   — ProjectEventEmitter com 58 tipos de eventos (não conectado ao EventBus real)
  handlers.ts  — Handlers no-op/stubs (DEPRECATED — ver comentário no arquivo)
  types.ts     — Tipos dos eventos de domínio
```

> ⚠️ Este sistema foi construído na Fase 8 com interface diferente do EventBus de produção.
> Está marcado como DEPRECATED. Não usar em código novo sem conectar ao EventBus real.

---

## 9. Health Engine

**Arquivo:** `src/domains/projects/services/project-health.service.ts`

### 7 Tipos de Alerta

```typescript
// Alertas Financeiros (visíveis apenas para ADMIN/FINANCEIRO):
CASH_GAP           — saldo de invoices não cobre custo estimado
BUDGET_OVERRUN     — custo real excedeu orçamento
LOW_BILLING_COVERAGE — cobertura de faturamento abaixo de 80%

// Alertas Operacionais (visíveis para todos os roles com acesso):
OVERDUE_STAGES     — etapas com data de conclusão vencida
UNRESOLVED_TASKS   — tarefas críticas sem assignee
PENDING_MATERIALS  — materiais planejados sem liberação
DATA_TRUNCATED     — > 1000 materiais no projeto (paginação atingida)
```

### Constantes Exportadas

```typescript
export const PROJECT_HEALTH_ROW_LIMIT = 1000;
export const OPERATIONAL_ALERT_TYPES: Set<ProjectHealthAlertType>;
export const FINANCIAL_ALERT_TYPES: Set<ProjectHealthAlertType>;
```

### Health Score (campo em ProjetoCard)

```
score = progressScore(40) + scheduleScore(40) + budgetScore(20)
≥ 80 → Saudável (green)
60–79 → Em Risco (yellow)
< 60 → Crítico (red)
```

---

## 10. Change Orders

**Rotas:** `src/app/api/projetos/[id]/change-orders/`

### Fluxo de Status

```
DRAFT → SENT → APPROVED → APPLIED
              → REJECTED
DRAFT/SENT → VOIDED (admin)
```

### Validações de Negócio

- CO não pode ser criada em projetos `CONCLUIDO` ou `ARQUIVADO` → 422
- `action: approve` só aceita status `DRAFT` ou `SENT` → 422
- `reason` é obrigatório ao rejeitar
- `priceDelta/costDelta` afetam campos financeiros do projeto

---

## 11. Integração Financeira

### Resumo Financeiro (`GET /financeiro/resumo`)

Margem calculada com dados reais (não estimativa):

```typescript
custoRealTotal = valorMateriais + valorMaoDeObra + valorDespesas
// onde:
valorMateriais  = soma de ProjetoMaterial.valorTotal (liberados)
valorMaoDeObra  = soma de OrdemServico.valorTotal (do projeto)
valorDespesas   = soma de Expense.valor (do projeto)
```

### Billing Schedule (`GET /financeiro/billing-schedule`)

Agrupa invoices por tipo em ordem canônica:
```
DEPOSIT → PROGRESS → MILESTONE → MATERIALS → SERVICE_ORDER → FINAL
```

Cada grupo retorna: `planned` (DRAFT/SENT/OVERDUE) vs `executed` (PAID/PARTIALLY_PAID) com `coveragePct`.

### Invoice Generation (`POST /invoices/gerar`)

- Requer permissão `canManageFinancials`
- Validações anti-double billing no `ProjectCloseoutService`

---

## 12. Integração Estoque

| Recurso | Descrição |
|---|---|
| `ProjetoMaterialEstoque` | Reservas de itens do catálogo de estoque para o projeto |
| `ProjetoEquipamento` | Equipamentos alocados |
| `MaterialMovimentacao` | Movimentações físicas geradas ao liberar/devolver |
| `verificar-reservas` | Verifica disponibilidade de todos os materiais planejados |
| `materials/recompute` | Recalcula métricas de materiais (operação administrativa) |

---

## 13. Portal do Cliente

- Token único por projeto, gerado via `PortalTokenService`
- Armazenado como hash em `Projeto.portalTokenHash`
- Permite acesso read-only do cliente: status, cronograma, anexos públicos, invoices dele
- Token revogável; expiração configurável

---

## 14. Testes

### Cobertura atual

| Arquivo de Teste | Rotas Cobertas |
|---|---|
| `route.test.ts` | GET/POST `/projetos`, `/projetos/dashboard` |
| `detail.route.test.ts` | GET/PUT/DELETE `/projetos/[id]` |
| `status.route.test.ts` | PATCH `/projetos/[id]/status` + P1 bloqueio por invoices abertas |
| `etapas.route.test.ts` | CRUD etapas + reordenar |
| `checklist.route.test.ts` | CRUD checklist de etapa |
| `materiais.route.test.ts` | CRUD materiais |
| `liberar-devolver.route.test.ts` | Liberar e devolver material |
| `movimentacoes.route.test.ts` | GET movimentações |
| `tarefas.route.test.ts` | CRUD tarefas |
| `anexos.route.test.ts` | CRUD anexos |
| `service-orders.route.test.ts` | GET service orders do projeto |
| `financeiro.route.test.ts` | GET resumo financeiro |
| `costs.route.test.ts` | GET costs breakdown |
| `p3-billing-schedule-and-row-limit.test.ts` | billing-schedule + DATA_TRUNCATED |
| `projectHealth.test.ts` | GET health + alerts |
| `change-orders.route.test.ts` | GET/POST change orders + PATCH decision |
| `register-handlers.test.ts` | EventBus handlers → AuditLog |

### Rotas sem testes dedicados (dívida técnica)

| Rota | Prioridade |
|---|---|
| ~~`PATCH /health/alerts/[alertId]` (acknowledge/resolve alerta)~~ | ✅ Corrigido — v1.8.2 |
| ~~`GET /historico` (histórico de ações do projeto)~~ | ✅ Corrigido — v1.8.2 |
| ~~`POST /invoices/gerar` (geração de invoice)~~ | ✅ Corrigido — v1.8.2 |
| `POST /materiais-estoque/verificar-reservas` | P3 |

---

## 15. Débitos Técnicos

| ID | Arquivo | Problema | Prioridade |
|---|---|---|---|
| DEBT-001 | `src/lib/projetos/formatting.ts` | `formatCurrency()` usa `pt-BR/BRL` — deve ser `en-US/USD` per AGENTS.md | P2 |
| DEBT-002 | `src/lib/projetos/formatting.ts` | `formatStatus()` mapeia 5 status antigos; schema tem 8 (`em_inspecao`, `aguardando_devolucoes`, `arquivado` sem label) | P2 |
| DEBT-003 | `src/domains/projects/events/` | Sistema de eventos de domínio (Fase 8) nunca foi conectado ao EventBus real | P3 (tem solução parcial via register-handlers.ts) |
| DEBT-004 | Testes E2E | Nenhum spec Playwright para o módulo | P3 |
| DEBT-005 | 1 rota | Sem testes unitários para `materiais-estoque/verificar-reservas` | P3 |

---

## Histórico de Mudanças

| Data | Versão | O que mudou |
|---|---|---|
| 2025-09 | 1.0.0 | Fases 1–4: base do módulo (DB, domain, API, RBAC) |
| 2025-10 | 1.1.0 | Fase 5: integração estoque |
| 2025-10 | 1.2.0 | Fase 6: sistema de triagem |
| 2025-10 | 1.3.0 | Fase 7: integração financeira |
| 2025-11 | 1.4.0 | Fase 8: sistema de eventos (stubs) |
| 2026-01 | 1.5.0 | Health Score engine; auditoria 15 pontos; bugfixes |
| 2026-05 | 1.6.0 | Correções de timezone, EmptyState, Suspense; `restricoesOperacionais` |
| 2026-05 | 1.7.0 | P1: bloqueio de conclusão com invoices abertas |
| 2026-05 | 1.8.0 | P2: margem real (labor+expenses); alertas operacionais GERENTE; P3: Change Orders, DATA_TRUNCATED, billing-schedule |
| 2026-05-14 | 1.8.1 | **Bugfix crítico:** EventBus handlers registrados para project.statusChanged e project.completed → AuditLog agora é gravado |
