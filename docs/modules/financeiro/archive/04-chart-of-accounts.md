# 🏦 PLANO DE CONTAS (COA) - TEXAS USA

**Chart of Accounts para GladPros**  
**Localização:** Texas, USA  
**Padrão:** US GAAP simplificado  
**Moeda:** USD

---

## 🎯 ESTRUTURA GERAL

```
1.x.x.xxx - ASSETS (Ativos)
2.x.x.xxx - LIABILITIES (Passivos)
3.x.x.xxx - EQUITY (Patrimônio Líquido)
4.x.x.xxx - REVENUE (Receitas)
5.x.x.xxx - EXPENSES (Despesas Operacionais)
6.x.x.xxx - COGS (Custo dos Produtos/Serviços Vendidos)
```

**Níveis:**
- Nível 1: Categoria principal (1, 2, 3, 4, 5, 6)
- Nível 2: Subcategoria (1.1, 1.2, 2.1, 2.2)
- Nível 3: Grupo (1.1.01, 1.1.02)
- Nível 4: Conta específica (1.1.01.001, 1.1.01.002)

---

## 1️⃣ ASSETS (Ativos)

### 1.1 Current Assets (Ativos Circulantes)

#### 1.1.01 Cash & Bank Accounts
```prisma
{
  codigo: "1.1.01",
  nome: "Cash & Bank Accounts",
  tipo: "ASSET",
  natureza: "DEBIT",
  aceitaLancamento: false  // Conta pai
}

{
  codigo: "1.1.01.001",
  nome: "Chase Business Checking",
  parentId: "1.1.01",
  tipo: "ASSET",
  natureza: "DEBIT",
  aceitaLancamento: true,
  bankAccountId: 1  // Link para bank_accounts
}

{
  codigo: "1.1.01.002",
  nome: "Wells Fargo Savings",
  tipo: "ASSET",
  natureza: "DEBIT",
  bankAccountId: 2
}

{
  codigo: "1.1.01.003",
  nome: "Petty Cash",
  tipo: "ASSET",
  natureza: "DEBIT"
}
```

#### 1.1.02 Accounts Receivable (Contas a Receber)
```prisma
{
  codigo: "1.1.02",
  nome: "Accounts Receivable",
  tipo: "ASSET",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "1.1.02.001",
  nome: "A/R - Construction Projects",
  parentId: "1.1.02",
  tipo: "ASSET",
  natureza: "DEBIT",
  projetoObrigatorio: true
}

{
  codigo: "1.1.02.002",
  nome: "A/R - Maintenance Services",
  tipo: "ASSET",
  natureza: "DEBIT"
}

{
  codigo: "1.1.02.003",
  nome: "A/R - Other Services",
  tipo: "ASSET",
  natureza: "DEBIT"
}
```

#### 1.1.03 Inventory (Estoque)
```prisma
{
  codigo: "1.1.03",
  nome: "Inventory",
  tipo: "ASSET",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "1.1.03.001",
  nome: "Materials Inventory",
  parentId: "1.1.03",
  tipo: "ASSET",
  natureza: "DEBIT",
  descricao: "Construction and maintenance materials"
}

{
  codigo: "1.1.03.002",
  nome: "Equipment Inventory",
  tipo: "ASSET",
  natureza: "DEBIT",
  descricao: "Tools and small equipment for resale"
}
```

#### 1.1.04 Prepaid Expenses
```prisma
{
  codigo: "1.1.04",
  nome: "Prepaid Expenses",
  tipo: "ASSET",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "1.1.04.001",
  nome: "Prepaid Insurance",
  parentId: "1.1.04",
  tipo: "ASSET",
  natureza: "DEBIT"
}

{
  codigo: "1.1.04.002",
  nome: "Prepaid Rent",
  tipo: "ASSET",
  natureza: "DEBIT"
}

{
  codigo: "1.1.04.003",
  nome: "Prepaid Licenses",
  tipo: "ASSET",
  natureza: "DEBIT"
}
```

### 1.2 Fixed Assets (Ativos Não Circulantes)

