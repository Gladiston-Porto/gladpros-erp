# Módulo Financeiro — GladPros ERP

> **Status:** ❌ NOT READY — re-audit em correção
> **Última re-auditoria:** 2026-05-18
> **Co-produtores:** Gladiston Porto · GitHub Copilot

---

## 1. Visão Geral

O módulo Financeiro é o centro de inteligência financeira do GladPros ERP. Ele controla:

- **Receitas** — recebimentos, recorrências, categorias
- **Despesas** — aprovação em 2 fases, recorrências, categorias
- **Contas Bancárias** — saldo consolidado, transações, extrato, reconciliação
- **Transferências** — entre contas internas, com reversão
- **Fluxo de Caixa** — evolução diária, KPIs, projeções 30/60/90 dias
- **Impostos** — regime LLC/S-Corp, estimativas trimestrais, Schedule C
- **Compensação do Dono** — Owner Draw (LLC) e Salary/Distribution (S-Corp)

### Premissas
- **Tenant único**: `empresaId = 1` sempre
- **Moeda**: USD (`en-US` locale)
- **Timezone**: `America/Chicago`
- **Idioma da interface**: pt-BR

---

## 2. Arquitetura

```
src/app/api/financeiro/           ← 35 rotas REST
src/app/(dashboard)/financeiro/   ← páginas Next.js
  page.tsx                        ← dashboard principal (KPIs + contas + alertas)
  relatorios/page.tsx             ← relatórios financeiros
src/components/financeiro/        ← componentes React (gráficos, forms)
src/schemas/                      ← revenue.schema.ts, expense.schema.ts (Zod)
src/__tests__/api/financeiro/     ← 7 suites, 40 testes
docs/modules/financeiro/          ← este arquivo (fonte da verdade)
docs/modules/financeiro/archive/  ← specs históricas (não refletem código atual)
```

---

## 3. Modelos Prisma

| Modelo | Descrição |
|--------|-----------|
| `Revenue` | Receitas — valor, status, vencimento, pagamento, recorrência |
| `RevenueCategory` | Categorias de receita por empresa |
| `RevenueRecurrence` | Regras de recorrência (frequência, próxima geração) |
| `Expense` | Despesas — valor, status, aprovação, recorrência |
| `ExpenseCategory` | Categorias de despesa com `scheduleCLine` (Schedule C) |
| `ExpenseApproval` | Aprovação em 2 fases (PENDENTE → APROVADA/REJEITADA) |
| `ExpenseRecurrence` | Regras de recorrência de despesas |
| `BankAccount` | Contas bancárias com saldo, tipo, limite de crédito |
| `BankTransaction` | Transações individuais com tipo (CREDITO/DEBITO) |
| `BankTransfer` | Transferências entre contas (atômicas) |
| `OwnerCompensation` | Compensação do dono — OWNER_DRAW, SALARY, DISTRIBUTION |
| `EstimatedTaxPayment` | Pagamentos trimestrais de imposto estimado |
| `TaxRate` | Alíquotas (TX Sales Tax 8.25%, etc.) |
| `BudgetAlert` | Alertas automáticos de orçamento |
| `VendorTaxProfile` | Perfil fiscal de fornecedores (Form 1099) |

### Campos obrigatórios em todos os modelos
```prisma
id           Int       @id @default(autoincrement())
empresaId    Int
criadoEm     DateTime  @default(now())
atualizadoEm DateTime  @updatedAt
@@index([empresaId])
```

---

## 4. Rotas de API

### Receitas
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/receitas` | FINANCEIRO+ read | Listar com filtros e paginação |
| `POST` | `/api/financeiro/receitas` | FINANCEIRO+ create | Criar receita (com ou sem recorrência) |
| `GET` | `/api/financeiro/receitas/[id]` | FINANCEIRO+ read | Detalhe da receita |
| `PUT` | `/api/financeiro/receitas/[id]` | FINANCEIRO+ update | Atualizar receita |
| `DELETE` | `/api/financeiro/receitas/[id]` | FINANCEIRO+ delete | Cancelar/excluir receita |
| `GET/POST` | `/api/financeiro/receitas/categorias` | FINANCEIRO+ | Categorias de receita |
| `POST` | `/api/financeiro/receitas/[id]/recorrencia` | FINANCEIRO+ | Gerenciar recorrência |

### Despesas
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/despesas` | FINANCEIRO+ read | Listar com filtros avançados |
| `POST` | `/api/financeiro/despesas` | FINANCEIRO+ create | Criar despesa |
| `GET/PUT/DELETE` | `/api/financeiro/despesas/[id]` | FINANCEIRO+ | Detalhe/editar/excluir |
| `POST` | `/api/financeiro/despesas/[id]/aprovar` | FINANCEIRO+ | Aprovar despesa pendente |
| `POST` | `/api/financeiro/despesas/[id]/pagar` | FINANCEIRO+ | Marcar como paga |
| `POST` | `/api/financeiro/despesas/[id]/rejeitar` | FINANCEIRO+ | Rejeitar despesa |
| `GET/POST` | `/api/financeiro/despesas/categorias` | FINANCEIRO+ | Categorias de despesa |
| `GET/POST` | `/api/financeiro/expense-categories` | FINANCEIRO+ | Alias categorias de despesa |

