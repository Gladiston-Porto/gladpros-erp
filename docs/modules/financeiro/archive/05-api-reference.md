# 🔌 APIs - MÓDULO FINANCEIRO

**REST APIs Completas com Validações, RBAC e Documentação**  
**Padrão:** Clean Architecture + Type-safe + Error Handling

---

## 🎯 VISÃO GERAL

### Estrutura de APIs

```
/api/financeiro/
├─ invoices/                 (Invoice System)
├─ ledger/                   (Ledger & Transactions)
│  ├─ accounts/              (Chart of Accounts)
│  └─ transactions/          (Ledger Transactions)
├─ centros-custo/            (Cost Centers)
├─ orcamentos/               (Budgets)
├─ bank-accounts/            (Bank Accounts)
├─ reconciliations/          (Bank Reconciliation)
├─ reembolsos/               (Reimbursements)
├─ reports/                  (Reports)
└─ dashboards/               (Dashboards)
```

---

## 📋 1. INVOICE SYSTEM APIs

### 1.1 Criar Invoice
```http
POST /api/invoices
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface CreateInvoiceRequest {
  projetoId?: number
  clienteId: number
  dataEmissao: string  // ISO 8601
  dataVencimento: string
  taxRateId?: number  // Default: Texas 8.25%
  descontoValor?: number
  descontoPercentual?: number
  notas?: string
  itens: {
    tipo: 'SERVICE' | 'MATERIAL' | 'EQUIPMENT' | 'OTHER'
    descricao: string
    quantidade: number
    unidade: string
    precoUnitario: number
    desconto?: number
    taxavel: boolean
    propostaEtapaId?: number
    materialId?: number
  }[]
}
```

**Validação Zod:**
```typescript
import { z } from 'zod'

const createInvoiceSchema = z.object({
  projetoId: z.number().int().positive().optional(),
  clienteId: z.number().int().positive(),
  dataEmissao: z.string().datetime(),
  dataVencimento: z.string().datetime(),
  taxRateId: z.number().int().positive().optional(),
  descontoValor: z.number().min(0).optional(),
  descontoPercentual: z.number().min(0).max(100).optional(),
  notas: z.string().max(1000).optional(),
  itens: z.array(z.object({
    tipo: z.enum(['SERVICE', 'MATERIAL', 'EQUIPMENT', 'OTHER']),
    descricao: z.string().min(1).max(500),
    quantidade: z.number().positive(),
    unidade: z.string().max(50),
    precoUnitario: z.number().min(0),
    desconto: z.number().min(0).optional(),
    taxavel: z.boolean(),
    propostaEtapaId: z.number().int().positive().optional(),
    materialId: z.number().int().positive().optional()
  })).min(1)
})
```

**Response:**
```typescript
interface CreateInvoiceResponse {
  id: number
  numeroInvoice: string  // "INV-2025-00123"
  status: 'DRAFT'
  subtotal: number
  taxAmount: number
  valorTotal: number
  saldo: number
  createdAt: string
}
```

**RBAC:**
- ADMIN: ✅ Permitido
- FINANCEIRO: ✅ Permitido
- GERENTE: ✅ Permitido (apenas seus projetos)
- VENDEDOR: ❌ Negado

**Exemplo:**
```typescript
const response = await fetch('/api/invoices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    clienteId: 5,
    projetoId: 123,
    dataEmissao: '2025-01-13T00:00:00Z',
    dataVencimento: '2025-02-13T00:00:00Z',
    itens: [
      {
        tipo: 'SERVICE',
        descricao: 'Construção fundação',
        quantidade: 1,
        unidade: 'job',
        precoUnitario: 50000,
        taxavel: true
      },
      {
        tipo: 'MATERIAL',
        descricao: 'Concreto',
        quantidade: 10,
        unidade: 'm³',
        precoUnitario: 500,
        taxavel: true,
        materialId: 78
      }
    ]
  })
})

// Response: 201 Created
{
  "id": 456,
  "numeroInvoice": "INV-2025-00456",
  "status": "DRAFT",
  "subtotal": 55000.00,
  "taxAmount": 4537.50,  // 8.25%
  "valorTotal": 59537.50,
  "saldo": 59537.50,
  "createdAt": "2025-01-13T10:30:00Z"
}
```

---

### 1.2 Listar Invoices
```http
GET /api/invoices?status=SENT&clienteId=5&page=1&limit=20
Authorization: Bearer {token}
```

