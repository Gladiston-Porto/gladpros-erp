# 📄 INVOICE SYSTEM - SCHEMA PRISMA COMPLETO

**Módulo:** Invoice (Semana 0)  
**Status:** Especificação técnica completa  
**Integração:** Projeto, Cliente, Financeiro (Ledger)

---

## 🎯 OBJETIVOS

Sistema completo de faturamento (invoicing) para operação nos EUA (Texas), com:
- ✅ Invoice por projeto com itens detalhados
- ✅ Texas Sales Tax automático (8.25%)
- ✅ Múltiplas formas de pagamento
- ✅ Status workflow completo
- ✅ Integração com Ledger (receita/A/R)
- ✅ PDF generation automático
- ✅ Email/SMS notificações

---

## 📐 MODELS PRISMA

### 1. Invoice (Fatura/Invoice)

```prisma
model Invoice {
  id                  Int      @id @default(autoincrement())
  numeroInvoice       String   @unique @db.VarChar(50)
  // Formato: INV-2025-0001, INV-2025-0002
  
  // Relacionamentos
  projetoId           Int?
  clienteId           Int
  createdBy           Int      // Usuário que criou
  
  // Datas
  dataEmissao         DateTime @default(now())
  dataVencimento      DateTime
  dataPagamento       DateTime?
  ultimoLembrete      DateTime? // Última cobrança enviada
  
  // Valores
  subtotal            Decimal  @db.Decimal(12,2)  // Soma dos itens
  descontoValor       Decimal  @default(0) @db.Decimal(12,2)
  descontoPercentual  Decimal  @default(0) @db.Decimal(5,2)
  
  // Texas Sales Tax
  taxRateId           Int?     // Link para TaxRate configurável
  taxRate             Decimal  @default(8.25) @db.Decimal(5,4)  // 0.0825
  taxAmount           Decimal  @db.Decimal(12,2)  // Calculado
  
  // Total
  valorTotal          Decimal  @db.Decimal(12,2)  // subtotal - desconto + tax
  
  // Pagamentos
  valorPago           Decimal  @default(0) @db.Decimal(12,2)
  saldo               Decimal  @db.Decimal(12,2)  // valorTotal - valorPago
  
  // Status
  status              Invoice_status @default(DRAFT)
  
  // Observações
  observacoes         String?  @db.Text
  termos              String?  @db.Text  // Termos e condições
  notasInternas       String?  @db.Text  // Notas privadas
  
  // Arquivos
  pdfUrl              String?  @db.VarChar(500)
  anexos              Json?    // Array de URLs de anexos
  
  // Integração Contábil
  ledgerTransactionId Int?     @unique  // Link para contabilização
  
  // Auditoria
  criadoEm            DateTime @default(now())
  atualizadoEm        DateTime @updatedAt
  canceladoEm         DateTime?
  canceladoPor        Int?
  motivoCancelamento  String?  @db.Text
  
  // Relações
  projeto             Projeto?  @relation(fields: [projetoId], references: [id])
  cliente             Cliente   @relation(fields: [clienteId], references: [id])
  criador             Usuario   @relation("InvoiceCreator", fields: [createdBy], references: [id])
  cancelador          Usuario?  @relation("InvoiceCanceler", fields: [canceladoPor], references: [id])
  taxRateConfig       TaxRate?  @relation(fields: [taxRateId], references: [id])
  
  itens               InvoiceItem[]
  pagamentos          InvoicePayment[]
  lembretes           InvoiceReminder[]
  ledgerTransaction   LedgerTransaction? @relation(fields: [ledgerTransactionId], references: [id])
  
  @@index([projetoId])
  @@index([clienteId])
  @@index([status])
  @@index([dataVencimento])
  @@index([createdBy])
  @@map("invoices")
}

enum Invoice_status {
  DRAFT          // Rascunho (não enviado)
  SENT           // Enviado ao cliente
  VIEWED         // Cliente visualizou
  PARTIAL_PAID   // Parcialmente pago
  PAID           // Pago completamente
  OVERDUE        // Vencido (não pago)
  CANCELLED      // Cancelado
}
```

