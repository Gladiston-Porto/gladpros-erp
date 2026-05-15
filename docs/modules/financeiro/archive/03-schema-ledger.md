# 📒 LEDGER & ACCOUNTING - SCHEMA PRISMA COMPLETO

**Módulo:** Financeiro Core (Dupla Entrada)  
**Status:** Especificação técnica completa  
**Semana:** 1-2 (Fundamentos + Integrações)

---

## 🎯 OBJETIVOS

Sistema completo de contabilidade com dupla entrada (double-entry bookkeeping):
- ✅ Ledger completo (transactions + entries)
- ✅ Plano de Contas hierárquico (Chart of Accounts)
- ✅ Centro de Custo hierárquico (Opção C)
- ✅ Orçamento por projeto/centro custo
- ✅ Contas bancárias
- ✅ Auditoria completa

---

## 📐 MODELS PRISMA

### 1. Account (Plano de Contas - COA)

```prisma
model Account {
  id              Int      @id @default(autoincrement())
  codigo          String   @unique @db.VarChar(20)  // "1.1.01.001"
  nome            String   @db.VarChar(200)         // "Bank - Chase Checking"
  nomeCompleto    String   @db.VarChar(500)         // "Assets > Current Assets > Bank - Chase"
  
  // Hierarquia
  parentId        Int?
  nivel           Int      @default(1)  // 1=Categoria, 2=Subcategoria, 3=Conta, 4=Subconta
  caminho         String   @db.VarChar(500)  // "1,3,15" (IDs dos pais)
  
  // Tipo
  tipo            Account_tipo
  natureza        Account_natureza  // DEBIT ou CREDIT
  
  // Descrição
  descricao       String?  @db.Text
  
  // Controle
  aceitaLancamento Boolean @default(true)  // False para contas "pai"
  ativo           Boolean  @default(true)
  
  // Configurações específicas
  // Para Revenue/Expense accounts
  centroCustoObrigatorio Boolean @default(false)
  projetoObrigatorio     Boolean @default(false)
  
  // Para bank accounts
  bankAccountId   Int?     @unique  // Link para conta bancária física
  
  // Integração
  codigoExterno   String?  @db.VarChar(50)  // Para integração futura (QuickBooks, etc)
  
  // Saldos (cache - calculado)
  saldoDebito     Decimal  @default(0) @db.Decimal(15,2)
  saldoCredito    Decimal  @default(0) @db.Decimal(15,2)
  saldoAtual      Decimal  @default(0) @db.Decimal(15,2)  // saldoDebito - saldoCredito
  ultimaMovimentacao DateTime?
  
  // Auditoria
  criadoPor       Int
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
  
  // Relações
  parent          Account?  @relation("AccountHierarchy", fields: [parentId], references: [id])
  children        Account[] @relation("AccountHierarchy")
  criador         Usuario   @relation(fields: [criadoPor], references: [id])
  bankAccount     BankAccount? @relation(fields: [bankAccountId], references: [id])
  
  ledgerEntries   LedgerEntry[]
  
  @@index([parentId])
  @@index([tipo])
  @@index([natureza])
  @@index([ativo])
  @@index([codigo])
  @@map("accounts")
}

enum Account_tipo {
  ASSET            // Ativo (1.x.x)
  LIABILITY        // Passivo (2.x.x)
  EQUITY           // Patrimônio Líquido (3.x.x)
  REVENUE          // Receita (4.x.x)
  EXPENSE          // Despesa (5.x.x)
  COGS             // Custo dos Produtos Vendidos (6.x.x)
}

enum Account_natureza {
  DEBIT   // Natureza devedora (aumenta com débito)
  CREDIT  // Natureza credora (aumenta com crédito)
}
```

**Hierarquia COA Texas:**
```
1. ASSETS (Ativos)
  1.1 Current Assets (Circulante)
    1.1.01 Cash & Bank (Caixa e Bancos)
      1.1.01.001 Chase Checking
      1.1.01.002 Wells Fargo Savings
    1.1.02 Accounts Receivable (A/R)
      1.1.02.001 A/R - Construction
      1.1.02.002 A/R - Maintenance
    1.1.03 Inventory (Estoque)
      1.1.03.001 Materials Inventory
      1.1.03.002 Equipment Inventory
  1.2 Fixed Assets (Não Circulante)
    1.2.01 Property & Equipment
      1.2.01.001 Vehicles
      1.2.01.002 Tools & Machinery
      1.2.01.003 Office Equipment
    1.2.02 Accumulated Depreciation
      1.2.02.001 Vehicles Depreciation
      1.2.02.002 Tools Depreciation

2. LIABILITIES (Passivos)
  2.1 Current Liabilities (Circulante)
    2.1.01 Accounts Payable (A/P)
      2.1.01.001 A/P - Suppliers
      2.1.01.002 A/P - Utilities
    2.1.02 Tax Liabilities (Impostos a Pagar)
      2.1.02.001 Sales Tax Payable (Texas)
      2.1.02.002 Payroll Tax Payable
    2.1.03 Accrued Expenses
      2.1.03.001 Salaries Payable
      2.1.03.002 Benefits Payable
  2.2 Long-term Liabilities (Não Circulante)
    2.2.01 Loans
      2.2.01.001 Bank Loan - Vehicle
      2.2.01.002 Equipment Financing

3. EQUITY (Patrimônio Líquido)
  3.1 Owner's Equity
    3.1.01 Capital
    3.1.02 Retained Earnings
    3.1.03 Current Year Profit/Loss

4. REVENUE (Receitas)
  4.1 Service Revenue
    4.1.01 Construction Services
    4.1.02 Maintenance Services
    4.1.03 Consulting Services
  4.2 Material Sales
    4.2.01 Material Markup Revenue
  4.3 Other Revenue
    4.3.01 Equipment Rental

6. COGS (Custo dos Produtos/Serviços)
  6.1 Materials COGS
    6.1.01 Construction Materials
    6.1.02 Maintenance Materials
  6.2 Labor COGS
    6.2.01 Direct Labor - Construction
    6.2.02 Direct Labor - Maintenance
  6.3 Subcontractor COGS
    6.3.01 Third-party Services

5. EXPENSES (Despesas Operacionais)
  5.1 Operacional (por Centro de Custo)
    5.1.01 Salaries - Operations
    5.1.02 Vehicle Expenses
    5.1.03 Fuel & Logistics
  5.2 Administrativo
    5.2.01 Salaries - Admin
    5.2.02 Office Rent
    5.2.03 Office Supplies
    5.2.04 IT & Software
  5.3 Comercial
    5.3.01 Salaries - Sales
    5.3.02 Marketing
    5.3.03 Advertising
```

