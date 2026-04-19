# Módulo Invoices — Documentação Completa

**Versão**: 1.0 — auditado em produção  
**Última atualização**: 2025  
**Status**: ✅ Produção-ready (pós-auditoria P1/P2)

---

## 1. Visão Geral do Módulo

O módulo **Invoices** gerencia o ciclo completo de faturamento da GladPros: criação, envio, pagamento, cobrança de inadimplentes e geração de PDF.

**Funcionalidades principais:**
- Criação de invoices com itens de serviço/material/equipamento
- Cálculo automático de subtotal, desconto e taxa (Texas 8.25% padrão)
- Envio por email com PDF em anexo
- Registro de pagamentos parciais e totais
- Estorno de pagamentos
- Dashboard de estatísticas (faturado, recebido, pendente, vencidas)
- Playbook automatizado para marcar invoices como "overdue"
- Portal do cliente para visualização e download de PDF
- Relatórios de invoices

---

## 2. Máquina de Estados

```
DRAFT ──────────────→ SENT ──────────────→ VIEWED
  │                     │                     │
  │                     └──────────────────────┼──────→ PARTIAL_PAID
  │                                            │              │
  └──────────────────────────────────────────── ──────→ PAID ←┘
  
  Qualquer estado (exceto PAID) → OVERDUE (automático via playbook)
  Qualquer estado (exceto PAID) → CANCELLED (exclusão lógica)
```

### Transições

| De | Para | Trigger |
|----|------|---------|
| DRAFT | SENT | POST `/api/invoices/[id]/send` |
| DRAFT | CANCELLED | DELETE `/api/invoices/[id]` |
| SENT/VIEWED | PARTIAL_PAID | POST payment (valor < saldo) |
| SENT/VIEWED/PARTIAL_PAID | PAID | POST payment (valor = saldo) |
| SENT/VIEWED/PARTIAL_PAID/DRAFT | OVERDUE | POST `/api/invoices/overdue` |
| PARTIAL_PAID | SENT/DRAFT | DELETE payment (estorno) |

### Regras de bloqueio
- `PAID` → não pode ser editada, excluída ou receber pagamento
- `CANCELLED` → não pode receber pagamento ou ser enviada
- `PAID` com `valorPago > 0` → não pode ser excluída

---

## 3. Rotas de API

### Rotas Principais

| Método | Rota | RBAC | Descrição |
|--------|------|------|-----------|
| GET | `/api/invoices` | read | Lista paginada com filtros |
| POST | `/api/invoices` | create | Cria nova invoice |
| GET | `/api/invoices/[id]` | read | Detalhes completos |
| PUT | `/api/invoices/[id]` | update | Atualiza dados/itens |
| DELETE | `/api/invoices/[id]` | delete | Soft-delete (→ CANCELLED) |
| GET | `/api/invoices/[id]/payments` | read | Lista pagamentos |
| POST | `/api/invoices/[id]/payments` | update | Registra pagamento |
| DELETE | `/api/invoices/[id]/payments/[paymentId]` | update | Estorna pagamento |
| POST | `/api/invoices/[id]/send` | update | Envia por email com PDF |
| GET | `/api/invoices/[id]/pdf` | read | Gera e baixa PDF |
| GET | `/api/invoices/stats` | read | KPIs de faturamento |
| POST | `/api/invoices/overdue` | update | Playbook de inadimplência |

### Matriz RBAC

| Role | read | create | update | delete |
|------|------|--------|--------|--------|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| GERENTE | ✅ | ✅ | ✅ | ✅ |
| FINANCEIRO | ✅ | ✅ | ✅ | ✅ |
| USUARIO | ✅ | ❌ | ❌ | ❌ |
| ESTOQUE | ❌ | ❌ | ❌ | ❌ |
| CLIENTE | ✅ via portal | ❌ | ❌ | ❌ |

### Formato de Resposta

```typescript
// Sucesso
{ data: T, success: true }

// Sucesso com paginação
{ data: T[], pagination: { page, pageSize, total, totalPages }, success: true }

// Erro
{ error: string, message: string, success: false }
```

---

## 4. Componentes Principais

### Pages (dashboard)
- `page.tsx` — Lista de invoices com stats cards e tabela paginada
- `[id]/page.tsx` — Detalhes da invoice com pagamentos
- `[id]/edit/page.tsx` — Edição de invoice
- `new/page.tsx` — Criação de nova invoice com stepper
- `relatorios/page.tsx` — Relatórios de faturamento
- `layout.tsx` — Layout do módulo
- `loading.tsx` — Estado de carregamento

### Components
| Componente | Responsabilidade |
|------------|-----------------|
| `InvoicesFiltersCard` | Filtros de busca (status, cliente, datas, search) |
| `InvoicesTableCard` | Tabela de invoices com ações |
| `InvoiceDetailSections` | Seções de detalhes: itens, pagamentos, projeto |
| `InvoiceFormSections` | Formulário de criação/edição: cliente, itens, descontos |
| `InvoiceStepper` | Wizard de criação em etapas |
| `InvoicePaymentDialog` | Modal de registro de pagamento |
| `invoice-utils.tsx` | Formatação de moeda, normalização de dados |
| `types.ts` | Tipos TypeScript do módulo |

