---
name: invoice-generation
description: "Use when working on invoice creation, PDF generation, TX sales tax calculation, status machine, payment tracking, or RBAC for the invoices module. Covers full lifecycle from DRAFT to PAID/WRITTEN_OFF."
---

# Skill: Invoice Generation

## When to Use
- Creating or modifying `/api/invoices/`, `/api/invoices/[id]`, `/api/invoices/[id]/send`, `/api/invoices/[id]/pdf`
- Implementing invoice item types (SERVICE, MATERIAL, EQUIPMENT, OTHER)
- Calculating Texas sales tax, discounts, totals
- Building invoice PDF template logic
- Handling payment recording and status transitions

---

## Status Machine

```
DRAFT ──────────────────────────────────────────────────────────► CANCELLED
  │
  │ send (via /api/invoices/[id]/send)
  ▼
SENT ──────────────────────────────────────────────────────────── CANCELLED
  │
  │ client views link
  ▼
VIEWED
  │
  │ client approves (optional step — for formal acceptance)
  ▼
APPROVED
  │
  │ partial payment recorded
  ├──────────────────────────────────────────────────────────────►
  ▼                                                    PARTIALLY_PAID
  │                                                        │
  │ full payment recorded                                  │ remaining payment
  ▼                                                        ▼
PAID ◄──────────────────────────────────────────────────────────
  
DISPUTED ←── any status (client flags dispute)
  └── WRITTEN_OFF (uncollectible — admin action)
```

### Transition Rules

| De | Para | Pré-condição |
|----|------|-------------|
| `DRAFT` | `SENT` | Deve ter pelo menos 1 item; `clienteId` válido; `dataVencimento` no futuro |
| `SENT/VIEWED` | `APPROVED` | Approval do cliente ou ADMIN/FINANCEIRO |
| `APPROVED/SENT/VIEWED` | `PARTIALLY_PAID` | `valorPago > 0 && valorPago < valorTotal` |
| `PARTIALLY_PAID` | `PAID` | `valorPago >= valorTotal` |
| `APPROVED` | `PAID` | Direto se pagamento integral |
| Any | `DISPUTED` | `ADMIN` ou `FINANCEIRO` apenas |
| `DISPUTED` | `WRITTEN_OFF` | `ADMIN` apenas; requer motivo |
| `DRAFT/SENT` | `CANCELLED` | `ADMIN` ou `FINANCEIRO`; não pode cancelar se já pago |

---

## Tipos de Item de Invoice

```typescript
type InvoiceItemType = 'SERVICE' | 'MATERIAL' | 'EQUIPMENT' | 'OTHER'

// SERVICE  → mão de obra, visita técnica, consultoria
// MATERIAL → materiais comprados ou do estoque
// EQUIPMENT → aluguel ou uso de equipamentos
// OTHER → taxas, viagem, misc

const item = {
  tipo: 'SERVICE',
  descricao: 'Electrical panel installation',
  quantidade: 1,
  unidade: 'job',
  precoUnitario: 1500.00,
  desconto: 0,        // valor absoluto em USD
  taxavel: true,      // sujeito ao TX sales tax
  ordem: 0            // ordem de exibição no PDF
}
```

---

## Cálculo de Totais (Texas)

```typescript
// Texas Sales Tax — Dallas County
const TX_SALES_TAX_RATE = 0.0825  // 8.25% (6.25% state + 2% city Dallas)

function calculateInvoiceTotals(items: InvoiceItem[]) {
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = (item.quantidade * item.precoUnitario) - item.desconto
    return sum + lineTotal
  }, 0)

  const taxableAmount = items
    .filter(item => item.taxavel)
    .reduce((sum, item) => {
      return sum + (item.quantidade * item.precoUnitario) - item.desconto
    }, 0)

  const taxAmount = taxableAmount * TX_SALES_TAX_RATE
  const total = subtotal + taxAmount

  return {
    subtotal: round2(subtotal),
    taxableAmount: round2(taxableAmount),
    taxRate: TX_SALES_TAX_RATE,
    taxAmount: round2(taxAmount),
    total: round2(total),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
```