#### 1.2.01 Property & Equipment
```prisma
{
  codigo: "1.2.01",
  nome: "Property & Equipment",
  tipo: "ASSET",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "1.2.01.001",
  nome: "Vehicles",
  parentId: "1.2.01",
  tipo: "ASSET",
  natureza: "DEBIT",
  descricao: "Trucks, vans, work vehicles"
}

{
  codigo: "1.2.01.002",
  nome: "Tools & Machinery",
  tipo: "ASSET",
  natureza: "DEBIT",
  descricao: "Power tools, heavy machinery"
}

{
  codigo: "1.2.01.003",
  nome: "Office Equipment",
  tipo: "ASSET",
  natureza: "DEBIT",
  descricao: "Computers, furniture, etc"
}

{
  codigo: "1.2.01.004",
  nome: "Land",
  tipo: "ASSET",
  natureza: "DEBIT",
  descricao: "Property owned"
}

{
  codigo: "1.2.01.005",
  nome: "Buildings",
  tipo: "ASSET",
  natureza: "DEBIT",
  descricao: "Office, warehouse"
}
```

#### 1.2.02 Accumulated Depreciation (Contra Asset)
```prisma
{
  codigo: "1.2.02",
  nome: "Accumulated Depreciation",
  tipo: "ASSET",
  natureza: "CREDIT",  // CONTRA ASSET
  aceitaLancamento: false
}

{
  codigo: "1.2.02.001",
  nome: "Accum Depreciation - Vehicles",
  parentId: "1.2.02",
  tipo: "ASSET",
  natureza: "CREDIT"
}

{
  codigo: "1.2.02.002",
  nome: "Accum Depreciation - Tools",
  tipo: "ASSET",
  natureza: "CREDIT"
}

{
  codigo: "1.2.02.003",
  nome: "Accum Depreciation - Office",
  tipo: "ASSET",
  natureza: "CREDIT"
}

{
  codigo: "1.2.02.004",
  nome: "Accum Depreciation - Buildings",
  tipo: "ASSET",
  natureza: "CREDIT"
}
```

---

## 2️⃣ LIABILITIES (Passivos)

### 2.1 Current Liabilities (Passivos Circulantes)

#### 2.1.01 Accounts Payable
```prisma
{
  codigo: "2.1.01",
  nome: "Accounts Payable",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  aceitaLancamento: false
}

{
  codigo: "2.1.01.001",
  nome: "A/P - Suppliers",
  parentId: "2.1.01",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  descricao: "Materials and equipment suppliers"
}

{
  codigo: "2.1.01.002",
  nome: "A/P - Utilities",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  descricao: "Electric, water, gas, internet"
}

{
  codigo: "2.1.01.003",
  nome: "A/P - Subcontractors",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  descricao: "Third-party service providers"
}
```

#### 2.1.02 Tax Liabilities
```prisma
{
  codigo: "2.1.02",
  nome: "Tax Liabilities",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  aceitaLancamento: false
}

{
  codigo: "2.1.02.001",
  nome: "Sales Tax Payable - Texas",
  parentId: "2.1.02",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  descricao: "Texas sales tax collected (8.25%)"
}

{
  codigo: "2.1.02.002",
  nome: "Payroll Tax Payable",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  descricao: "Federal and state payroll taxes"
}

{
  codigo: "2.1.02.003",
  nome: "Federal Income Tax Payable",
  tipo: "LIABILITY",
  natureza: "CREDIT"
}

{
  codigo: "2.1.02.004",
  nome: "State Income Tax Payable",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  descricao: "Texas has no state income tax"
}
```

#### 2.1.03 Accrued Expenses
```prisma
{
  codigo: "2.1.03",
  nome: "Accrued Expenses",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  aceitaLancamento: false
}

{
  codigo: "2.1.03.001",
  nome: "Salaries Payable",
  parentId: "2.1.03",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  descricao: "Accrued but unpaid salaries"
}

{
  codigo: "2.1.03.002",
  nome: "Benefits Payable",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  descricao: "Health insurance, 401k, etc"
}

{
  codigo: "2.1.03.003",
  nome: "Interest Payable",
  tipo: "LIABILITY",
  natureza: "CREDIT"
}
```

#### 2.1.04 Credit Cards
```prisma
{
  codigo: "2.1.04",
  nome: "Credit Cards",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  aceitaLancamento: false
}

{
  codigo: "2.1.04.001",
  nome: "American Express Corporate",
  parentId: "2.1.04",
  tipo: "LIABILITY",
  natureza: "CREDIT"
}

{
  codigo: "2.1.04.002",
  nome: "Visa Business",
  tipo: "LIABILITY",
  natureza: "CREDIT"
}
```