### Contas Bancárias
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/contas` | FINANCEIRO+ read | Listar contas ativas |
| `POST` | `/api/financeiro/contas` | FINANCEIRO+ create | Criar conta bancária |
| `GET/PUT/DELETE` | `/api/financeiro/contas/[id]` | FINANCEIRO+ | Detalhe/editar/excluir |
| `POST` | `/api/financeiro/contas/[id]/transacao` | FINANCEIRO+ create | Criar transação (atômica com saldo) |
| `GET` | `/api/financeiro/contas/[id]/extrato` | FINANCEIRO+ read | Extrato da conta |
| `POST` | `/api/financeiro/contas/[id]/reconciliar` | FINANCEIRO+ update | Reconciliar conta |

### Transferências
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/transferencias` | FINANCEIRO+ read | Listar transferências |
| `POST` | `/api/financeiro/transferencias` | FINANCEIRO+ create | Criar transferência (atômica) |

### Fluxo de Caixa & Dashboard
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET` | `/api/financeiro/fluxo-caixa` | FINANCEIRO+ read | KPIs, evolução diária, projeções, alertas |
| `GET` | `/api/financeiro/dashboard` | FINANCEIRO+ read | Métricas resumidas do período |
| `GET` | `/api/financeiro/reports` | FINANCEIRO+ read | Relatórios financeiros |

### Fiscal / Tributário
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| `GET/PUT` | `/api/financeiro/tax/regime` | ADMIN | Regime fiscal (LLC_DEFAULT / S_CORP) |
| `GET/POST` | `/api/financeiro/tax/dashboard` | FINANCEIRO+ | Dashboard fiscal |
| `GET` | `/api/financeiro/tax/schedule-c` | FINANCEIRO+ read | Linhas Schedule C |
| `GET/POST` | `/api/financeiro/estimated-tax` | FINANCEIRO+ | Estimativas trimestrais |
| `GET/POST` | `/api/financeiro/owner-compensation` | ADMIN/FINANCEIRO | Compensação do dono |

---

## 5. RBAC

```
financeiro:
  ADMIN      → ALL (CRUD)
  GERENTE    → read only
  FINANCEIRO → ALL (CRUD)
  ESTOQUE    → sem acesso
  USUARIO    → sem acesso
  CLIENTE    → sem acesso
```

### Verificação nas rotas
```typescript
const user = await requireUser(request)
if (!can(user.role as Role, "financeiro", "create")) {
  return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 })
}
const empresaId = user.empresaId  // sempre do JWT, nunca de query params ou body
```

---

## 6. Segurança — Estado após re-auditoria (mai/2026)

> A re-auditoria de 2026-05-18 encontrou P1/P2 abertos. Este módulo não deve ser declarado Production Ready até que os achados sejam corrigidos, cobertos por regressão e revalidados pelo gate `docs/architecture/06-production-readiness.md`.

| Vulnerabilidade | Status | Solução |
|-----------------|--------|---------|
| `empresaId` vinha de query params | ✅ Corrigido | Sempre extraído de `user.empresaId` (JWT) |
| `empresaId` vinha do body em POST | ✅ Corrigido | Override com `user.empresaId` após parse do Zod |
| `fluxo-caixa` sem `take` (OOM risk) | ✅ Corrigido | `take: 1000` + flag `truncated` na resposta |
| `(user as any).empresaId` TypeScript blind | ✅ Corrigido | `requireUser` retorna `empresaId: 1` no tipo |
| Rotas por ID sem escopo `empresaId` | 🔧 Em correção | Escopo aplicado no primeiro pacote para receitas, despesas e contas |
| Approval spoof por `aprovadorId` no body | 🔧 Em correção | Aprovação/rejeição passam a comparar com `user.id` autenticado |
| Invoice→Revenue não bloqueante/reversível | 🔧 Em correção | Primeiro pacote torna criação de receita crítica e reversão remove receita derivada |
| Exports e relatórios sem cap/rate limit | ❌ Aberto | Pendente de correção P2 |
| Owner compensation / fiscal exposto além de ADMIN/FINANCEIRO | ❌ Aberto | Pendente de correção P2 |

---

## 7. Lógica de Negócio

### 7.1 Regime Fiscal
```
LLC_DEFAULT:
  - OwnerCompensation.tipo = OWNER_DRAW (único permitido)
  - Schedule C, self-employment tax 15.3%
  - Owner draw NÃO é dedutível como salário