---

### 2. LedgerTransaction (Cabeçalho da Transação)

```prisma
model LedgerTransaction {
  id              Int      @id @default(autoincrement())
  numeroTransacao String   @unique @db.VarChar(50)  // "TRX-2025-00001"
  
  // Data
  data            DateTime
  
  // Origem (rastreabilidade)
  origin          LedgerTransaction_origin
  originId        Int?     // ID do registro origem (invoice_id, payment_id, etc)
  originTable     String?  @db.VarChar(50)  // "invoices", "invoice_payments", etc
  
  // Descrição
  descricao       String   @db.VarChar(500)
  observacoes     String?  @db.Text
  
  // Contexto (opcional)
  projetoId       Int?
  clienteId       Int?
  fornecedorId    Int?
  centroCustoId   Int?
  
  // Valores (calculado - soma das entries)
  totalDebito     Decimal  @db.Decimal(15,2)
  totalCredito    Decimal  @db.Decimal(15,2)
  
  // Status
  status          LedgerTransaction_status @default(POSTED)
  
  // Reversão (para correções)
  revertida       Boolean  @default(false)
  revertidaEm     DateTime?
  revertidaPor    Int?
  reversaoDe      Int?     // ID da transaction original
  
  // Conciliação
  conciliada      Boolean  @default(false)
  reconciliationId Int?
  
  // Auditoria
  criadoPor       Int
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
  
  // Relações
  entries         LedgerEntry[]
  projeto         Projeto?      @relation(fields: [projetoId], references: [id])
  cliente         Cliente?      @relation(fields: [clienteId], references: [id])
  centroCusto     CentroCusto?  @relation(fields: [centroCustoId], references: [id])
  criador         Usuario       @relation("LedgerCreator", fields: [criadoPor], references: [id])
  revertedor      Usuario?      @relation("LedgerReverter", fields: [revertidaPor], references: [id])
  transacaoOriginal LedgerTransaction? @relation("Reversal", fields: [reversaoDe], references: [id])
  reversal        LedgerTransaction?  @relation("Reversal")
  reconciliation  BankReconciliation? @relation(fields: [reconciliationId], references: [id])
  
  // Vínculos inversos
  invoices        Invoice[]
  invoicePayments InvoicePayment[]
  
  @@index([data])
  @@index([origin])
  @@index([projetoId])
  @@index([clienteId])
  @@index([centroCustoId])
  @@index([status])
  @@index([revertida])
  @@index([conciliada])
  @@map("ledger_transactions")
}

enum LedgerTransaction_origin {
  MANUAL              // Lançamento manual
  INVOICE_SENT        // Invoice enviada (A/R + Revenue)
  INVOICE_PAYMENT     // Pagamento recebido (Bank + A/R)
  COMPRA_RECEBIDA     // Compra recebida (Inventory + A/P)
  ESTOQUE_SAIDA       // Saída estoque (COGS + Inventory)
  FOLHA_PAGAMENTO     // Folha de pagamento
  REEMBOLSO           // Reembolso aprovado
  BANK_TRANSFER       // Transferência entre contas
  DEPRECIATION        // Depreciação
  ADJUSTMENT          // Ajuste contábil
  OPENING_BALANCE     // Saldo inicial
}

enum LedgerTransaction_status {
  DRAFT       // Rascunho
  POSTED      // Lançado (default)
  REVERSED    // Revertido
}
```

**Validação Dupla Entrada:**
```typescript
// totalDebito SEMPRE === totalCredito
await prisma.$executeRaw`
  ALTER TABLE ledger_transactions
  ADD CONSTRAINT chk_balanced 
  CHECK (total_debito = total_credito)
`
```

---

### 3. LedgerEntry (Lançamentos - Débito/Crédito)

```prisma
model LedgerEntry {
  id              Int      @id @default(autoincrement())
  transactionId   Int
  
  // Conta
  accountId       Int
  
  // Valores (um dos dois sempre é zero)
  debito          Decimal  @db.Decimal(15,2)
  credito         Decimal  @db.Decimal(15,2)
  
  // Contexto adicional (dimensões analíticas)
  projetoId       Int?
  clienteId       Int?
  fornecedorId    Int?
  centroCustoId   Int?
  
  // Descrição específica desta entry
  descricao       String?  @db.VarChar(500)
  
  // Auditoria
  criadoEm        DateTime @default(now())
  
  // Relações
  transaction     LedgerTransaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  account         Account           @relation(fields: [accountId], references: [id])
  projeto         Projeto?          @relation(fields: [projetoId], references: [id])
  cliente         Cliente?          @relation(fields: [clienteId], references: [id])
  centroCusto     CentroCusto?      @relation(fields: [centroCustoId], references: [id])
  
  @@index([transactionId])
  @@index([accountId])
  @@index([projetoId])
  @@index([clienteId])
  @@index([centroCustoId])
  @@map("ledger_entries")
}
```

**Constraint:**
```sql
ALTER TABLE ledger_entries
ADD CONSTRAINT chk_debit_or_credit 
CHECK (
  (debito > 0 AND credito = 0) OR 
  (debito = 0 AND credito > 0)
)
```

---

### 4. CentroCusto (Hierárquico - Opção C)