### 2.2 Long-term Liabilities (Passivos Não Circulantes)

#### 2.2.01 Loans & Financing
```prisma
{
  codigo: "2.2.01",
  nome: "Loans & Financing",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  aceitaLancamento: false
}

{
  codigo: "2.2.01.001",
  nome: "Bank Loan - Vehicle",
  parentId: "2.2.01",
  tipo: "LIABILITY",
  natureza: "CREDIT"
}

{
  codigo: "2.2.01.002",
  nome: "Equipment Financing",
  tipo: "LIABILITY",
  natureza: "CREDIT"
}

{
  codigo: "2.2.01.003",
  nome: "Mortgage Payable",
  tipo: "LIABILITY",
  natureza: "CREDIT"
}

{
  codigo: "2.2.01.004",
  nome: "SBA Loan",
  tipo: "LIABILITY",
  natureza: "CREDIT",
  descricao: "Small Business Administration loan"
}
```

---

## 3️⃣ EQUITY (Patrimônio Líquido)

### 3.1 Owner's Equity

```prisma
{
  codigo: "3.1.01",
  nome: "Owner's Capital",
  tipo: "EQUITY",
  natureza: "CREDIT",
  descricao: "Initial investment and additional contributions"
}

{
  codigo: "3.1.02",
  nome: "Owner's Drawings",
  tipo: "EQUITY",
  natureza: "DEBIT",  // CONTRA EQUITY
  descricao: "Withdrawals by owner"
}

{
  codigo: "3.1.03",
  nome: "Retained Earnings",
  tipo: "EQUITY",
  natureza: "CREDIT",
  descricao: "Accumulated profits from previous years"
}

{
  codigo: "3.1.04",
  nome: "Current Year Profit/Loss",
  tipo: "EQUITY",
  natureza: "CREDIT",
  descricao: "Profit or loss for current fiscal year"
}
```

---

## 4️⃣ REVENUE (Receitas)

### 4.1 Service Revenue

```prisma
{
  codigo: "4.1",
  nome: "Service Revenue",
  tipo: "REVENUE",
  natureza: "CREDIT",
  aceitaLancamento: false
}

{
  codigo: "4.1.01",
  nome: "Construction Services",
  parentId: "4.1",
  tipo: "REVENUE",
  natureza: "CREDIT",
  projetoObrigatorio: true,
  centroCustoObrigatorio: true
}

{
  codigo: "4.1.02",
  nome: "Remodeling Services",
  tipo: "REVENUE",
  natureza: "CREDIT",
  projetoObrigatorio: true
}

{
  codigo: "4.1.03",
  nome: "Maintenance Services",
  tipo: "REVENUE",
  natureza: "CREDIT",
  projetoObrigatorio: true
}

{
  codigo: "4.1.04",
  nome: "Consulting Services",
  tipo: "REVENUE",
  natureza: "CREDIT"
}

{
  codigo: "4.1.05",
  nome: "Emergency Repairs",
  tipo: "REVENUE",
  natureza: "CREDIT",
  projetoObrigatorio: true
}
```

### 4.2 Material Sales

```prisma
{
  codigo: "4.2",
  nome: "Material Sales",
  tipo: "REVENUE",
  natureza: "CREDIT",
  aceitaLancamento: false
}

{
  codigo: "4.2.01",
  nome: "Material Markup Revenue",
  parentId: "4.2",
  tipo: "REVENUE",
  natureza: "CREDIT",
  descricao: "Markup on materials sold to clients",
  projetoObrigatorio: true
}

{
  codigo: "4.2.02",
  nome: "Equipment Sales",
  tipo: "REVENUE",
  natureza: "CREDIT",
  descricao: "Tools and equipment sold"
}
```

### 4.3 Other Revenue