**Regras de Negócio:**
- `numeroInvoice` gerado automaticamente: `INV-{ano}-{sequencial}`
- `dataVencimento` default: +30 dias da emissão
- `taxAmount = (subtotal - descontoValor) × taxRate`
- `valorTotal = subtotal - descontoValor + taxAmount`
- `saldo = valorTotal - valorPago`
- Status `OVERDUE` automático se `dataVencimento < hoje && saldo > 0`
- Status `PAID` automático quando `saldo === 0`

---

### 2. InvoiceItem (Itens da Invoice)

```prisma
model InvoiceItem {
  id              Int      @id @default(autoincrement())
  invoiceId       Int
  
  // Item
  tipo            InvoiceItem_tipo
  descricao       String   @db.VarChar(500)
  observacoes     String?  @db.Text
  
  // Referências opcionais (rastreabilidade)
  propostaEtapaId Int?     // Serviço da proposta
  materialId      Int?     // Material específico
  reembolsoId     Int?     // Reembolso (futuro)
  
  // Quantidades
  quantidade      Decimal  @db.Decimal(12,3)
  unidade         String   @db.VarChar(20)  // "hrs", "units", "sqft"
  
  // Valores
  precoUnitario   Decimal  @db.Decimal(12,2)
  desconto        Decimal  @default(0) @db.Decimal(12,2)
  subtotal        Decimal  @db.Decimal(12,2)  // quantidade × precoUnitario - desconto
  
  // Impostos
  taxavel         Boolean  @default(true)  // Aplica sales tax?
  
  // Ordem
  ordem           Int      @default(0)  // Para ordenação customizada
  
  // Auditoria
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
  
  // Relações
  invoice         Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  propostaEtapa   PropostaEtapa? @relation(fields: [propostaEtapaId], references: [id])
  material        Material?      @relation(fields: [materialId], references: [id])
  
  @@index([invoiceId])
  @@index([propostaEtapaId])
  @@index([materialId])
  @@map("invoice_items")
}

enum InvoiceItem_tipo {
  SERVICE      // Serviço (labor)
  MATERIAL     // Material fornecido
  EQUIPMENT    // Equipamento usado
  OTHER        // Outros (taxas, etc.)
}
```

**Cálculos:**
```typescript
subtotal = quantidade × precoUnitario - desconto

// Para Invoice:
subtotalInvoice = sum(InvoiceItem.subtotal)
taxableAmount = sum(InvoiceItem.subtotal WHERE taxavel = true)
taxAmount = taxableAmount × taxRate
valorTotal = subtotalInvoice + taxAmount
```

---

### 3. InvoicePayment (Pagamentos)

```prisma
model InvoicePayment {
  id                  Int      @id @default(autoincrement())
  invoiceId           Int
  
  // Pagamento
  dataPagamento       DateTime @default(now())
  valor               Decimal  @db.Decimal(12,2)
  
  // Método
  metodoPagamento     InvoicePayment_metodo
  referencia          String?  @db.VarChar(200)  // Cheque #, Transaction ID
  
  // Gateway (Stripe, Square - Fase 5)
  gatewayId           Int?
  gatewayTransactionId String? @db.VarChar(200)
  gatewayFee          Decimal? @db.Decimal(10,2)  // Taxa do gateway
  
  // Banco
  bankAccountId       Int?     // Conta bancária de destino
  
  // Observações
  observacoes         String?  @db.Text
  comprovante         String?  @db.VarChar(500)  // URL do comprovante
  
  // Integração Contábil
  ledgerTransactionId Int?     @unique
  
  // Auditoria
  registradoPor       Int
  registradoEm        DateTime @default(now())
  atualizadoEm        DateTime @updatedAt
  cancelado           Boolean  @default(false)
  canceladoEm         DateTime?
  canceladoPor        Int?
  motivoCancelamento  String?  @db.Text
  
  // Relações
  invoice             Invoice  @relation(fields: [invoiceId], references: [id])
  bankAccount         BankAccount? @relation(fields: [bankAccountId], references: [id])
  registrador         Usuario  @relation("PaymentRegistrar", fields: [registradoPor], references: [id])
  cancelador          Usuario? @relation("PaymentCanceler", fields: [canceladoPor], references: [id])
  ledgerTransaction   LedgerTransaction? @relation(fields: [ledgerTransactionId], references: [id])
  
  @@index([invoiceId])
  @@index([bankAccountId])
  @@index([dataPagamento])
  @@index([registradoPor])
  @@map("invoice_payments")
}

enum InvoicePayment_metodo {
  BANK_TRANSFER  // Transferência bancária
  CHECK          // Cheque
  CARD           // Cartão crédito/débito
  CASH           // Dinheiro
  STRIPE         // Stripe (Fase 5)
  SQUARE         // Square (Fase 5)
  OTHER          // Outro
}
```