```prisma
model CentroCusto {
  id              Int      @id @default(autoincrement())
  codigo          String   @unique @db.VarChar(20)  // "OPE-001", "ADM-RH-001"
  nome            String   @db.VarChar(200)
  nomeCompleto    String   @db.VarChar(500)  // "Operacional > Obras Residenciais > Casa Austin"
  descricao       String?  @db.Text
  
  // Hierarquia
  parentId        Int?
  nivel           Int      @default(1)  // 1=Dept, 2=Sub, 3=Projeto, 4=Atividade
  caminho         String   @db.VarChar(500)  // "1,5,23" (IDs dos pais)
  ordem           Int      @default(0)  // Para ordenação customizada
  
  // Tipo
  tipo            CentroCusto_tipo
  
  // Controle
  ativo           Boolean  @default(true)
  permiteMovimentacao Boolean @default(true)  // False para níveis 1-2 (apenas consolidação)
  
  // Orçamento
  orcamentoAtivo  Boolean  @default(false)
  
  // Vinculação
  projetoId       Int?     @unique  // Se tipo=PROJETO, link com tabela Projeto
  
  // Responsável
  responsavelId   Int?
  
  // Auditoria
  criadoPor       Int
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
  
  // Relações
  parent          CentroCusto?  @relation("CentroCustoHierarchy", fields: [parentId], references: [id])
  children        CentroCusto[] @relation("CentroCustoHierarchy")
  criador         Usuario       @relation("CentroCustoCreator", fields: [criadoPor], references: [id])
  responsavel     Usuario?      @relation("CentroCustoResponsavel", fields: [responsavelId], references: [id])
  projeto         Projeto?      @relation(fields: [projetoId], references: [id])
  
  projetoMateriais   ProjetoMaterial[]
  ledgerTransactions LedgerTransaction[]
  ledgerEntries      LedgerEntry[]
  orcamentos         Orcamento[]
  
  @@index([parentId])
  @@index([tipo])
  @@index([ativo])
  @@index([projetoId])
  @@index([responsavelId])
  @@map("centros_custo")
}

enum CentroCusto_tipo {
  DEPARTAMENTO      // Nível 1: Operacional, Administrativo, Comercial
  SUBDEPARTAMENTO   // Nível 2: Obras, RH, Marketing
  PROJETO           // Nível 3: Obra específica, Campanha específica
  ATIVIDADE         // Nível 4: Task específica (futuro)
}
```

**Exemplo Seed (Estrutura GladPros):**
```typescript
const centrosCustoSeed = [
  // Nível 1 - Departamentos
  { id: 1, codigo: "OPE", nome: "OPERACIONAL", tipo: "DEPARTAMENTO", nivel: 1 },
  { id: 2, codigo: "ADM", nome: "ADMINISTRATIVO", tipo: "DEPARTAMENTO", nivel: 1 },
  { id: 3, codigo: "COM", nome: "COMERCIAL", tipo: "DEPARTAMENTO", nivel: 1 },
  
  // Nível 2 - Subdepartamentos (Operacional)
  { id: 10, codigo: "OPE-OBR", nome: "Obras Residenciais", tipo: "SUBDEPARTAMENTO", 
    nivel: 2, parentId: 1 },
  { id: 11, codigo: "OPE-OBC", nome: "Obras Comerciais", tipo: "SUBDEPARTAMENTO", 
    nivel: 2, parentId: 1 },
  { id: 12, codigo: "OPE-MAN", nome: "Manutenção", tipo: "SUBDEPARTAMENTO", 
    nivel: 2, parentId: 1 },
  
  // Nível 2 - Subdepartamentos (Administrativo)
  { id: 20, codigo: "ADM-RH", nome: "Recursos Humanos", tipo: "SUBDEPARTAMENTO", 
    nivel: 2, parentId: 2 },
  { id: 21, codigo: "ADM-TI", nome: "Tecnologia da Informação", tipo: "SUBDEPARTAMENTO", 
    nivel: 2, parentId: 2 },
  { id: 22, codigo: "ADM-FAC", nome: "Facilities", tipo: "SUBDEPARTAMENTO", 
    nivel: 2, parentId: 2 },
  
  // Nível 2 - Subdepartamentos (Comercial)
  { id: 30, codigo: "COM-MKT", nome: "Marketing", tipo: "SUBDEPARTAMENTO", 
    nivel: 2, parentId: 3 },
  { id: 31, codigo: "COM-VEN", nome: "Vendas", tipo: "SUBDEPARTAMENTO", 
    nivel: 2, parentId: 3 },
  
  // Nível 3 - Projetos (exemplo)
  { id: 100, codigo: "OPE-OBR-001", nome: "Casa Austin - 123 Oak St", 
    tipo: "PROJETO", nivel: 3, parentId: 10, projetoId: 1 },
  { id: 101, codigo: "OPE-OBR-002", nome: "Casa Houston - 456 Pine Ave", 
    tipo: "PROJETO", nivel: 3, parentId: 10, projetoId: 2 },
]
```

---

### 5. Orcamento (Budget com Alertas)