S_CORP:
  - SALARY obrigatório antes de qualquer DISTRIBUTION
  - Se salary YTD = 0 e distribution > 0 → BLOQUEAR (IRS violation)
  - Se salary YTD < 30% net income → WARNING
  - Form 1120-S + K-1, FICA somente sobre salary
```

### 7.2 Aprovação de Despesas
```
Criação → PENDENTE
PENDENTE → APROVADA (aprovador com permissão) → PAGA
PENDENTE → REJEITADA (com motivo obrigatório)
```

### 7.3 Transações Bancárias
- Criação de transação usa `prisma.$transaction` para atomicidade
- Saldo da conta é atualizado na mesma transação
- Validação de saldo disponível antes de débito (inclui limite de crédito)
- Se vinculada a `Revenue` → atualiza `status = "RECEBIDA"`
- Se vinculada a `Expense` → atualiza `status = "PAGA"`

### 7.4 Transferências Bancárias
- CREDITO na conta destino + DEBITO na conta origem em `prisma.$transaction`
- Vincula `BankTransaction` em ambas as contas

### 7.5 Fluxo de Caixa
- Período máximo: 365 dias
- Limite de registros: 1.000 por tipo (revenue + expense)
- Se limite atingido: `metadados.truncated = true` na resposta
- Projeções: 30, 60 e 90 dias baseadas na média dos últimos N dias

---

## 8. AuditLog

Operações críticas geram `AuditLog`:

| Operação | Ação |
|----------|------|
| Criar receita | `RECEITA_CRIADA` |
| Aprovar despesa | `DESPESA_APROVADA` |
| Pagar despesa | `DESPESA_PAGA` |
| Rejeitar despesa | `DESPESA_REJEITADA` |
| Criar transação bancária | `TRANSACAO_CRIADA` |
| Criar transferência | `TRANSFERENCIA_REALIZADA` |
| Criar despesa | `DESPESA_CRIADA` |
| Trocar regime fiscal | `REGIME_ALTERADO` |

---

## 9. Formato de Resposta

```typescript
// Sucesso
{ success: true, data: T }
{ success: true, data: T, message: string }
{ success: true, data: T[], pagination: { page, pageSize, total, totalPages } }

// Erro
{ success: false, error: string, message: string }
```

---

## 10. Testes

| Arquivo | Cobertura |
|---------|-----------|
| `contas.test.ts` | GET/POST contas, auth, RBAC |
| `receitas.test.ts` | GET/POST receitas, filtros, validação |
| `despesas.test.ts` | GET/POST despesas, filtros |
| `despesas-aprovar.test.ts` | POST aprovar, fluxo de status |
| `despesas-pagar.test.ts` | POST pagar, atualização de status |
| `owner-compensation.test.ts` | GET/POST compensação, validação S-Corp (rota) |
| `owner-compensation-scorp.test.ts` | 13 testes unitários S-Corp IRS rules (service) |
| `tax-regime.test.ts` | GET/PUT regime fiscal, auditlog |
| `invoices/payments.route.test.ts` | 16 testes incl. Invoice→Revenue integration |
| `estimated-tax.test.ts` | GET/POST estimated-tax (em geração) |
| `transferencias.test.ts` | GET/POST transferências (em geração) |
| `fluxo-caixa.test.ts` | GET fluxo-caixa (em geração) |

**Total**: 9+ suites · 60+ testes (estimado após geração)

### Rotas sem cobertura (P3 — backlog)
`dashboard`, `contas/[id]/extrato`, `receitas/[id]`, `despesas/[id]/rejeitar`, `tax/dashboard`

---

## 11. Integração com Outros Módulos

| Módulo | Tipo de Integração | Detalhes |
|--------|--------------------|---------|
| **Invoices** | Revenue auto-criada ao marcar invoice como PAID | `invoices/[id]/payments` → upsert categoria → create Revenue |
| **Projetos** | `custoReal` calculado de despesas com `projetoId` | `project-finance.service` → `aggregateProjectCosts` |
| **OS (ServiceOrders)** | Despesas de reembolso criadas via RECEIPT attachment | `request-reimbursement` propaga `projetoId` do OS para Expense |
| **Workers** | OwnerCompensation vinculado a `OWNER_OPERATOR` | IRS rules validados na service layer |
| **Dashboard** | A/R (Invoices), A/P (Expenses), Pipeline (Projetos) visíveis no painel | `page.tsx` 11 queries paralelas; cashflow alert quando A/P > caixa+A/R |

### Fluxo de Integração Completo

```
Invoice PAID → InvoicePayment → Revenue (auto, não bloqueia)
     ↑
  Projeto ─► BillingType ─► Invoice parcial ou final