---

## 5. Fluxos de Negócio

### 5.1 Criação de Invoice
1. Usuário preenche cliente, itens e datas
2. Sistema calcula: subtotal → desconto → base tributável → tax (8.25% TX) → total
3. Gera número único: `INV-{YYYYMMDD}-{0001}` em transação serializada
4. Cria `AuditLog` com ação `CREATE`
5. Status inicial: `DRAFT`

### 5.2 Envio por Email
1. Valida RBAC: `can(role, 'invoices', 'update')`
2. Verifica `empresaId` (IDOR protection)
3. Gera PDF via `generateInvoicePDF`
4. Escapa HTML para prevenir XSS (`escapeHtml()`)
5. Envia via SMTP (nodemailer)
6. Atualiza status: `DRAFT → SENT`
7. Cria `InvoiceReminder` com tipo `INITIAL_SEND`

### 5.3 Registro de Pagamento
1. Valida se invoice existe e pertence à empresa (empresaId check)
2. Valida: não pode exceder saldo atual
3. Calcula novo `valorPago`, `saldo` e `status`
4. `saldo ≤ 0.01` → `PAID`; caso contrário → `PARTIAL_PAID`
5. Registra `AuditLog` com ação `CREATE` em InvoicePayment

### 5.4 Estorno de Pagamento
1. Valida que o pagamento pertence à invoice correta
2. Recalcula `valorPago` e `saldo`
3. Reverte status: se `valorPago ≤ 0.005` → `DRAFT` (ou mantém `OVERDUE`)
4. Registra `AuditLog`

### 5.5 Playbook Overdue
1. Busca invoices não-pagas/canceladas com `dataVencimento < now()` da mesma empresa
2. Limita a 200 por execução (take: 200)
3. Executa steps do playbook em sequência por invoice
4. Retorna resumo: total, processadas, falhas

---

## 6. Schemas de Validação Zod

### Criar Invoice
```typescript
z.object({
  clienteId: z.number().int().positive(),
  projetoId: z.number().int().positive().optional(),
  dataVencimento: z.string().datetime(),
  notas: z.string().optional(),
  termos: z.string().optional(),
  itens: z.array(z.object({
    tipo: z.enum(['SERVICE', 'MATERIAL', 'EQUIPMENT', 'OTHER']),
    descricao: z.string().min(1).max(500),
    quantidade: z.number().positive(),
    unidade: z.string().min(1).max(50),
    precoUnitario: z.number().nonnegative(),
    desconto: z.number().min(0).default(0),
    taxavel: z.boolean().default(true),
    ordem: z.number().int().min(0).default(0),
  })).min(1),
  taxRateId: z.number().int().positive().optional(),
  descontoValor: z.number().min(0).default(0),
  descontoPercentual: z.number().min(0).max(100).default(0),
})
```

### Filtros de Listagem
```typescript
z.object({
  clienteId: z.string().optional(),
  projetoId: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  search: z.string().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
```

### Registrar Pagamento
```typescript
z.object({
  valor: z.number().positive(),
  dataPagamento: z.string().datetime(),
  metodoPagamento: z.enum(['BANK_TRANSFER', 'CHECK', 'CARD', 'CASH', 'STRIPE', 'SQUARE', 'OTHER']),
  bankAccountId: z.number().int().positive().optional(),
  referencia: z.string().max(100).optional(),
  notas: z.string().optional(),
})
```

---

## 7. Integrações

### 7.1 Email (SMTP via nodemailer)
- Variáveis: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Template HTML com dados escapados (proteção XSS via `escapeHtml()`)
- PDF gerado por `generateInvoicePDF` e anexado

### 7.2 PDF (Playwright headless)
- `generateInvoicePDFFromHTML` renderiza `/invoices/[id]/print` via browser headless
- Cookies de autenticação são propagados para acessar a print page protegida
- Output: `Content-Type: application/pdf` com nome `INV-{...}.pdf`

### 7.3 Projeto
- Invoice pode ser vinculada a um projeto via `projetoId`
- Rota `/api/projetos/[id]/invoices/gerar` permite criar invoice a partir de projeto

### 7.4 Auditoria
- Toda criação, edição e exclusão gera `AuditLog` com diff serializado
- Campos: `userId`, `entidade`, `entidadeId`, `acao`, `diff`

---

## 8. Portal do Cliente

**Rota**: `/portal/[token]/invoices`

- Acesso por token público (sem login)
- Listagem das invoices do cliente vinculado ao token
- Visualização de detalhes: `/portal/[token]/invoices/[id]`
- Download de PDF: `/portal/[token]/invoices/[id]/pdf`