```prisma
model Orcamento {
  id              Int      @id @default(autoincrement())
  nome            String   @db.VarChar(200)  // "Orçamento Q4 2025 - Operacional"
  descricao       String?  @db.Text
  
  // Escopo
  projetoId       Int?
  centroCustoId   Int?
  tipo            Orcamento_tipo
  
  // Período
  periodo         String   @db.VarChar(20)  // "2025-Q4", "2025-10", "2025"
  dataInicio      DateTime
  dataFim         DateTime
  
  // Valores
  valorLimite     Decimal  @db.Decimal(15,2)
  valorGasto      Decimal  @default(0) @db.Decimal(15,2)  // Calculado
  percentualGasto Decimal  @default(0) @db.Decimal(5,2)   // Calculado
  
  // Alertas
  alertar80       Boolean  @default(true)   // ⚠️ 80% atingido
  alertar100      Boolean  @default(true)   // 🔴 100% atingido
  alertar110      Boolean  @default(true)   // 🚨 110% estourou
  alertado80      Boolean  @default(false)  // Flag já enviado
  alertado100     Boolean  @default(false)
  alertado110     Boolean  @default(false)
  
  // Status
  status          Orcamento_status @default(ATIVO)
  
  // Observações
  observacoes     String?  @db.Text
  
  // Auditoria
  criadoPor       Int
  aprovadoPor     Int?
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
  aprovadoEm      DateTime?
  
  // Relações
  projeto         Projeto?      @relation(fields: [projetoId], references: [id])
  centroCusto     CentroCusto?  @relation(fields: [centroCustoId], references: [id])
  criador         Usuario       @relation("OrcamentoCriador", fields: [criadoPor], references: [id])
  aprovador       Usuario?      @relation("OrcamentoAprovador", fields: [aprovadoPor], references: [id])
  
  alertas         OrcamentoAlerta[]
  
  @@index([projetoId])
  @@index([centroCustoId])
  @@index([status])
  @@index([periodo])
  @@map("orcamentos")
}

enum Orcamento_tipo {
  PROJETO         // Orçamento específico de um projeto
  CENTRO_CUSTO    // Orçamento de um centro de custo
  PERIODO         // Orçamento mensal/trimestral geral
}

enum Orcamento_status {
  ATIVO       // Ativo, sendo monitorado
  EXCEDIDO    // Limite excedido (>100%)
  CONCLUIDO   // Período encerrado
  CANCELADO   // Cancelado
}

model OrcamentoAlerta {
  id           Int      @id @default(autoincrement())
  orcamentoId  Int
  
  // Tipo do alerta
  tipo         OrcamentoAlerta_tipo
  percentual   Decimal  @db.Decimal(5,2)  // 80, 100, 110
  valorGasto   Decimal  @db.Decimal(15,2)
  valorLimite  Decimal  @db.Decimal(15,2)
  
  // Notificação
  disparadoEm  DateTime @default(now())
  lido         Boolean  @default(false)
  lidoEm       DateTime?
  lidoPor      Int?
  
  // Ação tomada
  acao         String?  @db.Text
  
  // Relações
  orcamento    Orcamento @relation(fields: [orcamentoId], references: [id], onDelete: Cascade)
  leitor       Usuario?  @relation(fields: [lidoPor], references: [id])
  
  @@index([orcamentoId])
  @@index([lido])
  @@index([disparadoEm])
  @@map("orcamento_alertas")
}

enum OrcamentoAlerta_tipo {
  PERCENTUAL_80   // ⚠️ Atingiu 80%
  PERCENTUAL_100  // 🔴 Atingiu 100%
  PERCENTUAL_110  // 🚨 Estourou 110%
}
```

**Job Automático:**
```typescript
// Rodar a cada 15 minutos ou em cada lançamento
async function atualizarOrcamentos() {
  const orcamentosAtivos = await prisma.orcamento.findMany({
    where: { status: 'ATIVO' }
  })
  
  for (const orc of orcamentosAtivos) {
    // Calcular gasto real do período
    const gastoReal = await calcularGastoOrcamento(orc)
    
    const percentual = (gastoReal / orc.valorLimite) * 100
    
    // Atualizar
    await orc.update({
      valorGasto: gastoReal,
      percentualGasto: percentual,
      status: percentual > 100 ? 'EXCEDIDO' : 'ATIVO'
    })
    
    // Alertas
    if (percentual >= 110 && orc.alertar110 && !orc.alertado110) {
      await criarAlerta(orc, 'PERCENTUAL_110', 110, gastoReal)
      await orc.update({ alertado110: true })
    } else if (percentual >= 100 && orc.alertar100 && !orc.alertado100) {
      await criarAlerta(orc, 'PERCENTUAL_100', 100, gastoReal)
      await orc.update({ alertado100: true })
    } else if (percentual >= 80 && orc.alertar80 && !orc.alertado80) {
      await criarAlerta(orc, 'PERCENTUAL_80', 80, gastoReal)
      await orc.update({ alertado80: true })
    }
  }
}
```

---

### 6. BankAccount (Contas Bancárias)

```prisma
model BankAccount {
  id              Int      @id @default(autoincrement())
  nome            String   @db.VarChar(200)  // "Chase Business Checking"
  tipo            BankAccount_tipo
  
  // Banco
  banco           String   @db.VarChar(200)  // "Chase Bank"
  agencia         String?  @db.VarChar(50)
  conta           String   @db.VarChar(50)
  swift           String?  @db.VarChar(20)
  routing         String?  @db.VarChar(20)   // Routing number (US)
  
  // Moeda
  moeda           String   @default("USD") @db.VarChar(3)
  
  // Saldo
  saldoInicial    Decimal  @db.Decimal(15,2)
  saldoAtual      Decimal  @db.Decimal(15,2)  // Calculado
  dataUltimoSaldo DateTime?
  
  // Limite
  limiteChequeEspecial Decimal? @db.Decimal(15,2)
  
  // Integração
  accountId       Int?     @unique  // Link para Account no COA
  
  // Status
  ativo           Boolean  @default(true)
  principal       Boolean  @default(false)  // Conta principal
  
  // Observações
  observacoes     String?  @db.Text
  
  // Auditoria
  criadoPor       Int
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
  
  // Relações
  criador         Usuario   @relation(fields: [criadoPor], references: [id])
  account         Account?  @relation
  
  invoicePayments InvoicePayment[]
  reconciliations BankReconciliation[]
  
  @@index([ativo])
  @@index([principal])
  @@map("bank_accounts")
}

enum BankAccount_tipo {
  CHECKING    // Conta corrente
  SAVINGS     // Poupança
  CREDIT      // Cartão crédito
  INVESTMENT  // Investimento
  OTHER       // Outro
}
```

---

### 7. BankReconciliation (Conciliação Bancária - Fase 4)