**Hooks Automáticos:**
```typescript
async function onInvoicePaymentCreated(payment: InvoicePayment) {
  // 1. Atualizar Invoice
  const invoice = await getInvoice(payment.invoiceId)
  invoice.valorPago += payment.valor
  invoice.saldo = invoice.valorTotal - invoice.valorPago
  
  if (invoice.saldo <= 0) {
    invoice.status = 'PAID'
    invoice.dataPagamento = payment.dataPagamento
  } else if (invoice.valorPago > 0) {
    invoice.status = 'PARTIAL_PAID'
  }
  
  // 2. Criar lançamento contábil
  await criarLedgerTransaction({
    origin: 'invoice_payment',
    originId: payment.id,
    date: payment.dataPagamento,
    entries: [
      // Débito: Banco (entrada de dinheiro)
      { 
        accountId: payment.bankAccountId || DEFAULT_BANK_ACCOUNT,
        debit: payment.valor,
        credit: 0
      },
      // Crédito: Accounts Receivable (baixa da dívida)
      {
        accountId: ACCOUNTS_RECEIVABLE_ID,
        debit: 0,
        credit: payment.valor
      }
    ]
  })
  
  // 3. Notificar stakeholders
  await notifyPaymentReceived(invoice, payment)
}
```

---

### 4. InvoiceReminder (Lembretes/Dunning)

```prisma
model InvoiceReminder {
  id              Int      @id @default(autoincrement())
  invoiceId       Int
  
  // Tipo
  tipo            InvoiceReminder_tipo
  diasAposVencimento Int   // 0, 7, 15, 30
  
  // Envio
  enviadoEm       DateTime @default(now())
  metodo          InvoiceReminder_metodo
  destinatario    String   @db.VarChar(200)  // Email ou telefone
  assunto         String?  @db.VarChar(200)
  mensagem        String   @db.Text
  
  // Status
  status          InvoiceReminder_status @default(SENT)
  aberto          Boolean  @default(false)  // Email aberto?
  abertoEm        DateTime?
  
  // Ação resultante
  resultadoEm     DateTime?
  resultado       String?  @db.VarChar(100)  // "paid", "contacted", "ignored"
  
  // Auditoria
  criadoEm        DateTime @default(now())
  
  // Relações
  invoice         Invoice  @relation(fields: [invoiceId], references: [id])
  
  @@index([invoiceId])
  @@index([enviadoEm])
  @@index([status])
  @@map("invoice_reminders")
}

enum InvoiceReminder_tipo {
  INITIAL_SEND     // Envio inicial da invoice
  REMINDER         // Lembrete antes do vencimento
  OVERDUE_NOTICE   // Aviso de vencimento
  ESCALATION       // Escalação (gerente/legal)
}

enum InvoiceReminder_metodo {
  EMAIL
  SMS
  PHONE_CALL
  LETTER
}

enum InvoiceReminder_status {
  SENT         // Enviado
  DELIVERED    // Entregue (confirmado)
  OPENED       // Aberto pelo destinatário
  FAILED       // Falha no envio
}
```

---

### 5. TaxRate (Configuração de Impostos)