```prisma
{
  codigo: "4.3",
  nome: "Other Revenue",
  tipo: "REVENUE",
  natureza: "CREDIT",
  aceitaLancamento: false
}

{
  codigo: "4.3.01",
  nome: "Equipment Rental",
  parentId: "4.3",
  tipo: "REVENUE",
  natureza: "CREDIT"
}

{
  codigo: "4.3.02",
  nome: "Interest Income",
  tipo: "REVENUE",
  natureza: "CREDIT"
}

{
  codigo: "4.3.03",
  nome: "Late Fees",
  tipo: "REVENUE",
  natureza: "CREDIT",
  descricao: "Late payment fees from clients"
}

{
  codigo: "4.3.04",
  nome: "Other Income",
  tipo: "REVENUE",
  natureza: "CREDIT"
}
```

---

## 6️⃣ COGS (Custo dos Produtos/Serviços Vendidos)

### 6.1 Materials COGS

```prisma
{
  codigo: "6.1",
  nome: "Materials COGS",
  tipo: "COGS",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "6.1.01",
  nome: "Construction Materials COGS",
  parentId: "6.1",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true,
  centroCustoObrigatorio: true,
  descricao: "Cost of materials used in projects"
}

{
  codigo: "6.1.02",
  nome: "Maintenance Materials COGS",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true
}
```

### 6.2 Labor COGS

```prisma
{
  codigo: "6.2",
  nome: "Labor COGS",
  tipo: "COGS",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "6.2.01",
  nome: "Direct Labor - Construction",
  parentId: "6.2",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true,
  centroCustoObrigatorio: true,
  descricao: "Wages for construction crew"
}

{
  codigo: "6.2.02",
  nome: "Direct Labor - Maintenance",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true
}

{
  codigo: "6.2.03",
  nome: "Labor Burden - Construction",
  tipo: "COGS",
  natureza: "DEBIT",
  descricao: "Payroll taxes, benefits on direct labor",
  projetoObrigatorio: true
}
```

### 6.3 Subcontractor COGS

```prisma
{
  codigo: "6.3",
  nome: "Subcontractor COGS",
  tipo: "COGS",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "6.3.01",
  nome: "Electrical Subcontractors",
  parentId: "6.3",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true
}

{
  codigo: "6.3.02",
  nome: "Plumbing Subcontractors",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true
}

{
  codigo: "6.3.03",
  nome: "HVAC Subcontractors",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true
}

{
  codigo: "6.3.04",
  nome: "Other Subcontractors",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true
}
```

### 6.4 Equipment & Tools COGS

```prisma
{
  codigo: "6.4",
  nome: "Equipment & Tools COGS",
  tipo: "COGS",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "6.4.01",
  nome: "Equipment Rental - Projects",
  parentId: "6.4",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true,
  descricao: "Rented equipment for specific projects"
}

{
  codigo: "6.4.02",
  nome: "Small Tools - Projects",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true
}
```

### 6.5 Other Direct Costs

```prisma
{
  codigo: "6.5",
  nome: "Other Direct Costs",
  tipo: "COGS",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "6.5.01",
  nome: "Permits & Licenses",
  parentId: "6.5",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true,
  descricao: "Project-specific permits"
}

{
  codigo: "6.5.02",
  nome: "Waste Disposal - Projects",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true
}

{
  codigo: "6.5.03",
  nome: "Project Insurance",
  tipo: "COGS",
  natureza: "DEBIT",
  projetoObrigatorio: true
}
```

---

## 5️⃣ EXPENSES (Despesas Operacionais)

### 5.1 Operacional (Centro de Custo: OPE)

#### 5.1.01 Salaries - Operations
```prisma
{
  codigo: "5.1.01",
  nome: "Salaries - Operations",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  centroCustoObrigatorio: true,
  descricao: "Indirect labor not tied to specific projects"
}
```

#### 5.1.02 Vehicle Expenses
```prisma
{
  codigo: "5.1.02",
  nome: "Vehicle Expenses",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "5.1.02.001",
  nome: "Fuel & Gas",
  parentId: "5.1.02",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  centroCustoObrigatorio: true
}

{
  codigo: "5.1.02.002",
  nome: "Vehicle Maintenance",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  centroCustoObrigatorio: true
}

{
  codigo: "5.1.02.003",
  nome: "Vehicle Insurance",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.1.02.004",
  nome: "Vehicle Registration",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}
```

#### 5.1.03 Logistics
```prisma
{
  codigo: "5.1.03",
  nome: "Logistics",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "5.1.03.001",
  nome: "Freight & Shipping",
  parentId: "5.1.03",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.1.03.002",
  nome: "Mileage Reimbursement",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}
```