OS + RECEIPT ─► request-reimbursement ─► Expense(serviceOrderId, projetoId)
     ↑                                       │
  Worker/Técnico                       projetoId ─► aggregateProjectCosts

Worker (OWNER_OPERATOR) ─► OwnerCompensation ─► EstimatedTax
     └── LLC: OWNER_DRAW only
     └── S-Corp: SALARY then DISTRIBUTION (IRS blocking)

Dashboard Financeiro:
  BankAccount.saldoAtual  ┐
  Invoice.saldo (A/R)     ├─► cashPosition → alerta se < totalAP
  Expense.valor (A/P)     ┘
  Projeto.valorContrato (pipeline)
```

### Dashboard Cross-Module

O dashboard (`GET /financeiro` e `GET /api/financeiro/dashboard`) agora exibe:

- **Caixa real**: saldo total das contas bancárias ativas
- **A/R — Contas a Receber**: invoices SENT + VIEWED + PARTIAL_PAID + OVERDUE (campo `saldo`)
- **A/P — Contas a Pagar**: despesas PENDENTE + AGUARDANDO_APROVACAO + APROVADA (campo `valor`)
- **Alerta cashflow negativo**: mostrado quando `saldoTotal + totalAR < totalAP`
- **Pipeline de Projetos**: valor de contrato somado de projetos em_andamento/planejado/em_inspecao
- **Resultado do Mês**: receitas recebidas − despesas pagas no mês corrente

### Detalhes Técnicos por Fluxo

**Invoice → Revenue:**
- Arquivo: `src/app/api/invoices/[id]/payments/route.ts` (linhas 176–218)
- Falha na criação de Revenue NÃO bloqueia pagamento — é logada via `logger.error`
- `RevenueCategory` é criada automaticamente por upsert se não existir

**OS → Expense → Projeto:**
- Arquivo: `src/app/api/service-orders/[id]/request-reimbursement/route.ts`
- `projetoId` é propagado do OS para a Expense (corrigido v1.1.0)
- `empresaId` vem do JWT, nunca hardcoded (corrigido v1.1.0)
- Filtros `projetoId` e `serviceOrderId` disponíveis em `GET /api/financeiro/despesas`

**Projeto custoReal:**
- `Projeto.custoReal` é um cache snapshot — atualizado via `POST /api/projetos/[id]/financeiro/costs`
- O motor de saúde do projeto (`/health`) computa real-time de `Expense.projetoId`
- Portanto: saldo real sempre disponível via health endpoint, mesmo antes do sync

---

## 12. Backlog — P2/P3

| Prioridade | Item |
|-----------|------|
| P2 | Testes para `fluxo-caixa`, `transferencias`, `contas/[id]/transacao` |
| P3 | Worker hours → financial cost (TimesheetEntry has no rate/cost field — systemic gap) |
| P3 | Dashboard interativo (gráficos, drill-down, período selecionável) |
| P3 | Projeções avançadas baseadas em dados históricos reais |
| P3 | Reconciliação automática bancária (importação OFX/CSV — conciliacao page é placeholder) |
| P3 | Exportação CSV/PDF de extratos e relatórios |
| P3 | Paginação server-side nas páginas de lista (receitas, despesas, transferencias — atualmente take: 50) |
| P3 | Formulários de criação/edição inline nas páginas (nova receita, nova despesa, etc.) |

---

## 13. Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| v1.3.0 | mai/2025 | 13 páginas UI criadas: receitas, despesas, contas, transferencias, fluxo-caixa, relatorios (fix redirect), fiscal hub, impostos-estimados, compensacao, categorias, relatorios fiscais, payables, conciliacao. AuditLog em receitas PUT/DELETE. |
| v1.2.0 | mai/2025 | Dashboard cross-module: A/R invoices, A/P expenses, cashflow alert, pipeline projetos; API route sincronizada; 15 testes de cashflow |
| v1.1.0 | mai/2025 | Cross-module fixes: Invoice→Revenue upsert+log, OS→Expense projetoId, despesas filtros projetoId/serviceOrderId, S-Corp 13 unit tests |
| v1.0.0 | mai/2025 | Certificação inicial — P1 security fixes, AuditLog, dashboard page, docs unificadas |

---

> **Nota sobre docs históricas:** Os arquivos em `docs/modules/financeiro/archive/` e `docs/archive/audits/2025-financeiro-*.md` são specs de planejamento de out/2025. Descrevem uma arquitetura com double-entry bookkeeping e chart of accounts que **não foi implementada**. O sistema atual usa Revenue/Expense/BankAccount. Consulte o código-fonte e este README como fonte da verdade.