```prisma
model TaxRate {
  id              Int      @id @default(autoincrement())
  nome            String   @db.VarChar(100)  // "Texas State Sales Tax"
  descricao       String?  @db.Text
  
  // Tipo
  tipo            TaxRate_tipo
  
  // Localização
  pais            String   @default("US") @db.VarChar(2)
  estado          String?  @db.VarChar(50)  // "Texas", "TX"
  cidade          String?  @db.VarChar(100) // "Austin", "Houston"
  zipCode         String?  @db.VarChar(20)  // Para taxas específicas
  
  // Alíquota
  aliquota        Decimal  @db.Decimal(5,4)  // 0.0825 = 8.25%
  
  // Aplicação
  aplicaReceita   Boolean  @default(true)   // Aplica em vendas/serviços
  aplicaDespesa   Boolean  @default(false)  // Aplica em compras
  
  // Vigência
  dataInicio      DateTime @default(now())
  dataFim         DateTime?
  ativo           Boolean  @default(true)
  
  // Auditoria
  criadoPor       Int
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
  
  // Relações
  criador         Usuario  @relation(fields: [criadoPor], references: [id])
  invoices        Invoice[]
  
  @@index([estado])
  @@index([ativo])
  @@map("tax_rates")
}

enum TaxRate_tipo {
  SALES_TAX        // Imposto sobre vendas (Texas)
  SERVICE_TAX      // Imposto sobre serviços
  WITHHOLDING      // Retenção na fonte
  VAT              // IVA (futuro internacional)
}
```

**Seed Texas:**
```typescript
const texasTaxRates = [
  {
    nome: "Texas State Sales Tax",
    tipo: "SALES_TAX",
    estado: "Texas",
    aliquota: 0.0625,  // 6.25% state
    aplicaReceita: true
  },
  {
    nome: "Austin Combined Sales Tax",
    tipo: "SALES_TAX",
    estado: "Texas",
    cidade: "Austin",
    aliquota: 0.0825,  // 6.25% + 2% local
    aplicaReceita: true
  },
  {
    nome: "Houston Combined Sales Tax",
    tipo: "SALES_TAX",
    estado: "Texas",
    cidade: "Houston",
    aliquota: 0.0825,  // 6.25% + 2% local
    aplicaReceita: true
  }
]
```

---

## 🔗 INTEGRAÇÕES

### 1. Projeto → Invoice (Conversão)

```typescript
interface CreateInvoiceFromProjetoInput {
  projetoId: number
  clienteId?: number  // Se diferente do cliente do projeto
  incluirMateriais: boolean  // Incluir materiais usados?
  incluirServicos: boolean   // Incluir serviços (MO)?
  dataVencimento?: Date
  observacoes?: string
  termos?: string
}

async function criarInvoiceFromProjeto(input: CreateInvoiceFromProjetoInput) {
  const projeto = await getProjeto(input.projetoId, {
    include: {
      proposta: {
        include: {
          etapas: true,
          materiais: true
        }
      },
      movimentacoes: {
        where: { tipo: 'SAIDA' },
        include: { material: true }
      }
    }
  })
  
  const itens: InvoiceItemInput[] = []
  
  // 1. Adicionar serviços (da proposta)
  if (input.incluirServicos && projeto.proposta) {
    for (const etapa of projeto.proposta.etapas) {
      itens.push({
        tipo: 'SERVICE',
        descricao: `${etapa.servico} - ${etapa.descricao}`,
        propostaEtapaId: etapa.id,
        quantidade: etapa.duracaoEstimadaHoras || 1,
        unidade: 'hrs',
        precoUnitario: etapa.custoMaoObraEstimado 
          ? etapa.custoMaoObraEstimado / (etapa.duracaoEstimadaHoras || 1)
          : 0,
        taxavel: true  // Serviços são taxáveis no Texas
      })
    }
  }
  
  // 2. Adicionar materiais (consumidos no projeto)
  if (input.incluirMateriais) {
    const materiaisUsados = projeto.movimentacoes
      .reduce((acc, mov) => {
        const existing = acc.find(m => m.materialId === mov.materialId)
        if (existing) {
          existing.quantidade += mov.quantidade
        } else {
          acc.push({
            materialId: mov.materialId,
            material: mov.material,
            quantidade: mov.quantidade
          })
        }
        return acc
      }, [] as any[])
    
    for (const mat of materiaisUsados) {
      itens.push({
        tipo: 'MATERIAL',
        descricao: `${mat.material.nome} (${mat.material.codigo})`,
        materialId: mat.materialId,
        quantidade: mat.quantidade,
        unidade: mat.material.unidade,
        precoUnitario: mat.material.ultimoCusto * 1.25,  // 25% markup
        taxavel: true  // Materiais são taxáveis no Texas
      })
    }
  }
  
  // 3. Calcular totais
  const subtotal = itens.reduce((sum, item) => {
    const itemSubtotal = item.quantidade * item.precoUnitario - (item.desconto || 0)
    return sum + itemSubtotal
  }, 0)
  
  const taxRate = await getTaxRateForCliente(input.clienteId || projeto.clienteId)
  const taxAmount = subtotal * (taxRate?.aliquota || 0.0825)
  const valorTotal = subtotal + taxAmount
  
  // 4. Criar Invoice
  const invoice = await prisma.invoice.create({
    data: {
      numeroInvoice: await generateInvoiceNumber(),
      projetoId: input.projetoId,
      clienteId: input.clienteId || projeto.clienteId,
      dataVencimento: input.dataVencimento || addDays(new Date(), 30),
      subtotal,
      taxRateId: taxRate?.id,
      taxRate: taxRate?.aliquota || 0.0825,
      taxAmount,
      valorTotal,
      saldo: valorTotal,
      observacoes: input.observacoes,
      termos: input.termos || DEFAULT_INVOICE_TERMS,
      status: 'DRAFT',
      itens: {
        create: itens.map((item, index) => ({
          ...item,
          subtotal: item.quantidade * item.precoUnitario - (item.desconto || 0),
          ordem: index + 1
        }))
      }
    },
    include: { itens: true }
  })
  
  return invoice
}
```