#### 5.1.04 Tools & Equipment Maintenance
```prisma
{
  codigo: "5.1.04",
  nome: "Tools & Equipment Maintenance",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  descricao: "General maintenance not tied to projects"
}
```

### 5.2 Administrativo (Centro de Custo: ADM)

#### 5.2.01 Salaries - Admin
```prisma
{
  codigo: "5.2.01",
  nome: "Salaries - Admin",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  centroCustoObrigatorio: true,
  descricao: "Office staff, accountant, HR"
}
```

#### 5.2.02 Payroll Taxes & Benefits
```prisma
{
  codigo: "5.2.02",
  nome: "Payroll Taxes & Benefits",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "5.2.02.001",
  nome: "Payroll Taxes",
  parentId: "5.2.02",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.02.002",
  nome: "Health Insurance",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.02.003",
  nome: "401k Contributions",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.02.004",
  nome: "Workers Compensation",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}
```

#### 5.2.03 Office Rent & Utilities
```prisma
{
  codigo: "5.2.03",
  nome: "Office Rent & Utilities",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "5.2.03.001",
  nome: "Office Rent",
  parentId: "5.2.03",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.03.002",
  nome: "Electricity",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.03.003",
  nome: "Water & Sewer",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.03.004",
  nome: "Internet & Phone",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.03.005",
  nome: "Janitorial Services",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}
```

#### 5.2.04 Office Supplies
```prisma
{
  codigo: "5.2.04",
  nome: "Office Supplies",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  descricao: "Paper, pens, etc"
}
```

#### 5.2.05 IT & Software
```prisma
{
  codigo: "5.2.05",
  nome: "IT & Software",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "5.2.05.001",
  nome: "Software Licenses",
  parentId: "5.2.05",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.05.002",
  nome: "IT Support",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.05.003",
  nome: "Cloud Services",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}
```

#### 5.2.06 Professional Services
```prisma
{
  codigo: "5.2.06",
  nome: "Professional Services",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "5.2.06.001",
  nome: "Accounting & Bookkeeping",
  parentId: "5.2.06",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.06.002",
  nome: "Legal Fees",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.06.003",
  nome: "Consulting Fees",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}
```

#### 5.2.07 Insurance
```prisma
{
  codigo: "5.2.07",
  nome: "Insurance",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "5.2.07.001",
  nome: "General Liability Insurance",
  parentId: "5.2.07",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.07.002",
  nome: "Property Insurance",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.2.07.003",
  nome: "Umbrella Insurance",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}
```

### 5.3 Comercial (Centro de Custo: COM)

#### 5.3.01 Salaries - Sales & Marketing
```prisma
{
  codigo: "5.3.01",
  nome: "Salaries - Sales & Marketing",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  centroCustoObrigatorio: true
}
```

#### 5.3.02 Marketing & Advertising
```prisma
{
  codigo: "5.3.02",
  nome: "Marketing & Advertising",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "5.3.02.001",
  nome: "Digital Marketing",
  parentId: "5.3.02",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  centroCustoObrigatorio: true,
  descricao: "Google Ads, Facebook, etc"
}

{
  codigo: "5.3.02.002",
  nome: "Print Advertising",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  centroCustoObrigatorio: true
}

{
  codigo: "5.3.02.003",
  nome: "Website & SEO",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.3.02.004",
  nome: "Trade Shows & Events",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}
```

#### 5.3.03 Sales Commissions
```prisma
{
  codigo: "5.3.03",
  nome: "Sales Commissions",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  centroCustoObrigatorio: true
}
```

#### 5.3.04 Client Entertainment
```prisma
{
  codigo: "5.3.04",
  nome: "Client Entertainment",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  descricao: "Meals, gifts for clients"
}
```

### 5.4 Other Operating Expenses

#### 5.4.01 Bank Fees
```prisma
{
  codigo: "5.4.01",
  nome: "Bank Fees",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  aceitaLancamento: false
}

{
  codigo: "5.4.01.001",
  nome: "Bank Service Charges",
  parentId: "5.4.01",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.4.01.002",
  nome: "Credit Card Fees",
  tipo: "EXPENSE",
  natureza: "DEBIT"
}

{
  codigo: "5.4.01.003",
  nome: "Payment Gateway Fees",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  descricao: "Stripe, Square fees"
}
```