```prisma
model BankReconciliation {
  id              Int      @id @default(autoincrement())
  numeroRec       String   @unique @db.VarChar(50)  // "REC-2025-001"
  bankAccountId   Int
  
  // Período
  dataInicio      DateTime
  dataFim         DateTime
  
  // Saldos
  saldoInicialLivro  Decimal @db.Decimal(15,2)  // Saldo no sistema (ledger)
  saldoFinalLivro    Decimal @db.Decimal(15,2)
  saldoInicialBanco  Decimal @db.Decimal(15,2)  // Saldo no extrato
  saldoFinalBanco    Decimal @db.Decimal(15,2)
  diferenca          Decimal @db.Decimal(15,2)  // saldoFinalBanco - saldoFinalLivro
  
  // Status
  status          BankReconciliation_status @default(EM_ANDAMENTO)
  
  // Observações
  observacoes     String?  @db.Text
  
  // Auditoria
  criadoPor       Int
  aprovadoPor     Int?
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
  concluidaEm     DateTime?
  
  // Relações
  bankAccount     BankAccount @relation(fields: [bankAccountId], references: [id])
  criador         Usuario     @relation("ReconciliationCreator", fields: [criadoPor], references: [id])
  aprovador       Usuario?    @relation("ReconciliationApprover", fields: [aprovadoPor], references: [id])
  
  itens           ReconciliationItem[]
  transactions    LedgerTransaction[]
  
  @@index([bankAccountId])
  @@index([status])
  @@index([dataInicio])
  @@map("bank_reconciliations")
}

enum BankReconciliation_status {
  EM_ANDAMENTO  // Em processo de conciliação
  CONCILIADO    // Conciliado (diferença = 0)
  DIVERGENCIA   // Com divergências não resolvidas
  CANCELADO     // Cancelado
}

model ReconciliationItem {
  id                  Int      @id @default(autoincrement())
  reconciliationId    Int
  
  // Transação
  dataTransacao       DateTime
  descricao           String   @db.VarChar(500)
  referencia          String?  @db.VarChar(200)  // Número cheque, etc
  
  // Valores
  valorBanco          Decimal  @db.Decimal(15,2)  // Valor no extrato
  valorLivro          Decimal? @db.Decimal(15,2)  // Valor no sistema
  diferenca           Decimal? @db.Decimal(15,2)
  
  // Match
  ledgerTransactionId Int?
  status              ReconciliationItem_status @default(PENDENTE)
  
  // Observações
  observacoes         String?  @db.Text
  
  // Auditoria
  criadoEm            DateTime @default(now())
  atualizadoEm        DateTime @updatedAt
  conciliadoPor       Int?
  conciliadoEm        DateTime?
  
  // Relações
  reconciliation      BankReconciliation @relation(fields: [reconciliationId], references: [id], onDelete: Cascade)
  ledgerTransaction   LedgerTransaction? @relation(fields: [ledgerTransactionId], references: [id])
  conciliador         Usuario?           @relation(fields: [conciliadoPor], references: [id])
  
  @@index([reconciliationId])
  @@index([ledgerTransactionId])
  @@index([status])
  @@map("reconciliation_items")
}

enum ReconciliationItem_status {
  PENDENTE      // Aguardando match
  CONCILIADO    // Match encontrado
  DIVERGENTE    // Divergência identificada
  AJUSTADO      // Ajuste contábil criado
}
```

---

## 🔗 INTEGRAÇÕES & HOOKS

### Hook 1: Estoque Saída → COGS

```typescript
// Trigger: Movimentacao tipo=SAIDA com projetoId
async function onEstoqueSaida(mov: Movimentacao) {
  if (mov.tipo !== 'SAIDA' || !mov.projetoId) return
  
  const material = await getMaterial(mov.materialId)
  const custoUnitario = material.custoMedio || material.ultimoCusto || 0
  const custoTotal = mov.quantidade * custoUnitario
  
  // Buscar contas
  const cogsMaterialAccount = await getAccountByCodigo('6.1.01')  // COGS - Materials
  const inventoryAccount = await getAccountByCodigo('1.1.03.001') // Inventory
  
  // Buscar centro de custo do projeto
  const projeto = await getProjeto(mov.projetoId)
  const centroCusto = await getCentroCustoPorProjeto(projeto.id)
  
  // Criar transaction
  await criarLedgerTransaction({
    origin: 'ESTOQUE_SAIDA',
    originId: mov.id,
    originTable: 'movimentacoes',
    data: mov.dataMovimentacao,
    descricao: `COGS - ${material.nome} (${mov.quantidade} ${material.unidade})`,
    projetoId: mov.projetoId,
    centroCustoId: centroCusto?.id,
    entries: [
      {
        accountId: cogsMaterialAccount.id,
        debito: custoTotal,
        credito: 0,
        projetoId: mov.projetoId,
        centroCustoId: centroCusto?.id,
        descricao: `${material.codigo} - ${material.nome}`
      },
      {
        accountId: inventoryAccount.id,
        debito: 0,
        credito: custoTotal,
        descricao: `Saída estoque - ${material.codigo}`
      }
    ]
  })
}
```

### Hook 2: Compra Recebida → Inventory

```typescript
// Trigger: Compra status=RECEBIDA
async function onCompraRecebida(compra: Compra) {
  if (compra.status !== 'RECEBIDA') return
  
  const inventoryAccount = await getAccountByCodigo('1.1.03.001')
  const apAccount = await getAccountByCodigo('2.1.01.001')  // A/P Suppliers
  
  await criarLedgerTransaction({
    origin: 'COMPRA_RECEBIDA',
    originId: compra.id,
    originTable: 'compras',
    data: compra.dataRecebimento || new Date(),
    descricao: `Compra recebida - ${compra.fornecedor?.nome || 'Fornecedor'}`,
    projetoId: compra.projetoId,
    fornecedorId: compra.fornecedorId,
    entries: [
      {
        accountId: inventoryAccount.id,
        debito: compra.valorTotal,
        credito: 0,
        projetoId: compra.projetoId,
        fornecedorId: compra.fornecedorId
      },
      {
        accountId: apAccount.id,
        debito: 0,
        credito: compra.valorTotal,
        fornecedorId: compra.fornecedorId
      }
    ]
  })
}
```