**Segurança**: O token identifica o cliente sem expor credenciais do sistema.

---

## 9. Segurança

### 9.1 Autenticação
- Todas as rotas usam `requireUser(request)` como primeira operação
- Exceções: rotas `/api/portal/*` (token-based) e `/api/webhooks/*`

### 9.2 RBAC
- Verificação com `can(user.role as Role, 'invoices', action)` após autenticação
- ESTOQUE não tem acesso ao módulo (NONE)
- USUARIO tem apenas leitura (RO)

### 9.3 IDOR Protection (pós-auditoria P1)
- Todas as queries incluem `empresaId: user.empresaId ?? 1`
- Qualquer tentativa de acessar invoice de outra empresa retorna 404 (not found, não forbidden — para não vazar existência)

### 9.4 XSS Prevention (pós-auditoria P1)
- Função `escapeHtml()` aplicada em todos os dados do usuário interpolados no template HTML do email
- Campos protegidos: `clienteNome`, `invoice.projeto.titulo`

---

## 10. Performance

### Queries otimizadas
- Listagem: paginada com `take`/`skip` (máx 100/página)
- Payments GET: limitado a `take: 100` por invoice
- Overdue: limitado a `take: 200` por execução
- Stats: 3 queries paralelas com `Promise.all`
- Criação: número único gerado em `$transaction` serializada

### Índices recomendados
- `Invoice.empresaId` — filtro base em todas as queries
- `Invoice.status` — filtro principal de listagem
- `Invoice.dataVencimento` — filtro de vencimento e overdue
- `Invoice.clienteId` — filtro por cliente
- `InvoicePayment.invoiceId` — lookup de pagamentos

---

## 11. Testes

### Unit Tests (Jest)
| Arquivo | Cobertura | Testes |
|---------|-----------|--------|
| `src/__tests__/api/invoices/route.test.ts` | GET + POST /api/invoices | 10 testes |
| `src/__tests__/api/invoices/[id].route.test.ts` | GET/PUT/DELETE /api/invoices/[id] | 19 testes |
| `src/__tests__/api/invoices/payments.route.test.ts` | GET/POST payments | 12 testes |
| `src/__tests__/api/invoices/send.route.test.ts` | POST send | 9 testes |
| `src/__tests__/api/invoices/stats.route.test.ts` | GET stats | 6 testes |
| `src/__tests__/unit/invoice-calculations.test.ts` | Cálculos de totais | 20+ testes |
| `src/__tests__/unit/invoice-validations.test.ts` | Validações | Existente |

**Total**: 56+ testes de unidade aprovados

### E2E Tests (Playwright)
| Arquivo | Foco | Testes |
|---------|------|--------|
| `tests/e2e/invoices/invoices-smoke.spec.ts` | Carregamento e navegação | 7 testes |
| `tests/e2e/invoices/invoices-crud.spec.ts` | CRUD via API e UI | 9 testes |
| `tests/e2e/invoices/invoices-rbac.spec.ts` | Controle de acesso | 7 testes |
| `tests/e2e/invoices/invoices-security.spec.ts` | Segurança (IDOR, XSS) | 8 testes |
| `tests/e2e/invoices/invoices-edge-cases.spec.ts` | Casos de borda | 5 testes |
| `tests/e2e/invoices/invoices-regression.spec.ts` | Guards contra regressão P1/P2 | 11 testes |

---

## 12. Issues Conhecidos e Limitações

1. **Webhook `/api/webhooks/invoice-paid`**: Não auditado neste ciclo — requer revisão de segurança separada (verificação de assinatura HMAC)
2. **Portal PDF**: A rota `/portal/[token]/invoices/[id]/pdf` não foi auditada neste ciclo
3. **Print pages**: As rotas `/print` não requerem autenticação por design — adequado para impressão local, mas requer cookie de sessão válido
4. **Relatório PDF**: `/api/reports/invoices/pdf` não foi auditado neste ciclo
5. **Rate limiting**: Não há rate limiting específico no endpoint `send` — pode ser abusado para spam de email
6. **Número de invoice**: Geração sequencial dentro de transação pode criar gargalo com alta concorrência

---

## 13. Próximos Passos Recomendados

| Prioridade | Ação | Impacto |
|------------|------|---------|
| P1 | Auditar `/api/webhooks/invoice-paid` — verificar assinatura HMAC | Segurança |
| P1 | Auditar `/api/reports/invoices/pdf` | Segurança |
| P2 | Adicionar rate limiting no endpoint `send` (máx 10/hora por empresa) | Abuso |
| P2 | Adicionar índices ao schema Prisma: `empresaId`, `status`, `dataVencimento` | Performance |
| P2 | Implementar cache para `stats` (TTL 60s) com `unstable_cache` | Performance |
| P3 | Adicionar testes E2E com sessão autenticada real | Cobertura |
| P3 | Implementar paginação no endpoint de payments | Escalabilidade |
| P3 | Adicionar preview de email antes do envio | UX |