---

### 2. Invoice → Ledger (Contabilização)

**Ao enviar Invoice (status: DRAFT → SENT):**
```typescript
async function onInvoiceSent(invoice: Invoice) {
  // Criar lançamento: Accounts Receivable (A/R)
  await criarLedgerTransaction({
    origin: 'invoice_sent',
    originId: invoice.id,
    date: invoice.dataEmissao,
    description: `Invoice ${invoice.numeroInvoice} - ${invoice.cliente.nome}`,
    entries: [
      // Débito: Accounts Receivable (direito a receber)
      {
        accountId: ACCOUNTS_RECEIVABLE_ID,
        debit: invoice.valorTotal,
        credit: 0,
        projectId: invoice.projetoId,
        clientId: invoice.clienteId
      },
      // Crédito: Revenue - Services (receita de serviços)
      {
        accountId: REVENUE_SERVICES_ID,
        debit: 0,
        credit: invoice.subtotal,
        projectId: invoice.projetoId,
        clientId: invoice.clienteId
      },
      // Crédito: Sales Tax Liability (passivo de imposto)
      {
        accountId: SALES_TAX_LIABILITY_ID,
        debit: 0,
        credit: invoice.taxAmount
      }
    ]
  })
  
  // Vincular
  await invoice.update({
    ledgerTransactionId: transaction.id
  })
}
```

**Ao receber Pagamento:**
Ver `onInvoicePaymentCreated()` acima.

---

## 📊 QUERIES ÚTEIS

### Aging Report (A/R Vencidas)

```typescript
interface AgingReportResult {
  current: Decimal      // 0-30 dias
  days30_60: Decimal    // 31-60 dias
  days60_90: Decimal    // 61-90 dias
  over90: Decimal       // 90+ dias
  total: Decimal
}

async function getARAging(): Promise<AgingReportResult> {
  const hoje = new Date()
  const days30 = subDays(hoje, 30)
  const days60 = subDays(hoje, 60)
  const days90 = subDays(hoje, 90)
  
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'VIEWED', 'PARTIAL_PAID', 'OVERDUE'] },
      saldo: { gt: 0 }
    },
    select: {
      dataVencimento: true,
      saldo: true
    }
  })
  
  const aging = {
    current: 0,
    days30_60: 0,
    days60_90: 0,
    over90: 0,
    total: 0
  }
  
  for (const inv of invoices) {
    const diasVencido = differenceInDays(hoje, inv.dataVencimento)
    
    if (diasVencido <= 30) {
      aging.current += inv.saldo
    } else if (diasVencido <= 60) {
      aging.days30_60 += inv.saldo
    } else if (diasVencido <= 90) {
      aging.days60_90 += inv.saldo
    } else {
      aging.over90 += inv.saldo
    }
    
    aging.total += inv.saldo
  }
  
  return aging
}
```