### Job: Sync Projeto.custoReal

```typescript
// Rodar a cada 15 minutos ou on-demand
async function sincronizarCustosProjeto(projetoId: number) {
  // 1. Buscar todas entries COGS deste projeto
  const cogsMateriais = await prisma.ledgerEntry.aggregate({
    where: {
      projetoId,
      account: { tipo: 'COGS' },
      debito: { gt: 0 }
    },
    _sum: { debito: true }
  })
  
  // 2. Buscar custos MO (mão de obra) se houver
  const custoMO = await calcularCustoMOProjeto(projetoId)
  
  // 3. Outros custos do projeto
  const outrosCustos = await prisma.ledgerEntry.aggregate({
    where: {
      projetoId,
      account: { tipo: 'EXPENSE' },
      debito: { gt: 0 }
    },
    _sum: { debito: true }
  })
  
  const custoReal = 
    (cogsMateriais._sum.debito || 0) +
    custoMO +
    (outrosCustos._sum.debito || 0)
  
  // 4. Buscar receita (invoices)
  const receita = await prisma.invoice.aggregate({
    where: {
      projetoId,
      status: { in: ['PAID', 'PARTIAL_PAID'] }
    },
    _sum: { valorPago: true }
  })
  
  const receitaReal = receita._sum.valorPago || 0
  const lucroReal = receitaReal - custoReal
  const margemReal = receitaReal > 0 ? (lucroReal / receitaReal) * 100 : 0
  
  // 5. Atualizar Projeto
  await prisma.projeto.update({
    where: { id: projetoId },
    data: {
      custoReal,
      lucroReal,
      margemReal
    }
  })
}
```

---

## 🧪 VALIDAÇÕES & QUERIES

### Validação: Trial Balance

```typescript
// Trial Balance: soma(débitos) === soma(créditos)
async function validarTrialBalance(dataInicio?: Date, dataFim?: Date) {
  const where = dataInicio && dataFim ? {
    transaction: {
      data: {
        gte: dataInicio,
        lte: dataFim
      }
    }
  } : {}
  
  const result = await prisma.ledgerEntry.aggregate({
    where,
    _sum: {
      debito: true,
      credito: true
    }
  })
  
  const diferenca = (result._sum.debito || 0) - (result._sum.credito || 0)
  
  if (Math.abs(diferenca) > 0.01) {
    throw new Error(`Trial Balance desbalanceado! Diferença: $${diferenca}`)
  }
  
  return {
    balanced: true,
    totalDebito: result._sum.debito,
    totalCredito: result._sum.credito
  }
}
```

### Query: Balance Sheet

```typescript
interface BalanceSheet {
  assets: {
    current: Decimal
    fixed: Decimal
    total: Decimal
  }
  liabilities: {
    current: Decimal
    longTerm: Decimal
    total: Decimal
  }
  equity: {
    capital: Decimal
    retainedEarnings: Decimal
    currentYearPL: Decimal
    total: Decimal
  }
}

async function getBalanceSheet(data: Date): Promise<BalanceSheet> {
  // Assets
  const currentAssets = await getSaldoByAccountTipo('ASSET', data, 'current')
  const fixedAssets = await getSaldoByAccountTipo('ASSET', data, 'fixed')
  
  // Liabilities
  const currentLiabilities = await getSaldoByAccountTipo('LIABILITY', data, 'current')
  const longTermLiabilities = await getSaldoByAccountTipo('LIABILITY', data, 'longTerm')
  
  // Equity
  const equity = await getSaldoByAccountTipo('EQUITY', data)
  const currentYearPL = await getProfitLoss(startOfYear(data), data)
  
  return {
    assets: {
      current: currentAssets,
      fixed: fixedAssets,
      total: currentAssets + fixedAssets
    },
    liabilities: {
      current: currentLiabilities,
      longTerm: longTermLiabilities,
      total: currentLiabilities + longTermLiabilities
    },
    equity: {
      ...equity,
      currentYearPL,
      total: equity.capital + equity.retainedEarnings + currentYearPL
    }
  }
}
```

### Query: Profit & Loss (DRE)

```typescript
interface ProfitLoss {
  revenue: Decimal
  cogs: Decimal
  grossProfit: Decimal
  grossMargin: number
  expenses: Decimal
  netProfit: Decimal
  netMargin: number
}

async function getProfitLoss(dataInicio: Date, dataFim: Date): Promise<ProfitLoss> {
  const revenue = await getSaldoByAccountTipo('REVENUE', dataInicio, dataFim)
  const cogs = await getSaldoByAccountTipo('COGS', dataInicio, dataFim)
  const expenses = await getSaldoByAccountTipo('EXPENSE', dataInicio, dataFim)
  
  const grossProfit = revenue - cogs
  const netProfit = grossProfit - expenses
  
  return {
    revenue,
    cogs,
    grossProfit,
    grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    expenses,
    netProfit,
    netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0
  }
}
```

---

## 📋 MIGRATIONS SQL