#### 5.4.02 Interest Expense
```prisma
{
  codigo: "5.4.02",
  nome: "Interest Expense",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  descricao: "Interest on loans and credit cards"
}
```

#### 5.4.03 Depreciation Expense
```prisma
{
  codigo: "5.4.03",
  nome: "Depreciation Expense",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  descricao: "Non-cash depreciation expense"
}
```

#### 5.4.04 Bad Debt Expense
```prisma
{
  codigo: "5.4.04",
  nome: "Bad Debt Expense",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  descricao: "Uncollectible accounts receivable"
}
```

#### 5.4.05 Miscellaneous Expenses
```prisma
{
  codigo: "5.4.05",
  nome: "Miscellaneous Expenses",
  tipo: "EXPENSE",
  natureza: "DEBIT",
  descricao: "Other operating expenses"
}
```

---

## 📊 RESUMO ESTRUTURA

### Assets (1.x.x.xxx)
- **Current Assets:** $XXX,XXX
  - Cash & Bank: $XX,XXX
  - A/R: $XX,XXX
  - Inventory: $XX,XXX
  - Prepaid: $X,XXX
- **Fixed Assets:** $XXX,XXX
  - Property & Equipment: $XXX,XXX
  - Less: Accumulated Depreciation: ($XX,XXX)
  - **Net Fixed Assets:** $XXX,XXX
- **TOTAL ASSETS:** $XXX,XXX

### Liabilities (2.x.x.xxx)
- **Current Liabilities:** $XX,XXX
  - A/P: $XX,XXX
  - Tax Liabilities: $X,XXX
  - Accrued Expenses: $X,XXX
  - Credit Cards: $X,XXX
- **Long-term Liabilities:** $XXX,XXX
  - Loans: $XXX,XXX
- **TOTAL LIABILITIES:** $XXX,XXX

### Equity (3.x.x)
- Owner's Capital: $XXX,XXX
- Retained Earnings: $XX,XXX
- Current Year P/L: $XX,XXX
- Less: Owner's Drawings: ($X,XXX)
- **TOTAL EQUITY:** $XXX,XXX

### Revenue (4.x.x.xxx)
- Service Revenue: $XXX,XXX
- Material Sales: $XX,XXX
- Other Revenue: $X,XXX
- **TOTAL REVENUE:** $XXX,XXX

### COGS (6.x.x.xxx)
- Materials COGS: $XX,XXX
- Labor COGS: $XX,XXX
- Subcontractor COGS: $XX,XXX
- Equipment COGS: $X,XXX
- Other Direct Costs: $X,XXX
- **TOTAL COGS:** $XXX,XXX

### GROSS PROFIT
- **Revenue - COGS:** $XX,XXX
- **Gross Margin:** XX%

### Expenses (5.x.x.xxx)
- Operacional: $XX,XXX
- Administrativo: $XX,XXX
- Comercial: $X,XXX
- Other Operating: $X,XXX
- **TOTAL EXPENSES:** $XX,XXX

### NET PROFIT
- **Gross Profit - Expenses:** $X,XXX
- **Net Margin:** X%

---

## 🔧 SCRIPTS SEED