**Query Parameters:**
```typescript
interface ListInvoicesParams {
  status?: 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  clienteId?: number
  projetoId?: number
  dataEmissaoInicio?: string
  dataEmissaoFim?: string
  dataVencimentoInicio?: string
  dataVencimentoFim?: string
  page?: number  // Default: 1
  limit?: number  // Default: 20
  orderBy?: 'dataEmissao' | 'dataVencimento' | 'valorTotal'
  orderDir?: 'asc' | 'desc'
}
```

**Response:**
```typescript
interface ListInvoicesResponse {
  data: Invoice[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

---

### 1.3 Enviar Invoice
```http
POST /api/invoices/:id/send
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface SendInvoiceRequest {
  enviarEmail: boolean
  emailDestinatario?: string  // Override cliente email
  emailCopia?: string[]  // CC
  mensagem?: string  // Custom message
}
```

**Response:**
```typescript
interface SendInvoiceResponse {
  id: number
  status: 'SENT'
  dataEnvio: string
  emailEnviado: boolean
  ledgerTransactionId: number  // Hook criou transaction
}
```

**Hook Trigger:**
- ✅ onInvoiceSent() executado automaticamente
- ✅ Ledger Transaction criada (A/R + Revenue + Tax Liability)

---

### 1.4 Registrar Pagamento
```http
POST /api/invoices/:id/payments
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface CreatePaymentRequest {
  valor: number
  dataPagamento: string  // ISO 8601
  metodoPagamento: 'BANK_TRANSFER' | 'CHECK' | 'CARD' | 'CASH' | 'STRIPE' | 'SQUARE'
  bankAccountId?: number
  referencia?: string  // Check number, transfer ID, etc.
  notas?: string
}
```

**Validação:**
```typescript
const createPaymentSchema = z.object({
  valor: z.number().positive(),
  dataPagamento: z.string().datetime(),
  metodoPagamento: z.enum(['BANK_TRANSFER', 'CHECK', 'CARD', 'CASH', 'STRIPE', 'SQUARE']),
  bankAccountId: z.number().int().positive().optional(),
  referencia: z.string().max(100).optional(),
  notas: z.string().max(500).optional()
}).refine(data => {
  // Se método = BANK_TRANSFER, bankAccountId é obrigatório
  if (data.metodoPagamento === 'BANK_TRANSFER' && !data.bankAccountId) {
    return false
  }
  return true
}, { message: 'bankAccountId obrigatório para BANK_TRANSFER' })
```

**Response:**
```typescript
interface CreatePaymentResponse {
  id: number
  invoiceId: number
  valor: number
  dataPagamento: string
  ledgerTransactionId: number  // Hook criou transaction
  invoice: {
    status: 'PAID' | 'PARTIAL_PAID'  // Atualizado automaticamente
    valorPago: number
    saldo: number
  }
}
```

**Hook Trigger:**
- ✅ onInvoicePayment() executado
- ✅ Ledger Transaction criada (Bank + A/R)
- ✅ Invoice.status atualizado automaticamente

---

### 1.5 Gerar PDF
```http
GET /api/invoices/:id/pdf
Authorization: Bearer {token}
```

**Response:**
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="INV-2025-00456.pdf"

<PDF binary data>
```

**Template:**
- Company logo
- Invoice number, date
- Cliente info (nome, endereço, email)
- Line items table
- Subtotal, tax, total
- Payment terms
- Bank account info
- Footer (notes, terms & conditions)

---

## 📚 2. LEDGER APIs

### 2.1 Chart of Accounts

#### 2.1.1 Listar Contas (Hierárquico)
```http
GET /api/ledger/accounts?tipo=EXPENSE&ativo=true
Authorization: Bearer {token}
```

**Query Parameters:**
```typescript
interface ListAccountsParams {
  tipo?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'COGS'
  parentId?: number  // Filtrar por parent
  nivel?: 1 | 2 | 3 | 4
  ativo?: boolean
  aceitaLancamento?: boolean
}
```

**Response:**
```typescript
interface ListAccountsResponse {
  accounts: AccountHierarchy[]
}

interface AccountHierarchy {
  id: number
  codigo: string
  nome: string
  nomeCompleto: string
  tipo: Account_tipo
  natureza: 'DEBIT' | 'CREDIT'
  nivel: number
  aceitaLancamento: boolean
  ativo: boolean
  saldoAtual: number
  children?: AccountHierarchy[]  // Recursive
}
```