```sql
-- Accounts (Plano de Contas)
CREATE TABLE accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(200) NOT NULL,
  nome_completo VARCHAR(500) NOT NULL,
  
  parent_id INT NULL,
  nivel INT NOT NULL DEFAULT 1,
  caminho VARCHAR(500) NOT NULL,
  
  tipo ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS') NOT NULL,
  natureza ENUM('DEBIT', 'CREDIT') NOT NULL,
  
  descricao TEXT NULL,
  
  aceita_lancamento BOOLEAN NOT NULL DEFAULT TRUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  
  centro_custo_obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  projeto_obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  
  bank_account_id INT NULL UNIQUE,
  
  codigo_externo VARCHAR(50) NULL,
  
  saldo_debito DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo_credito DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo_atual DECIMAL(15,2) NOT NULL DEFAULT 0,
  ultima_movimentacao DATETIME NULL,
  
  criado_por INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_id) REFERENCES accounts(id),
  FOREIGN KEY (criado_por) REFERENCES usuarios(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  
  INDEX idx_parent_id (parent_id),
  INDEX idx_tipo (tipo),
  INDEX idx_natureza (natureza),
  INDEX idx_ativo (ativo),
  INDEX idx_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ledger Transactions
CREATE TABLE ledger_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_transacao VARCHAR(50) UNIQUE NOT NULL,
  
  data DATETIME NOT NULL,
  
  origin ENUM('MANUAL', 'INVOICE_SENT', 'INVOICE_PAYMENT', 'COMPRA_RECEBIDA', 
              'ESTOQUE_SAIDA', 'FOLHA_PAGAMENTO', 'REEMBOLSO', 'BANK_TRANSFER',
              'DEPRECIATION', 'ADJUSTMENT', 'OPENING_BALANCE') NOT NULL,
  origin_id INT NULL,
  origin_table VARCHAR(50) NULL,
  
  descricao VARCHAR(500) NOT NULL,
  observacoes TEXT NULL,
  
  projeto_id INT NULL,
  cliente_id INT NULL,
  fornecedor_id INT NULL,
  centro_custo_id INT NULL,
  
  total_debito DECIMAL(15,2) NOT NULL,
  total_credito DECIMAL(15,2) NOT NULL,
  
  status ENUM('DRAFT', 'POSTED', 'REVERSED') NOT NULL DEFAULT 'POSTED',
  
  revertida BOOLEAN NOT NULL DEFAULT FALSE,
  revertida_em DATETIME NULL,
  revertida_por INT NULL,
  reversao_de INT NULL,
  
  conciliada BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_id INT NULL,
  
  criado_por INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (projeto_id) REFERENCES projetos(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id),
  FOREIGN KEY (criado_por) REFERENCES usuarios(id),
  FOREIGN KEY (revertida_por) REFERENCES usuarios(id),
  FOREIGN KEY (reversao_de) REFERENCES ledger_transactions(id),
  FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id),
  
  INDEX idx_data (data),
  INDEX idx_origin (origin),
  INDEX idx_projeto_id (projeto_id),
  INDEX idx_cliente_id (cliente_id),
  INDEX idx_centro_custo_id (centro_custo_id),
  INDEX idx_status (status),
  INDEX idx_revertida (revertida),
  INDEX idx_conciliada (conciliada),
  
  CONSTRAINT chk_balanced CHECK (total_debito = total_credito)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ledger Entries
CREATE TABLE ledger_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  
  account_id INT NOT NULL,
  
  debito DECIMAL(15,2) NOT NULL,
  credito DECIMAL(15,2) NOT NULL,
  
  projeto_id INT NULL,
  cliente_id INT NULL,
  fornecedor_id INT NULL,
  centro_custo_id INT NULL,
  
  descricao VARCHAR(500) NULL,
  
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (transaction_id) REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id),
  
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_account_id (account_id),
  INDEX idx_projeto_id (projeto_id),
  INDEX idx_cliente_id (cliente_id),
  INDEX idx_centro_custo_id (centro_custo_id),
  
  CONSTRAINT chk_debit_or_credit CHECK (
    (debito > 0 AND credito = 0) OR (debito = 0 AND credito > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Centros de Custo
CREATE TABLE centros_custo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(200) NOT NULL,
  nome_completo VARCHAR(500) NOT NULL,
  descricao TEXT NULL,
  
  parent_id INT NULL,
  nivel INT NOT NULL DEFAULT 1,
  caminho VARCHAR(500) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  
  tipo ENUM('DEPARTAMENTO', 'SUBDEPARTAMENTO', 'PROJETO', 'ATIVIDADE') NOT NULL,
  
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  permite_movimentacao BOOLEAN NOT NULL DEFAULT TRUE,
  
  orcamento_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  
  projeto_id INT NULL UNIQUE,
  responsavel_id INT NULL,
  
  criado_por INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_id) REFERENCES centros_custo(id),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id),
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id),
  FOREIGN KEY (criado_por) REFERENCES usuarios(id),
  
  INDEX idx_parent_id (parent_id),
  INDEX idx_tipo (tipo),
  INDEX idx_ativo (ativo),
  INDEX idx_projeto_id (projeto_id),
  INDEX idx_responsavel_id (responsavel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orçamentos
CREATE TABLE orcamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT NULL,
  
  projeto_id INT NULL,
  centro_custo_id INT NULL,
  tipo ENUM('PROJETO', 'CENTRO_CUSTO', 'PERIODO') NOT NULL,
  
  periodo VARCHAR(20) NOT NULL,
  data_inicio DATETIME NOT NULL,
  data_fim DATETIME NOT NULL,
  
  valor_limite DECIMAL(15,2) NOT NULL,
  valor_gasto DECIMAL(15,2) NOT NULL DEFAULT 0,
  percentual_gasto DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  alertar80 BOOLEAN NOT NULL DEFAULT TRUE,
  alertar100 BOOLEAN NOT NULL DEFAULT TRUE,
  alertar110 BOOLEAN NOT NULL DEFAULT TRUE,
  alertado80 BOOLEAN NOT NULL DEFAULT FALSE,
  alertado100 BOOLEAN NOT NULL DEFAULT FALSE,
  alertado110 BOOLEAN NOT NULL DEFAULT FALSE,
  
  status ENUM('ATIVO', 'EXCEDIDO', 'CONCLUIDO', 'CANCELADO') NOT NULL DEFAULT 'ATIVO',
  
  observacoes TEXT NULL,
  
  criado_por INT NOT NULL,
  aprovado_por INT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aprovado_em DATETIME NULL,
  
  FOREIGN KEY (projeto_id) REFERENCES projetos(id),
  FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id),
  FOREIGN KEY (criado_por) REFERENCES usuarios(id),
  FOREIGN KEY (aprovado_por) REFERENCES usuarios(id),
  
  INDEX idx_projeto_id (projeto_id),
  INDEX idx_centro_custo_id (centro_custo_id),
  INDEX idx_status (status),
  INDEX idx_periodo (periodo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orcamento Alertas
CREATE TABLE orcamento_alertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orcamento_id INT NOT NULL,
  
  tipo ENUM('PERCENTUAL_80', 'PERCENTUAL_100', 'PERCENTUAL_110') NOT NULL,
  percentual DECIMAL(5,2) NOT NULL,
  valor_gasto DECIMAL(15,2) NOT NULL,
  valor_limite DECIMAL(15,2) NOT NULL,
  
  disparado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  lido_em DATETIME NULL,
  lido_por INT NULL,
  
  acao TEXT NULL,
  
  FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (lido_por) REFERENCES usuarios(id),
  
  INDEX idx_orcamento_id (orcamento_id),
  INDEX idx_lido (lido),
  INDEX idx_disparado_em (disparado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bank Accounts
CREATE TABLE bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  tipo ENUM('CHECKING', 'SAVINGS', 'CREDIT', 'INVESTMENT', 'OTHER') NOT NULL,
  
  banco VARCHAR(200) NOT NULL,
  agencia VARCHAR(50) NULL,
  conta VARCHAR(50) NOT NULL,
  swift VARCHAR(20) NULL,
  routing VARCHAR(20) NULL,
  
  moeda VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  saldo_inicial DECIMAL(15,2) NOT NULL,
  saldo_atual DECIMAL(15,2) NOT NULL,
  data_ultimo_saldo DATETIME NULL,
  
  limite_cheque_especial DECIMAL(15,2) NULL,
  
  account_id INT NULL UNIQUE,
  
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  
  observacoes TEXT NULL,
  
  criado_por INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (criado_por) REFERENCES usuarios(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  
  INDEX idx_ativo (ativo),
  INDEX idx_principal (principal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bank Reconciliations
CREATE TABLE bank_reconciliations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_rec VARCHAR(50) UNIQUE NOT NULL,
  bank_account_id INT NOT NULL,
  
  data_inicio DATETIME NOT NULL,
  data_fim DATETIME NOT NULL,
  
  saldo_inicial_livro DECIMAL(15,2) NOT NULL,
  saldo_final_livro DECIMAL(15,2) NOT NULL,
  saldo_inicial_banco DECIMAL(15,2) NOT NULL,
  saldo_final_banco DECIMAL(15,2) NOT NULL,
  diferenca DECIMAL(15,2) NOT NULL,
  
  status ENUM('EM_ANDAMENTO', 'CONCILIADO', 'DIVERGENCIA', 'CANCELADO') NOT NULL DEFAULT 'EM_ANDAMENTO',
  
  observacoes TEXT NULL,
  
  criado_por INT NOT NULL,
  aprovado_por INT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  concluida_em DATETIME NULL,
  
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (criado_por) REFERENCES usuarios(id),
  FOREIGN KEY (aprovado_por) REFERENCES usuarios(id),
  
  INDEX idx_bank_account_id (bank_account_id),
  INDEX idx_status (status),
  INDEX idx_data_inicio (data_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reconciliation Items
CREATE TABLE reconciliation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reconciliation_id INT NOT NULL,
  
  data_transacao DATETIME NOT NULL,
  descricao VARCHAR(500) NOT NULL,
  referencia VARCHAR(200) NULL,
  
  valor_banco DECIMAL(15,2) NOT NULL,
  valor_livro DECIMAL(15,2) NULL,
  diferenca DECIMAL(15,2) NULL,
  
  ledger_transaction_id INT NULL,
  status ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'AJUSTADO') NOT NULL DEFAULT 'PENDENTE',
  
  observacoes TEXT NULL,
  
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  conciliado_por INT NULL,
  conciliado_em DATETIME NULL,
  
  FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  FOREIGN KEY (ledger_transaction_id) REFERENCES ledger_transactions(id),
  FOREIGN KEY (conciliado_por) REFERENCES usuarios(id),
  
  INDEX idx_reconciliation_id (reconciliation_id),
  INDEX idx_ledger_transaction_id (ledger_transaction_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ajustar ProjetoMaterial para FK centro_custo_id
ALTER TABLE projeto_materiais 
  ADD CONSTRAINT fk_projeto_material_centro_custo
  FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
```