### Dashboard Invoice Summary

```typescript
interface InvoiceDashboard {
  totalEmitido: Decimal       // Total invoices enviadas
  totalPago: Decimal          // Total recebido
  totalPendente: Decimal      // Total a receber (saldo)
  totalVencido: Decimal       // Total vencido (overdue)
  
  countDraft: number
  countSent: number
  countPaid: number
  countOverdue: number
  
  proximosVencimentos: {
    proximos7dias: Decimal
    proximos15dias: Decimal
    proximos30dias: Decimal
  }
}
```

---

## 🧪 VALIDAÇÕES & REGRAS

### Validação Zod (API)

```typescript
import { z } from 'zod'

export const createInvoiceSchema = z.object({
  projetoId: z.number().int().positive().optional(),
  clienteId: z.number().int().positive(),
  dataVencimento: z.coerce.date(),
  
  itens: z.array(z.object({
    tipo: z.enum(['SERVICE', 'MATERIAL', 'EQUIPMENT', 'OTHER']),
    descricao: z.string().min(3).max(500),
    quantidade: z.number().positive(),
    unidade: z.string().max(20),
    precoUnitario: z.number().nonnegative(),
    desconto: z.number().nonnegative().default(0),
    taxavel: z.boolean().default(true),
    propostaEtapaId: z.number().int().positive().optional(),
    materialId: z.number().int().positive().optional()
  })).min(1, 'Invoice deve ter pelo menos 1 item'),
  
  descontoPercentual: z.number().min(0).max(100).default(0),
  taxRateId: z.number().int().positive().optional(),
  observacoes: z.string().max(5000).optional(),
  termos: z.string().max(5000).optional()
})

export const registerPaymentSchema = z.object({
  invoiceId: z.number().int().positive(),
  dataPagamento: z.coerce.date(),
  valor: z.number().positive(),
  metodoPagamento: z.enum([
    'BANK_TRANSFER', 'CHECK', 'CARD', 'CASH', 'STRIPE', 'SQUARE', 'OTHER'
  ]),
  referencia: z.string().max(200).optional(),
  bankAccountId: z.number().int().positive().optional(),
  observacoes: z.string().max(1000).optional(),
  comprovante: z.string().url().optional()
})
```

### Regras de Status

```typescript
function canEditInvoice(invoice: Invoice): boolean {
  return invoice.status === 'DRAFT'
}

function canCancelInvoice(invoice: Invoice): boolean {
  return ['DRAFT', 'SENT', 'VIEWED'].includes(invoice.status) && 
         invoice.valorPago === 0
}

function canSendInvoice(invoice: Invoice): boolean {
  return invoice.status === 'DRAFT' && 
         invoice.itens.length > 0 &&
         invoice.valorTotal > 0
}

function canRegisterPayment(invoice: Invoice): boolean {
  return ['SENT', 'VIEWED', 'PARTIAL_PAID', 'OVERDUE'].includes(invoice.status) &&
         invoice.saldo > 0
}
```

---

## 🔐 RBAC (Permissões)

```typescript
const invoicePermissions = {
  ADMIN: ['create', 'read', 'update', 'delete', 'send', 'cancel', 'pay'],
  FINANCEIRO: ['create', 'read', 'update', 'send', 'cancel', 'pay'],
  GERENTE: ['create', 'read', 'send', 'pay'],
  USUARIO: ['read'], // Apenas suas próprias invoices
  CLIENTE: ['read'], // Apenas suas invoices (portal cliente futuro)
}
```

---

## 📋 MIGRATIONS

### Migration: Create Invoice Tables