```typescript
// prisma/seed-coa-texas.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const chartOfAccounts = [
  // Assets - Current
  { codigo: "1.1.01", nome: "Cash & Bank Accounts", tipo: "ASSET", natureza: "DEBIT", nivel: 3, aceitaLancamento: false },
  { codigo: "1.1.01.001", nome: "Chase Business Checking", parentCodigo: "1.1.01", tipo: "ASSET", natureza: "DEBIT", nivel: 4 },
  { codigo: "1.1.01.002", nome: "Wells Fargo Savings", parentCodigo: "1.1.01", tipo: "ASSET", natureza: "DEBIT", nivel: 4 },
  { codigo: "1.1.01.003", nome: "Petty Cash", parentCodigo: "1.1.01", tipo: "ASSET", natureza: "DEBIT", nivel: 4 },
  
  { codigo: "1.1.02", nome: "Accounts Receivable", tipo: "ASSET", natureza: "DEBIT", nivel: 3, aceitaLancamento: false },
  { codigo: "1.1.02.001", nome: "A/R - Construction Projects", parentCodigo: "1.1.02", tipo: "ASSET", natureza: "DEBIT", nivel: 4, projetoObrigatorio: true },
  { codigo: "1.1.02.002", nome: "A/R - Maintenance Services", parentCodigo: "1.1.02", tipo: "ASSET", natureza: "DEBIT", nivel: 4 },
  
  { codigo: "1.1.03", nome: "Inventory", tipo: "ASSET", natureza: "DEBIT", nivel: 3, aceitaLancamento: false },
  { codigo: "1.1.03.001", nome: "Materials Inventory", parentCodigo: "1.1.03", tipo: "ASSET", natureza: "DEBIT", nivel: 4 },
  { codigo: "1.1.03.002", nome: "Equipment Inventory", parentCodigo: "1.1.03", tipo: "ASSET", natureza: "DEBIT", nivel: 4 },
  
  // ... (adicionar todas as contas acima)
  
  // Revenue
  { codigo: "4.1", nome: "Service Revenue", tipo: "REVENUE", natureza: "CREDIT", nivel: 2, aceitaLancamento: false },
  { codigo: "4.1.01", nome: "Construction Services", parentCodigo: "4.1", tipo: "REVENUE", natureza: "CREDIT", nivel: 3, projetoObrigatorio: true, centroCustoObrigatorio: true },
  
  // COGS
  { codigo: "6.1", nome: "Materials COGS", tipo: "COGS", natureza: "DEBIT", nivel: 2, aceitaLancamento: false },
  { codigo: "6.1.01", nome: "Construction Materials COGS", parentCodigo: "6.1", tipo: "COGS", natureza: "DEBIT", nivel: 3, projetoObrigatorio: true, centroCustoObrigatorio: true },
  
  // Expenses
  { codigo: "5.1.01", nome: "Salaries - Operations", tipo: "EXPENSE", natureza: "DEBIT", nivel: 3, centroCustoObrigatorio: true },
  { codigo: "5.2.01", nome: "Salaries - Admin", tipo: "EXPENSE", natureza: "DEBIT", nivel: 3, centroCustoObrigatorio: true },
  { codigo: "5.3.01", nome: "Salaries - Sales & Marketing", tipo: "EXPENSE", natureza: "DEBIT", nivel: 3, centroCustoObrigatorio: true },
]

async function seedCOA() {
  console.log('Seeding Chart of Accounts for Texas...')
  
  // Criar hierarquia (pais primeiro, depois filhos)
  for (const account of chartOfAccounts) {
    const parent = account.parentCodigo 
      ? await prisma.account.findUnique({ where: { codigo: account.parentCodigo } })
      : null
    
    await prisma.account.create({
      data: {
        codigo: account.codigo,
        nome: account.nome,
        nomeCompleto: parent ? `${parent.nomeCompleto} > ${account.nome}` : account.nome,
        parentId: parent?.id,
        nivel: account.nivel,
        caminho: parent ? `${parent.caminho},${parent.id}` : '',
        tipo: account.tipo,
        natureza: account.natureza,
        aceitaLancamento: account.aceitaLancamento ?? true,
        projetoObrigatorio: account.projetoObrigatorio ?? false,
        centroCustoObrigatorio: account.centroCustoObrigatorio ?? false,
        criadoPor: 1  // Admin user
      }
    })
  }
  
  console.log('✅ Chart of Accounts seeded successfully!')
}

seedCOA()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

---

## ✅ VALIDAÇÕES

### Balance Equation
```
ASSETS = LIABILITIES + EQUITY
```

### P&L Equation
```
NET PROFIT = REVENUE - COGS - EXPENSES
```

### Gross Profit
```
GROSS PROFIT = REVENUE - COGS
GROSS MARGIN % = (GROSS PROFIT / REVENUE) × 100
```

### Net Profit
```
NET PROFIT = GROSS PROFIT - EXPENSES
NET MARGIN % = (NET PROFIT / REVENUE) × 100
```

---

**Status:** ✅ COA completo para operação Texas  
**Total de Contas:** ~80 contas ativas  
**Próximo:** FINANCEIRO-HOOKS-AUTOMACOES.md