---

## ✅ CHECKLIST FASE 1

### Desenvolvimento
- [ ] ⏳ Models Prisma (9 models: Account, LedgerTransaction, LedgerEntry, CentroCusto, Orcamento, OrcamentoAlerta, BankAccount, BankReconciliation, ReconciliationItem)
- [ ] ⏳ Migrations SQL completas
- [ ] ⏳ Seeds: COA Texas + Centros Custo GladPros
- [ ] ⏳ APIs Ledger
  - [ ] Criar/reverter transactions
  - [ ] Listar entries por conta/projeto
  - [ ] Trial Balance
  - [ ] Balance Sheet
  - [ ] P&L (DRE)
- [ ] ⏳ APIs Centro Custo
  - [ ] CRUD hierárquico
  - [ ] Tree view
- [ ] ⏳ APIs Orçamento
  - [ ] CRUD
  - [ ] Alertas
  - [ ] Dashboard
- [ ] ⏳ Hooks automáticos (3)
- [ ] ⏳ Job sincronização custos projetos

### Frontend
- [ ] ⏳ Tela: Plano de Contas (tree view)
- [ ] ⏳ Tela: Centros de Custo (hierárquico)
- [ ] ⏳ Tela: Orçamentos (CRUD + dashboards)
- [ ] ⏳ Tela: Lançamentos (manual)
- [ ] ⏳ Relatório: Trial Balance
- [ ] ⏳ Relatório: Balance Sheet
- [ ] ⏳ Relatório: P&L

### Testes
- [ ] ⏳ Unit: Trial Balance validation
- [ ] ⏳ Unit: Cálculos orçamento
- [ ] ⏳ Integration: Hooks COGS/Inventory
- [ ] ⏳ Integration: Sync custos projeto
- [ ] ⏳ E2E: Fluxo completo

---

**Status:** ✅ Especificação completa  
**Próximo:** FINANCEIRO-PLANO-CONTAS-TEXAS.md