**Exemplo Response:**
```json
{
  "accounts": [
    {
      "id": 1,
      "codigo": "1",
      "nome": "Assets",
      "nomeCompleto": "Assets",
      "tipo": "ASSET",
      "natureza": "DEBIT",
      "nivel": 1,
      "aceitaLancamento": false,
      "ativo": true,
      "saldoAtual": 125000.00,
      "children": [
        {
          "id": 2,
          "codigo": "1.1",
          "nome": "Current Assets",
          "nomeCompleto": "Assets > Current Assets",
          "nivel": 2,
          "aceitaLancamento": false,
          "saldoAtual": 95000.00,
          "children": [
            {
              "id": 3,
              "codigo": "1.1.01",
              "nome": "Cash & Bank",
              "nivel": 3,
              "aceitaLancamento": false,
              "saldoAtual": 37000.00,
              "children": [
                {
                  "id": 4,
                  "codigo": "1.1.01.001",
                  "nome": "Chase Bank - Checking",
                  "nomeCompleto": "Assets > Current Assets > Cash & Bank > Chase Bank - Checking",
                  "nivel": 4,
                  "aceitaLancamento": true,
                  "saldoAtual": 25000.00
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

#### 2.1.2 Criar Conta
```http
POST /api/ledger/accounts
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface CreateAccountRequest {
  parentId?: number  // null = root level
  codigo: string  // "1.1.01.999"
  nome: string
  tipo: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'COGS'
  natureza: 'DEBIT' | 'CREDIT'
  aceitaLancamento: boolean
  centroCustoObrigatorio?: boolean
  projetoObrigatorio?: boolean
  bankAccountId?: number
}
```

**Validação:**
```typescript
const createAccountSchema = z.object({
  parentId: z.number().int().positive().optional(),
  codigo: z.string().regex(/^\d+(\.\d+){0,3}$/),  // 1 ou 1.1 ou 1.1.01 ou 1.1.01.001
  nome: z.string().min(1).max(200),
  tipo: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS']),
  natureza: z.enum(['DEBIT', 'CREDIT']),
  aceitaLancamento: z.boolean(),
  centroCustoObrigatorio: z.boolean().optional(),
  projetoObrigatorio: z.boolean().optional(),
  bankAccountId: z.number().int().positive().optional()
})
```

**Response:**
```typescript
interface CreateAccountResponse {
  id: number
  codigo: string
  nome: string
  nomeCompleto: string  // Gerado automaticamente
  nivel: number  // Calculado automaticamente
  caminho: string  // "/1/2/3/4" para drill-down
}
```

---

### 2.2 Ledger Transactions

#### 2.2.1 Criar Transaction Manual
```http
POST /api/ledger/transactions
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface CreateTransactionRequest {
  data: string  // ISO 8601
  descricao: string
  projetoId?: number
  clienteId?: number
  fornecedorId?: number
  centroCustoId?: number
  entries: {
    accountId: number
    debito: number
    credito: number
    projetoId?: number
    clienteId?: number
    fornecedorId?: number
    centroCustoId?: number
    descricao?: string
  }[]
}
```

**Validação:**
```typescript
const createTransactionSchema = z.object({
  data: z.string().datetime(),
  descricao: z.string().min(1).max(500),
  projetoId: z.number().int().positive().optional(),
  clienteId: z.number().int().positive().optional(),
  fornecedorId: z.number().int().positive().optional(),
  centroCustoId: z.number().int().positive().optional(),
  entries: z.array(z.object({
    accountId: z.number().int().positive(),
    debito: z.number().min(0),
    credito: z.number().min(0),
    projetoId: z.number().int().positive().optional(),
    clienteId: z.number().int().positive().optional(),
    fornecedorId: z.number().int().positive().optional(),
    centroCustoId: z.number().int().positive().optional(),
    descricao: z.string().max(500).optional()
  })).min(2)
}).refine(data => {
  // Validação: dupla entrada
  const totalDebito = data.entries.reduce((sum, e) => sum + e.debito, 0)
  const totalCredito = data.entries.reduce((sum, e) => sum + e.credito, 0)
  return Math.abs(totalDebito - totalCredito) < 0.01
}, { message: 'Transaction desbalanceada! Débito deve = Crédito' })
.refine(data => {
  // Validação: cada entry tem APENAS débito OU crédito (não ambos)
  return data.entries.every(e => 
    (e.debito > 0 && e.credito === 0) || (e.debito === 0 && e.credito > 0)
  )
}, { message: 'Entry deve ter APENAS débito OU crédito (não ambos)' })
```

**Response:**
```typescript
interface CreateTransactionResponse {
  id: number
  numeroTransacao: string  // "TRX-2025-000123"
  status: 'POSTED'
  totalDebito: number
  totalCredito: number
  entries: LedgerEntry[]
}
```

**RBAC:**
- ADMIN: ✅ Permitido
- FINANCEIRO: ✅ Permitido
- GERENTE: ❌ Negado (apenas via hooks automáticos)

---

#### 2.2.2 Listar Transactions
```http
GET /api/ledger/transactions?accountId=4&dataInicio=2025-01-01&page=1
Authorization: Bearer {token}
```

**Query Parameters:**
```typescript
interface ListTransactionsParams {
  accountId?: number
  origin?: LedgerTransaction_origin
  projetoId?: number
  clienteId?: number
  fornecedorId?: number
  centroCustoId?: number
  dataInicio?: string
  dataFim?: string
  status?: 'DRAFT' | 'POSTED' | 'REVERSED'
  page?: number
  limit?: number
}
```

---

#### 2.2.3 Reverter Transaction
```http
POST /api/ledger/transactions/:id/reverse
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface ReverseTransactionRequest {
  motivo: string
  dataReversao?: string  // Default: hoje
}
```

**Response:**
```typescript
interface ReverseTransactionResponse {
  originalId: number
  reversalId: number  // Nova transaction criada (entries invertidos)
  reversalTransaction: LedgerTransaction
}
```

**Lógica:**
- Nova transaction criada com entries invertidos (debit ↔ credit)
- Transaction original marcada: `revertida = true`, `revertidaEm = now()`
- Nova transaction: `reversaoDe = originalId`

---

## 💰 3. CENTRO DE CUSTO APIs

### 3.1 Listar (Hierárquico)
```http
GET /api/centros-custo?ativo=true
Authorization: Bearer {token}
```

**Response:**
```typescript
interface ListCentroCustoResponse {
  centros: CentroCustoHierarchy[]
}