> **Regra fiscal TX**: Serviços de construção e remodelação são geralmente **taxáveis** no Texas.
> Labor-only (sem material) pode ser não-taxável dependendo do contrato. Quando em dúvida, `taxavel: true`.

---

## Numeração de Invoice

```
Formato: INV-{ANO}-{SEQUENCIAL 5 dígitos}
Exemplo: INV-2024-00001, INV-2024-00042

Geração:
1. SELECT MAX(numero) FROM Invoice WHERE ano = YEAR(CURRENT_DATE)
2. Incrementar sequencial
3. Formatar com padStart(5, '0')

NUNCA reutilizar número de invoice cancelada.
```

---

## PDF Generation

O template HTML está em `invoice-template-original.html` na raiz do projeto.

```typescript
// Dados necessários para o PDF
type InvoicePDFData = {
  invoice: Invoice & {
    cliente: Cliente
    itens: InvoiceItem[]
    projeto?: Projeto
  }
  empresa: Empresa  // GladPros LLC info, logo, endereço, EIN
  totals: InvoiceTotals
}

// Geração via Puppeteer ou html-pdf
// Rota: GET /api/invoices/[id]/pdf → retorna application/pdf
// Requer: ADMIN | FINANCEIRO | GERENTE
```

---

## Integração com Financeiro (LedgerTransaction)

```typescript
// Ao marcar invoice como PAID, criar LedgerTransaction:
// Double-entry: Debit Accounts Receivable / Credit Revenue

await prisma.ledgerTransaction.create({
  data: {
    invoiceId: invoice.id,
    empresaId: 1,
    tipo: 'RECEITA',
    valor: invoice.valorTotal,
    descricao: `Payment received — Invoice ${invoice.numero}`,
    dataTransacao: new Date(),
    entries: {
      create: [
        { conta: 'ACCOUNTS_RECEIVABLE', tipo: 'CREDIT', valor: invoice.valorTotal },
        { conta: 'REVENUE', tipo: 'DEBIT', valor: invoice.valorTotal },
      ]
    }
  }
})
```

---

## RBAC

| Ação | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO | CLIENTE |
|------|-------|---------|------------|---------|---------|---------|
| Criar invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver invoice | ✅ | ✅ | ✅ | ❌ | ✅ (próprias OS) | ✅ (próprias) |
| Editar DRAFT | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Enviar invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Registrar pagamento | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cancelar invoice | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Write-off | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Baixar PDF | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |

---

## Campos Obrigatórios vs Opcionais

```typescript
// OBRIGATÓRIO para criar (DRAFT)
clienteId: number
dataVencimento: string (ISO datetime)
itens: InvoiceItem[]  // mínimo 1 item

// OPCIONAL
projetoId?: number
notas?: string        // notas internas
termos?: string       // termos de pagamento visíveis no PDF
serviceOrderId?: number

// CALCULADOS pelo sistema
numero: string        // INV-{ANO}-{SEQ}
subtotal: Decimal
taxAmount: Decimal
valorTotal: Decimal
status: InvoiceStatus  // default DRAFT
criadoPor: number     // userId
```

---

## Queries Críticas (Performance)

```typescript
// ✅ Listagem paginada com filtros
const [total, invoices] = await Promise.all([
  prisma.invoice.count({ where: filters }),
  prisma.invoice.findMany({
    where: filters,
    select: {
      id: true, numero: true, status: true, valorTotal: true,
      dataVencimento: true, criadoEm: true,
      cliente: { select: { id: true, nome: true } }
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: { criadoEm: 'desc' }
  })
])

// ✅ Invoice completa para PDF/exibição
const invoice = await prisma.invoice.findUnique({
  where: { id },
  include: {
    cliente: true,
    itens: { orderBy: { ordem: 'asc' } },
    projeto: { select: { id: true, titulo: true, numero: true } }
  }
})
```

---

## Anti-patterns

```typescript
// ❌ NUNCA calcular total no cliente — sempre no servidor
// ❌ NUNCA reutilizar número de invoice cancelada
// ❌ NUNCA marcar PAID sem criar LedgerTransaction
// ❌ NUNCA editar invoice que não está em DRAFT (lançar 409)
// ❌ NUNCA exibir invoice de outro cliente (verificar clienteId vs user)
```