```sql
-- Invoice
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_invoice VARCHAR(50) UNIQUE NOT NULL,
  
  projeto_id INT NULL,
  cliente_id INT NOT NULL,
  created_by INT NOT NULL,
  
  data_emissao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_vencimento DATETIME NOT NULL,
  data_pagamento DATETIME NULL,
  ultimo_lembrete DATETIME NULL,
  
  subtotal DECIMAL(12,2) NOT NULL,
  desconto_valor DECIMAL(12,2) NOT NULL DEFAULT 0,
  desconto_percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  tax_rate_id INT NULL,
  tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0825,
  tax_amount DECIMAL(12,2) NOT NULL,
  
  valor_total DECIMAL(12,2) NOT NULL,
  valor_pago DECIMAL(12,2) NOT NULL DEFAULT 0,
  saldo DECIMAL(12,2) NOT NULL,
  
  status ENUM('DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  
  observacoes TEXT NULL,
  termos TEXT NULL,
  notas_internas TEXT NULL,
  
  pdf_url VARCHAR(500) NULL,
  anexos JSON NULL,
  
  ledger_transaction_id INT NULL UNIQUE,
  
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  cancelado_em DATETIME NULL,
  cancelado_por INT NULL,
  motivo_cancelamento TEXT NULL,
  
  FOREIGN KEY (projeto_id) REFERENCES projetos(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (created_by) REFERENCES usuarios(id),
  FOREIGN KEY (cancelado_por) REFERENCES usuarios(id),
  FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id),
  FOREIGN KEY (ledger_transaction_id) REFERENCES ledger_transactions(id),
  
  INDEX idx_projeto_id (projeto_id),
  INDEX idx_cliente_id (cliente_id),
  INDEX idx_status (status),
  INDEX idx_data_vencimento (data_vencimento),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice Items
CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  
  tipo ENUM('SERVICE', 'MATERIAL', 'EQUIPMENT', 'OTHER') NOT NULL,
  descricao VARCHAR(500) NOT NULL,
  observacoes TEXT NULL,
  
  proposta_etapa_id INT NULL,
  material_id INT NULL,
  
  quantidade DECIMAL(12,3) NOT NULL,
  unidade VARCHAR(20) NOT NULL,
  
  preco_unitario DECIMAL(12,2) NOT NULL,
  desconto DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  
  taxavel BOOLEAN NOT NULL DEFAULT TRUE,
  
  ordem INT NOT NULL DEFAULT 0,
  
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (proposta_etapa_id) REFERENCES proposta_etapas(id),
  FOREIGN KEY (material_id) REFERENCES materiais(id),
  
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_proposta_etapa_id (proposta_etapa_id),
  INDEX idx_material_id (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice Payments
CREATE TABLE invoice_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  
  data_pagamento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valor DECIMAL(12,2) NOT NULL,
  
  metodo_pagamento ENUM('BANK_TRANSFER', 'CHECK', 'CARD', 'CASH', 'STRIPE', 'SQUARE', 'OTHER') NOT NULL,
  referencia VARCHAR(200) NULL,
  
  gateway_id INT NULL,
  gateway_transaction_id VARCHAR(200) NULL,
  gateway_fee DECIMAL(10,2) NULL,
  
  bank_account_id INT NULL,
  
  observacoes TEXT NULL,
  comprovante VARCHAR(500) NULL,
  
  ledger_transaction_id INT NULL UNIQUE,
  
  registrado_por INT NOT NULL,
  registrado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  cancelado BOOLEAN NOT NULL DEFAULT FALSE,
  cancelado_em DATETIME NULL,
  cancelado_por INT NULL,
  motivo_cancelamento TEXT NULL,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (registrado_por) REFERENCES usuarios(id),
  FOREIGN KEY (cancelado_por) REFERENCES usuarios(id),
  FOREIGN KEY (ledger_transaction_id) REFERENCES ledger_transactions(id),
  
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_bank_account_id (bank_account_id),
  INDEX idx_data_pagamento (data_pagamento),
  INDEX idx_registrado_por (registrado_por)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice Reminders
CREATE TABLE invoice_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  
  tipo ENUM('INITIAL_SEND', 'REMINDER', 'OVERDUE_NOTICE', 'ESCALATION') NOT NULL,
  dias_apos_vencimento INT NOT NULL,
  
  enviado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metodo ENUM('EMAIL', 'SMS', 'PHONE_CALL', 'LETTER') NOT NULL,
  destinatario VARCHAR(200) NOT NULL,
  assunto VARCHAR(200) NULL,
  mensagem TEXT NOT NULL,
  
  status ENUM('SENT', 'DELIVERED', 'OPENED', 'FAILED') NOT NULL DEFAULT 'SENT',
  aberto BOOLEAN NOT NULL DEFAULT FALSE,
  aberto_em DATETIME NULL,
  
  resultado_em DATETIME NULL,
  resultado VARCHAR(100) NULL,
  
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_enviado_em (enviado_em),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tax Rates
CREATE TABLE tax_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT NULL,
  
  tipo ENUM('SALES_TAX', 'SERVICE_TAX', 'WITHHOLDING', 'VAT') NOT NULL,
  
  pais VARCHAR(2) NOT NULL DEFAULT 'US',
  estado VARCHAR(50) NULL,
  cidade VARCHAR(100) NULL,
  zip_code VARCHAR(20) NULL,
  
  aliquota DECIMAL(5,4) NOT NULL,
  
  aplica_receita BOOLEAN NOT NULL DEFAULT TRUE,
  aplica_despesa BOOLEAN NOT NULL DEFAULT FALSE,
  
  data_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_fim DATETIME NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  
  criado_por INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (criado_por) REFERENCES usuarios(id),
  
  INDEX idx_estado (estado),
  INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## ✅ CHECKLIST SEMANA 0

### Desenvolvimento
- [ ] ⏳ Models Prisma (5 models)
- [ ] ⏳ Migrations SQL
- [ ] ⏳ Seeds (Texas tax rates)
- [ ] ⏳ APIs CRUD Invoice
  - [ ] POST /api/invoices (criar)
  - [ ] GET /api/invoices (listar com filtros)
  - [ ] GET /api/invoices/:id (detalhes)
  - [ ] PUT /api/invoices/:id (atualizar draft)
  - [ ] POST /api/invoices/:id/send (enviar)
  - [ ] POST /api/invoices/:id/cancel (cancelar)
  - [ ] GET /api/invoices/:id/pdf (gerar PDF)
- [ ] ⏳ APIs Payment
  - [ ] POST /api/invoices/:id/payments (registrar pagamento)
  - [ ] GET /api/invoices/:id/payments (listar pagamentos)
  - [ ] DELETE /api/payments/:id (cancelar pagamento)
- [ ] ⏳ APIs Conversão
  - [ ] POST /api/projetos/:id/convert-to-invoice
- [ ] ⏳ Hooks Ledger Integration
- [ ] ⏳ PDF Generation (puppeteer ou similar)
- [ ] ⏳ Validações Zod
- [ ] ⏳ RBAC middleware

### Frontend
- [ ] ⏳ Tela: Lista Invoices (filtros, search, status)
- [ ] ⏳ Tela: Criar Invoice (form + preview)
- [ ] ⏳ Tela: Detalhes Invoice (view + ações)
- [ ] ⏳ Tela: Registrar Pagamento (form)
- [ ] ⏳ Componente: Invoice PDF Template
- [ ] ⏳ Componente: Invoice Status Badge
- [ ] ⏳ Dashboard: Métricas Invoice (cards)

### Testes
- [ ] ⏳ Unit: Cálculos (subtotal, tax, total)
- [ ] ⏳ Unit: Validações Zod
- [ ] ⏳ Integration: CRUD APIs
- [ ] ⏳ Integration: Payment flow
- [ ] ⏳ Integration: Ledger hooks
- [ ] ⏳ E2E: Criar invoice → Enviar → Pagar

---

**Status:** ✅ Especificação completa - Pronto para implementação  
**Próximo:** FINANCEIRO-SCHEMA-LEDGER.md (Ledger + Centro Custo hierárquico)