interface CentroCustoHierarchy {
  id: number
  codigo: string
  nome: string
  nomeCompleto: string
  tipo: 'DEPARTAMENTO' | 'SUBDEPARTAMENTO' | 'PROJETO' | 'ATIVIDADE'
  nivel: number
  ativo: boolean
  permiteMovimentacao: boolean
  orcamentoAtivo: boolean
  children?: CentroCustoHierarchy[]
}
```

---

### 3.2 Criar Centro de Custo
```http
POST /api/centros-custo
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface CreateCentroCustoRequest {
  parentId?: number
  codigo: string  // "OPE-OBR-001"
  nome: string
  tipo: 'DEPARTAMENTO' | 'SUBDEPARTAMENTO' | 'PROJETO' | 'ATIVIDADE'
  projetoId?: number  // Se tipo = PROJETO
  responsavelId?: number
  ativo?: boolean
  permiteMovimentacao?: boolean
}
```

**Validação:**
```typescript
const createCentroCustoSchema = z.object({
  parentId: z.number().int().positive().optional(),
  codigo: z.string().regex(/^[A-Z]{3}(-[A-Z]{3})?(-\d{3})?$/),  // OPE ou OPE-OBR ou OPE-OBR-001
  nome: z.string().min(1).max(200),
  tipo: z.enum(['DEPARTAMENTO', 'SUBDEPARTAMENTO', 'PROJETO', 'ATIVIDADE']),
  projetoId: z.number().int().positive().optional(),
  responsavelId: z.number().int().positive().optional(),
  ativo: z.boolean().optional(),
  permiteMovimentacao: z.boolean().optional()
}).refine(data => {
  // Se tipo = PROJETO, projetoId é obrigatório
  if (data.tipo === 'PROJETO' && !data.projetoId) {
    return false
  }
  return true
}, { message: 'projetoId obrigatório para tipo PROJETO' })
```

---

## 📊 4. ORÇAMENTO APIs

### 4.1 Criar Orçamento
```http
POST /api/orcamentos
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface CreateOrcamentoRequest {
  nome: string
  descricao?: string
  projetoId?: number
  centroCustoId?: number
  tipo: 'PROJETO' | 'CENTRO_CUSTO' | 'PERIODO'
  periodo?: string  // "2025-Q1", "2025-01", etc.
  dataInicio: string
  dataFim: string
  valorLimite: number
  alertar80?: boolean
  alertar100?: boolean
  alertar110?: boolean
}
```

**Validação:**
```typescript
const createOrcamentoSchema = z.object({
  nome: z.string().min(1).max(200),
  descricao: z.string().max(1000).optional(),
  projetoId: z.number().int().positive().optional(),
  centroCustoId: z.number().int().positive().optional(),
  tipo: z.enum(['PROJETO', 'CENTRO_CUSTO', 'PERIODO']),
  periodo: z.string().max(50).optional(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  valorLimite: z.number().positive(),
  alertar80: z.boolean().optional(),
  alertar100: z.boolean().optional(),
  alertar110: z.boolean().optional()
}).refine(data => {
  // Pelo menos um de: projetoId, centroCustoId, periodo
  return data.projetoId || data.centroCustoId || data.periodo
}, { message: 'Deve ter projetoId, centroCustoId ou periodo' })
```

---

### 4.2 Listar Alertas do Orçamento
```http
GET /api/orcamentos/:id/alertas?lido=false
Authorization: Bearer {token}
```

**Response:**
```typescript
interface ListOrcamentoAlertasResponse {
  alertas: OrcamentoAlerta[]
}

interface OrcamentoAlerta {
  id: number
  tipo: 'PERCENTUAL_80' | 'PERCENTUAL_100' | 'PERCENTUAL_110'
  percentual: number
  valorGasto: number
  valorLimite: number
  disparadoEm: string
  lido: boolean
  lidoEm?: string
}
```

---

### 4.3 Marcar Alerta como Lido
```http
PUT /api/orcamentos/:id/alertas/:alertaId/ler
Authorization: Bearer {token}
```

**Response:**
```typescript
interface MarcarAlertaLidoResponse {
  id: number
  lido: true
  lidoEm: string
}
```

---

## 🏦 5. BANK ACCOUNTS & RECONCILIATION APIs

### 5.1 Criar Bank Account
```http
POST /api/bank-accounts
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface CreateBankAccountRequest {
  nome: string
  tipo: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT'
  banco: string
  agencia?: string
  conta: string
  routing?: string  // US routing number
  moeda?: string  // Default: "USD"
  saldoInicial: number
  accountId?: number  // Link to COA account
  principal?: boolean
}
```

---

### 5.2 Iniciar Reconciliação
```http
POST /api/reconciliations
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface StartReconciliationRequest {
  bankAccountId: number
  dataInicio: string
  dataFim: string
  saldoInicialBanco: number
  saldoFinalBanco: number
}
```

**Response:**
```typescript
interface StartReconciliationResponse {
  id: number
  numeroRec: string  // "REC-2025-00012"
  status: 'EM_ANDAMENTO'
  saldoInicialLivro: number  // Calculado automaticamente
  saldoFinalLivro: number  // Calculado
  diferenca: number  // saldoFinalBanco - saldoFinalLivro
}
```

---

### 5.3 Importar OFX/CSV
```http
POST /api/reconciliations/:id/import
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request:**
```typescript
FormData:
  file: <OFX ou CSV file>
  formato: 'OFX' | 'CSV'
```

**Response:**
```typescript
interface ImportBankStatementResponse {
  imported: number  // Quantidade de transactions importadas
  matched: number  // Quantidade auto-matched
  unmatched: number
  errors: string[]
}
```

**Lógica Auto-matching:**
- Match por data + valor (±$0.01)
- Match por referência/descrição (similarity > 80%)

---

### 5.4 Matching Manual
```http
PUT /api/reconciliations/:id/match
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface ManualMatchRequest {
  reconciliationItemId: number
  ledgerTransactionId: number
}
```

---

### 5.5 Concluir Reconciliação
```http
POST /api/reconciliations/:id/complete
Authorization: Bearer {token}
```

**Validação:**
- Todas as ReconciliationItems devem estar CONCILIADO ou AJUSTADO
- Diferença deve ser $0.00 ou justificada

**Response:**
```typescript
interface CompleteReconciliationResponse {
  id: number
  status: 'CONCILIADO'
  diferenca: number  // Deve ser 0
  completadoEm: string
}
```

---

## 💼 6. REEMBOLSOS APIs

### 6.1 Criar Reembolso
```http
POST /api/reembolsos
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface CreateReembolsoRequest {
  usuarioId: number
  projetoId?: number
  dataReembolso: string
  descricao: string
  centroCustoId?: number
  itens: {
    categoria: string  // "Combustível", "Alimentação", "Hospedagem", etc.
    valor: number
    dataGasto: string
    descricao: string
    recibo?: string  // URL do recibo (upload)
  }[]
}
```

**Validação:**
```typescript
const createReembolsoSchema = z.object({
  usuarioId: z.number().int().positive(),
  projetoId: z.number().int().positive().optional(),
  dataReembolso: z.string().datetime(),
  descricao: z.string().min(1).max(500),
  centroCustoId: z.number().int().positive().optional(),
  itens: z.array(z.object({
    categoria: z.string().min(1).max(100),
    valor: z.number().positive(),
    dataGasto: z.string().datetime(),
    descricao: z.string().min(1).max(500),
    recibo: z.string().url().optional()
  })).min(1)
})
```

---

### 6.2 Aprovar Reembolso
```http
PUT /api/reembolsos/:id/aprovar
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface AprovarReembolsoRequest {
  notas?: string
}
```

**RBAC:**
- ADMIN: ✅ Sempre
- GERENTE: ✅ Se for responsável do projeto/centro custo
- Outros: ❌

---

### 6.3 Marcar como Pago
```http
PUT /api/reembolsos/:id/pagar
Authorization: Bearer {token}
```

**Request Body:**
```typescript
interface PagarReembolsoRequest {
  bankAccountId: number
  dataPagamento: string
  referencia?: string  // Transfer ID, check number
}
```

**Hook Trigger:**
- ✅ onReembolsoPago() executado
- ✅ Ledger Transaction criada:
  - Debit: Expense account (categoria)
  - Credit: Bank account

---

## 📊 7. REPORTS APIs

### 7.1 Cash Flow
```http
GET /api/reports/cash-flow?periodo=mes&ano=2025&mes=1
Authorization: Bearer {token}
```

**Query Parameters:**
```typescript
interface CashFlowReportParams {
  periodo: 'dia' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'customizado'
  ano?: number
  mes?: number  // 1-12
  trimestre?: number  // 1-4
  dataInicio?: string  // Se periodo = customizado
  dataFim?: string
  projetoId?: number
  centroCustoId?: number
  bankAccountId?: number
}
```

**Response:**
```typescript
interface CashFlowReportResponse {
  periodo: string
  saldoInicial: number
  entradas: {
    data: string
    valor: number
    origem: string
  }[]
  saidas: {
    data: string
    valor: number
    origem: string
  }[]
  resumo: {
    totalEntradas: number
    totalSaidas: number
    saldoFinal: number
    variacao: number
  }
}
```

---

### 7.2 DRE (P&L) por Projeto
```http
GET /api/reports/dre?projetoId=123&periodo=2025-Q4
Authorization: Bearer {token}
```

**Response:**
```typescript
interface DREReportResponse {
  projetoId: number
  projetoNome: string
  periodo: string
  receita: {
    servicoReceita: number
    materialReceita: number
    outrasReceitas: number
    total: number
  }
  cogs: {
    materiais: number
    maoObra: number
    subcontratados: number
    equipamentos: number
    outrosCustosDiretos: number
    total: number
  }
  lucroBruto: number
  margemBruta: number  // %
  despesasOperacionais: {
    salarios: number
    veiculos: number
    ferramentas: number
    logistica: number
    outras: number
    total: number
  }
  lucroOperacional: number
  margemOperacional: number  // %
  despesasAdministrativas: number
  lucroLiquido: number
  margemLiquida: number  // %
}
```

---

### 7.3 Margem por Projeto (Budget vs Real)
```http
GET /api/reports/margem-projeto?projetoId=123
Authorization: Bearer {token}
```

**Response:**
```typescript
interface MargemProjetoReportResponse {
  projetoId: number
  projetoNome: string
  orcado: {
    receita: number
    cogs: { materiais: number, maoObra: number, subcontratados: number, equipamentos: number, total: number }
    lucroBruto: number
    margemBruta: number
    despesasOper: number
    lucroLiquido: number
    margemLiquida: number
  }
  real: {
    receita: number
    cogs: { materiais: number, maoObra: number, subcontratados: number, equipamentos: number, total: number }
    lucroBruto: number
    margemBruta: number
    despesasOper: number
    lucroLiquido: number
    margemLiquida: number
  }
  variancia: {
    receita: { valor: number, percentual: number }
    cogs: { valor: number, percentual: number }
    lucroBruto: { valor: number, percentual: number }
    margemBruta: number  // pp (percentage points)
    lucroLiquido: { valor: number, percentual: number }
    margemLiquida: number  // pp
    status: 'CRITICO' | 'ATENCAO' | 'OK' | 'EXCELENTE'
  }
}
```

---

### 7.4 Aging A/R
```http
GET /api/reports/aging-ar?dataReferencia=2025-01-13
Authorization: Bearer {token}
```

**Response:**
```typescript
interface AgingARReportResponse {
  dataReferencia: string
  summary: {
    '0-30': number
    '31-60': number
    '61-90': number
    '>90': number
    total: number
  }
  percentages: {
    '0-30': number
    '31-60': number
    '61-90': number
    '>90': number
  }
  detalhamento: {
    invoiceId: number
    numeroInvoice: string
    clienteId: number
    clienteNome: string
    dataEmissao: string
    dataVencimento: string
    diasAtraso: number
    bucket: '0-30' | '31-60' | '61-90' | '>90'
    saldo: number
    status: Invoice_status
  }[]
}
```

---

### 7.5 Cash Forecast
```http
GET /api/reports/cash-forecast?dias=90
Authorization: Bearer {token}
```

**Response:**
```typescript
interface CashForecastReportResponse {
  saldoInicial: number
  forecast: {
    data: string
    tipo: 'ENTRADA' | 'SAIDA'
    valor: number
    origem: string
    saldoProjetado: number
  }[]
  resumo: {
    dias30: { data: string, saldoProjetado: number }
    dias60: { data: string, saldoProjetado: number }
    dias90: { data: string, saldoProjetado: number }
  }
  alertas: {
    tipo: 'CRITICO' | 'ATENCAO'
    data: string
    saldoProjetado: number
    mensagem: string
  }[]
}
```

---

### 7.6 Budget vs Real (Hierárquico)
```http
GET /api/reports/budget-vs-real?centroCustoId=1&periodo=2025-Q1
Authorization: Bearer {token}
```

**Response:**
```typescript
interface BudgetVsRealReportResponse {
  centroCusto: CentroCusto
  orcado: number
  real: number
  variancia: number
  varianciaPercent: number
  status: 'CRITICO' | 'ATENCAO' | 'OK'
  breakdown: {
    categoria: string
    orcado: number
    real: number
    variancia: number
    varianciaPercent: number
  }[]
  drillDown?: BudgetVsRealReportResponse[]  // Children
}
```

---

## 🎯 8. DASHBOARDS APIs

### 8.1 CEO Dashboard
```http
GET /api/dashboards/ceo?periodo=mes
Authorization: Bearer {token}
```

**Response:**
```typescript
interface CEODashboardResponse {
  kpis: {
    receita: number
    lucroLiquido: number
    margem: number  // %
    cashFlow: number
    tendencias: {
      receita: number  // % change
      lucroLiquido: number
      margem: number  // pp
      cashFlow: number
    }
  }
  grafico12Meses: {
    mes: string
    receita: number
    lucroLiquido: number
  }[]
  topProjetos: {
    projetoId: number
    projetoNome: string
    lucroLiquido: number
    margem: number
  }[]
  agingAR: {
    '0-30': number
    '31-60': number
    '61-90': number
    '>90': number
    percentages: { '0-30': number, '31-60': number, '61-90': number, '>90': number }
  }
  alertasCriticos: {
    tipo: 'CASH_FLOW' | 'ORCAMENTO' | 'AR' | 'MARGEM'
    severidade: 'CRITICO' | 'ATENCAO'
    mensagem: string
    data?: string
  }[]
}
```

---

### 8.2 CFO Dashboard
```http
GET /api/dashboards/cfo
Authorization: Bearer {token}
```

**Response:**
```typescript
interface CFODashboardResponse {
  kpis: {
    cashAtual: number
    ar: number
    ap: number
    workingCapital: number
    tendencias: { cash: number, ar: number, ap: number, workingCapital: number }
  }
  cashFlowForecast: {
    data: string
    saldoProjetado: number
  }[]
  despesasPorCentroCusto: {
    centroCustoId: number
    centroCustoNome: string
    valor: number
    percentual: number
  }[]
  reconciliacoesPendentes: {
    bankAccountId: number
    bankAccountNome: string
    status: 'EM_ANDAMENTO' | 'PENDENTE' | 'DIVERGENCIA'
    diferenca?: number
  }[]
  agingAR: {
    cliente: string
    '0-30': number
    '31-60': number
    '61-90': number
    '>90': number
    total: number
  }[]
  alertas: Alert[]
}
```

---

### 8.3 Gerente Projeto Dashboard
```http
GET /api/dashboards/gerente?projetoId=123
Authorization: Bearer {token}
```

**Response:**
```typescript
interface GerenteProjetoDashboardResponse {
  projeto: {
    id: number
    nome: string
    status: string
  }
  kpis: {
    custoReal: number
    custoOrcado: number
    variancia: number
    margemAtual: number
    margemTarget: number
  }
  breakdown: {
    materiais: { orcado: number, real: number, variancia: number }
    maoObra: { orcado: number, real: number, variancia: number }
    subcontratados: { orcado: number, real: number, variancia: number }
    equipamentos: { orcado: number, real: number, variancia: number }
  }
  materiaisTopUtilizados: {
    materialId: number
    materialNome: string
    quantidade: number
    custoTotal: number
    variancia: number
  }[]
  maoObra: {
    horasTrabalhadas: number
    custoTotal: number
    custoPorHora: number
    breakdown: {
      funcao: string
      horas: number
      custo: number
    }[]
  }
  subcontratados: {
    fornecedorNome: string
    servico: string
    valor: number
    variancia: number
  }[]
  alertas: Alert[]
}
```

---

## 🚨 9. ERROR HANDLING

### Error Response Format
```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
  }
}
```

### Error Codes
```typescript
enum ErrorCode {
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Business Logic
  TRANSACTION_UNBALANCED = 'TRANSACTION_UNBALANCED',
  ORCAMENTO_EXCEDIDO = 'ORCAMENTO_EXCEDIDO',
  INVOICE_ALREADY_PAID = 'INVOICE_ALREADY_PAID',
  PAYMENT_EXCEEDS_BALANCE = 'PAYMENT_EXCEEDS_BALANCE',
  
  // Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Not Found
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INVOICE_NOT_FOUND = 'INVOICE_NOT_FOUND',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  
  // Server
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}
```

### HTTP Status Codes
- **200** OK - Success
- **201** Created - Resource created
- **400** Bad Request - Validation error
- **401** Unauthorized - Not authenticated
- **403** Forbidden - Not authorized
- **404** Not Found - Resource not found
- **422** Unprocessable Entity - Business logic error
- **500** Internal Server Error - Server error

---

## 🔐 10. RBAC MATRIX

| Endpoint                    | ADMIN | FINANCEIRO | GERENTE | VENDEDOR | USUARIO |
|-----------------------------|-------|------------|---------|----------|---------|
| **INVOICES**                |       |            |         |          |         |
| POST /api/invoices          | ✅    | ✅         | ✅ Own  | ❌       | ❌      |
| GET /api/invoices           | ✅    | ✅         | ✅ Own  | ❌       | ❌      |
| POST /api/invoices/:id/send | ✅    | ✅         | ✅ Own  | ❌       | ❌      |
| POST /api/invoices/:id/payments | ✅ | ✅        | ❌       | ❌       | ❌      |
| **LEDGER**                  |       |            |         |          |         |
| GET /api/ledger/accounts    | ✅    | ✅         | ✅ Read | ❌       | ❌      |
| POST /api/ledger/accounts   | ✅    | ✅         | ❌       | ❌       | ❌      |
| POST /api/ledger/transactions | ✅  | ✅         | ❌       | ❌       | ❌      |
| **CENTRO CUSTO**            |       |            |         |          |         |
| GET /api/centros-custo      | ✅    | ✅         | ✅      | ❌       | ❌      |
| POST /api/centros-custo     | ✅    | ✅         | ❌       | ❌       | ❌      |
| **ORCAMENTO**               |       |            |         |          |         |
| POST /api/orcamentos        | ✅    | ✅         | ✅ Own  | ❌       | ❌      |
| GET /api/orcamentos         | ✅    | ✅         | ✅ Own  | ❌       | ❌      |
| **REEMBOLSOS**              |       |            |         |          |         |
| POST /api/reembolsos        | ✅    | ✅         | ✅      | ✅       | ✅      |
| PUT /api/reembolsos/:id/aprovar | ✅ | ✅        | ✅ Own  | ❌       | ❌      |
| PUT /api/reembolsos/:id/pagar | ✅  | ✅         | ❌       | ❌       | ❌      |
| **REPORTS**                 |       |            |         |          |         |
| GET /api/reports/*          | ✅    | ✅         | ✅ Own  | ❌       | ❌      |
| **DASHBOARDS**              |       |            |         |          |         |
| GET /api/dashboards/ceo     | ✅    | ❌         | ❌       | ❌       | ❌      |
| GET /api/dashboards/cfo     | ✅    | ✅         | ❌       | ❌       | ❌      |
| GET /api/dashboards/gerente | ✅    | ✅         | ✅ Own  | ❌       | ❌      |

**Legenda:**
- ✅ Full access
- ✅ Own = Acesso apenas aos próprios recursos (projetos, reembolsos)
- ✅ Read = Apenas leitura
- ❌ Denied

---

## ✅ CHECKLIST APIs

### Backend
- [ ] ⏳ 50+ endpoints implementados
- [ ] ⏳ Validações Zod todas APIs
- [ ] ⏳ RBAC middleware aplicado
- [ ] ⏳ Error handling padronizado
- [ ] ⏳ Logging estruturado

### Documentação
- [ ] ⏳ Swagger/OpenAPI spec gerado
- [ ] ⏳ Postman collection exportado
- [ ] ⏳ README com exemplos

### Testes
- [ ] ⏳ Unit: validações Zod
- [ ] ⏳ Integration: fluxos completos
- [ ] ⏳ E2E: cenários reais

---

**Status:** ✅ Especificação completa de APIs  
**Total Endpoints:** ~50 APIs documentadas  
**Próximo:** FINANCEIRO-RESUMO-FINAL.md (consolidação de tudo!)
