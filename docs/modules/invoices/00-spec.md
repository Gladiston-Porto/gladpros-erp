# Módulo Invoices — Documentação Técnica

**Status:** ✅ Produção  
**Última atualização:** 2026-04-18  

---

## 1. Visão Geral

O módulo de Invoices gerencia a emissão, envio, controle de pagamentos e geração de PDF de faturas para clientes. Integra-se com Projetos, Service Orders, Financeiro (Ledger) e o portal do cliente. Suporta tax rate variável, múltiplos pagamentos parciais e rastreamento completo do ciclo de vida.

---

## 2. Arquitetura (estrutura de pastas real)

```
src/app/(dashboard)/invoices/
├── page.tsx                          # Lista de invoices com filtros
├── layout.tsx
├── loading.tsx
├── new/
│   └── page.tsx                      # Criação de nova invoice
├── relatorios/
│   └── page.tsx                      # Relatório de invoices
├── [id]/
│   ├── page.tsx                      # Detalhe da invoice
│   └── edit/
│       └── page.tsx                  # Edição da invoice
└── _components/
    ├── InvoiceDetailSections.tsx     # Seções do detalhe
    ├── InvoiceFormSections.tsx       # Seções do formulário
    ├── InvoicePaymentDialog.tsx      # Dialog de registro de pagamento
    ├── InvoiceStepper.tsx            # Stepper de status
    ├── InvoicesFiltersCard.tsx       # Filtros da lista
    ├── InvoicesTableCard.tsx         # Tabela paginada
    ├── invoice-utils.tsx             # Helpers de formatação
    └── types.ts

src/app/api/invoices/
├── route.ts                          # GET (lista paginada) / POST (criar)
├── stats/route.ts                    # GET — KPIs (total, pago, vencido)
├── overdue/route.ts                  # GET — invoices vencidas
└── [id]/
    ├── route.ts                      # GET / PATCH / DELETE
    ├── pdf/route.ts                  # GET — gerar/baixar PDF
    ├── send/route.ts                 # POST — enviar por email
    └── payments/
        ├── route.ts                  # GET / POST pagamentos
        └── [paymentId]/route.ts      # PATCH / DELETE pagamento
```

---

## 3. Modelo de Dados (campos Prisma reais)

### Invoice

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `Int` | PK autoincrement |
| `numeroInvoice` | `String @unique` | Número legível (ex: INV-2025-001) |
| `clienteId` | `Int` | FK → Cliente |
| `projetoId` | `Int?` | FK → Projeto (opcional) |
| `dataEmissao` | `DateTime` | Data de emissão |
| `dataVencimento` | `DateTime` | Data de vencimento |
| `dataPagamento` | `DateTime?` | Data do pagamento total |
| `subtotal` | `Decimal(15,2)` | Soma dos itens antes de tax |
| `descontoValor` | `Decimal(15,2)` | Desconto em USD |
| `descontoPercentual` | `Decimal(5,2)` | Desconto em % |
| `taxRate` | `Decimal(5,4)` | Alíquota (default 8.25% — Texas) |
| `taxAmount` | `Decimal(15,2)` | Valor calculado do tax |
| `valorTotal` | `Decimal(15,2)` | Total final (subtotal - desconto + tax) |
| `valorPago` | `Decimal(15,2)` | Soma dos pagamentos recebidos |
| `saldo` | `Decimal(15,2)` | valorTotal - valorPago |
| `status` | `Invoice_status` | DRAFT / SENT / VIEWED / PARTIAL_PAID / PAID / OVERDUE / CANCELED |
| `notas` | `String?` | Notas internas |
| `termos` | `String?` | Termos e condições exibidos na invoice |
| `ledgerTransactionId` | `Int? @unique` | FK → LedgerTransaction (registro financeiro) |
| `pdfStorageKey` | `String?` | Chave de armazenamento do PDF gerado |
| `pdfFileName` | `String?` | Nome do arquivo PDF |
| `pdfGeneratedAt` | `DateTime?` | Quando o PDF foi gerado |
| `pdfSha256` | `Char(64)?` | Hash de integridade do PDF |
| `criadoPor / atualizadoPor` | `Int` | FK → Usuario |

### InvoiceItem

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `tipo` | `InvoiceItem_tipo` | SERVICE / MATERIAL / LABOR / OTHER |
| `descricao` | `String` | Descrição do item |
| `quantidade` | `Decimal(15,4)` | Quantidade |
| `unidade` | `String` | Unidade (hr, unit, etc.) |
| `precoUnitario` | `Decimal(15,2)` | Preço por unidade |
| `desconto` | `Decimal(15,2)` | Desconto no item |
| `subtotal` | `Decimal(15,2)` | Calculado automaticamente |
| `taxavel` | `Boolean` | Item sujeito a tax? |
| `propostaEtapaId` | `Int?` | FK → PropostaEtapa (origin) |
| `materialId` | `Int?` | FK → Material (origin) |

### InvoicePayment

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `valor` | `Decimal(15,2)` | Valor do pagamento |
| `dataPagamento` | `DateTime` | Data do recebimento |
| `metodoPagamento` | `InvoicePayment_metodo` | BANK_TRANSFER / CHECK / CASH / CREDIT_CARD / ACH / ZELLE / OTHER |
| `bankAccountId` | `Int?` | FK → BankAccount |
| `referencia` | `String?` | Número de referência |
| `ledgerTransactionId` | `Int? @unique` | FK → LedgerTransaction |
| `gatewayTransactionId` | `String?` | ID do gateway de pagamento |

### InvoiceReminder

Lembretes automáticos de cobrança: tipo REMINDER / LATE_NOTICE / FINAL_NOTICE, método EMAIL / SMS.

---

## 4. API REST (endpoints reais)

| Método | Rota | RBAC mínimo | Descrição |
|--------|------|-------------|-----------|
| `GET` | `/api/invoices` | `invoices:read` | Listar com filtros e paginação |
| `POST` | `/api/invoices` | `invoices:create` | Criar nova invoice |
| `GET` | `/api/invoices/stats` | `invoices:read` | KPIs: total, pago, vencido, a receber |
| `GET` | `/api/invoices/overdue` | `invoices:read` | Invoices vencidas (alertas) |
| `GET` | `/api/invoices/:id` | `invoices:read` | Detalhe completo |
| `PATCH` | `/api/invoices/:id` | `invoices:update` | Editar invoice (apenas DRAFT) |
| `DELETE` | `/api/invoices/:id` | `invoices:delete` | Cancelar invoice |
| `GET` | `/api/invoices/:id/pdf` | `invoices:read` | Gerar e baixar PDF |
| `POST` | `/api/invoices/:id/send` | `invoices:update` | Enviar por email → status SENT |
| `GET` | `/api/invoices/:id/payments` | `invoices:read` | Listar pagamentos |
| `POST` | `/api/invoices/:id/payments` | `invoices:create` | Registrar pagamento |
| `PATCH` | `/api/invoices/:id/payments/:paymentId` | `invoices:update` | Editar pagamento |
| `DELETE` | `/api/invoices/:id/payments/:paymentId` | `invoices:delete` | Remover pagamento |

---

## 5. Regras de Negócio

- **Tax rate padrão**: 8.25% (Texas state + local sales tax) — configurável por invoice
- **Edição bloqueada**: após status `SENT`, apenas campos de notas e data de vencimento podem ser editados
- **Pagamento parcial**: múltiplos `InvoicePayment` permitidos; status vira `PARTIAL_PAID` automaticamente
- **Status automático**: sistema verifica `dataVencimento` e seta `OVERDUE` quando `saldo > 0` e data passou
- **PDF gerado sob demanda**: armazenado com `pdfStorageKey`; hash SHA-256 para integridade
- **Ledger**: ao registrar pagamento, cria `LedgerTransaction` automático no módulo financeiro
- **Service Order link**: invoice gerada via OS mantém `ServiceOrder.invoiceId`
- **Numeração**: `numeroInvoice` gerado sequencialmente (ex: `INV-2025-001`)
- **Cancelamento**: invoice `PAID` não pode ser cancelada sem estorno do pagamento

---

## 6. Segurança & RBAC

| Role | Permissões |
|------|-----------|
| `ADMIN` | CRUD completo |
| `GERENTE` | CRUD completo (ALL) |
| `FINANCEIRO` | CRUD completo (ALL) |
| `USUARIO` | Read only |
| `CLIENTE` | Read only (portal — apenas próprias invoices) |
| `ESTOQUE` | Sem acesso |

```typescript
if (!can(user.role as Role, "invoices", "read")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

---

## 7. Máquina de Estados (Invoice_status)

```
DRAFT → SENT → VIEWED → PARTIAL_PAID → PAID
                   ↓           ↓
                OVERDUE     OVERDUE
                   ↓
               CANCELED
```

| Status | Descrição |
|--------|-----------|
| `DRAFT` | Rascunho — editável, não enviada ao cliente |
| `SENT` | Enviada por email — geração do PDF |
| `VIEWED` | Cliente abriu o link da invoice |
| `PARTIAL_PAID` | Pagamento parcial registrado |
| `PAID` | Pago integralmente (`saldo = 0`) |
| `OVERDUE` | Vencida com saldo em aberto |
| `CANCELED` | Cancelada |

---

## 8. Integrações

| Módulo | Integração |
|--------|-----------|
| **Projetos** | `projetoId` vincula invoice ao projeto |
| **Service Orders** | OS → Invoice via `/generate-invoice`; `Invoice.ServiceOrder` |
| **Financeiro** | `LedgerTransaction` criada automaticamente ao pagar |
| **Clientes** | `clienteId` obrigatório; portal do cliente (`CLIENTE` role) |
| **Estoque** | `InvoiceItem` pode referenciar `materialId` |
| **Propostas** | `InvoiceItem.propostaEtapaId` rastreia origem da etapa |
| **Reports** | `/api/reports/invoices/pdf` — relatório PDF de invoices |

---

## 9. Problemas Conhecidos

- PDF gerado server-side pode ser lento para invoices com muitos itens
- `InvoiceReminder` automático ainda requer configuração manual de cron job
- Portal do cliente (`CLIENTE` role) não tem autenticação separada — usa JWT compartilhado

---

## 10. Roadmap Futuro

- [ ] Pagamento online via Stripe / Square
- [ ] Templates customizáveis de invoice (logo, cores, termos)
- [ ] Lembretes automáticos de vencimento (cron + email)
- [ ] Recorrência de invoices (contratos mensais)
- [ ] Portal self-service do cliente para baixar e pagar
- [ ] Relatório de aging (30/60/90 dias em atraso)
- [ ] Integração com QuickBooks / Xero para exportação contábil
