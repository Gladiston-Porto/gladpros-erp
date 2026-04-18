# GladPros — Financial Tax Compliance Playbook

> **Fonte**: IRS Publication 334 (Tax Guide for Small Business), Schedule C (Form 1040),
> Form 1120-S, Form 2553, Form 1040-ES, IRS Reasonable Compensation Guidelines.
>
> **Contexto**: GladPros LLC — Construction/Services — Dallas, Texas, USA.
> Single-tenant ERP. Todas as regras abaixo são para **US federal tax** no estado do Texas (sem state income tax).

---

## 1. Regimes Tributários Suportados

### 1.1 LLC Single-Member (Default)

| Aspecto | Regra |
|---------|-------|
| Entidade fiscal | Disregarded entity — IRS trata como sole proprietorship |
| Formulário principal | Schedule C (Form 1040) |
| Tributação | Lucro líquido → Form 1040 (income tax) + Schedule SE (self-employment tax) |
| Self-Employment Tax | 15.3% sobre net earnings (12.4% Social Security até $168,600/2024 + 2.9% Medicare) |
| Additional Medicare | 0.9% sobre earnings acima de $200,000 (single filer) |
| Compensação do owner | **Owner Draw** — NÃO é salário, NÃO é dedutível |
| Separação de contas | Obrigatória — conta business separada de pessoal |
| Payroll | Não tem payroll para owner; apenas para employees (W-2) e contractors (1099) |

**Fórmula de Taxable Income (LLC)**:
```
Gross Revenue (Schedule C, Line 7)
- Total Deductible Expenses (Schedule C, Lines 8-27)
= Net Profit/Loss (Schedule C, Line 31)
→ Goes to Form 1040 Line 8 (other income)
→ Goes to Schedule SE for self-employment tax
```

### 1.2 S-Corp (Form 2553 Election)

| Aspecto | Regra |
|---------|-------|
| Entidade fiscal | Pass-through corporation — Form 1120-S → K-1 → Form 1040 |
| Formulário principal | Form 1120-S (corporate return) + Schedule K-1 (owner's share) |
| Tributação | Salary: income tax + FICA; Distribution: income tax only (NO SE tax) |
| Reasonable Salary | IRS EXIGE que owner-employee receba salário "razoável" |
| FICA (employer + employee) | 15.3% total sobre salary (7.65% cada lado) |
| Distribution | Lucro após salary — não sujeito a self-employment tax |
| Payroll obrigatório | Sim — owner precisa de W-2, withholding, payroll tax returns |
| Formulários extras | Form 940 (FUTA), Form 941 (quarterly payroll), W-2, W-3 |

**Fórmula de Taxable Income (S-Corp)**:
```
Gross Revenue
- Deductible Business Expenses
- Owner Salary (dedutível para a empresa)
- Employer's share of FICA (7.65% do salary, dedutível)
= Net Corporate Income
→ Distributed via K-1 to owner's Form 1040
→ Owner salary also goes to W-2 → Form 1040
```

**Reasonable Salary — Critérios IRS**:
- Training and experience do owner
- Duties and responsibilities
- Time and effort devoted to the business
- Comparable salaries in similar businesses
- Construction/services owner-operators: tipicamente 40-60% do net income, mínimo ~$40,000-$60,000/ano (varia conforme receita)
- **⚠️ VALIDAR COM CONTADOR**: O valor exato de salário razoável deve ser definido pelo CPA

### 1.3 Alternância LLC ↔ S-Corp

| De → Para | Requer | Timing |
|-----------|--------|--------|
| LLC → S-Corp | Form 2553 (IRS), efetivo no início do ano fiscal | Deadline: Mar 15 do ano de efeito (ou 75 dias após formação) |
| S-Corp → LLC | Revogação da S election | Efetivo no início do próximo ano fiscal |

**No sistema**: O campo `tipoTributacao` no modelo `Empresa` controla qual regime está ativo. A troca gera:
1. Registro de `AuditLog` com o regime anterior e novo
2. Recálculo de todos os dashboards fiscais
3. Alerta ao owner sobre implicações
4. **NÃO retroage** — transações anteriores mantêm o regime vigente na data

---

## 2. Schedule C — Mapeamento de Linhas

> Schedule C mapeia TODAS as despesas dedutíveis para businesses individuais (LLC single-member).
> Para S-Corp, o mapeamento é similar mas vai para Form 1120-S.

### 2.1 Receita (Income)

| Schedule C Line | Descrição | Fonte no Sistema |
|-----------------|-----------|------------------|
| Line 1 | Gross receipts or sales | `Invoice` (status PAID) + `Revenue` |
| Line 2 | Returns and allowances | `Invoice` com refund/credit note |
| Line 4 | Cost of goods sold (COGS) | `Expense` where categoria = materials/COGS |
| Line 6 | Other income | `Revenue` não vinculada a Invoice |
| **Line 7** | **Gross income** | Line 1 - Line 2 - Line 4 + Line 6 |

### 2.2 Despesas (Expenses) — Mapeamento Completo

| Schedule C Line | Nome IRS | ExpenseCategory.slug | Construção/Serviços — Exemplos |
|-----------------|----------|---------------------|-------------------------------|
| Line 8 | Advertising | `advertising` | Google Ads, yard signs, vehicle wraps, business cards, website |
| Line 9 | Car and truck expenses | `car-truck` | Mileage/actual expenses para veículos de trabalho, combustível, manutenção frota |
| Line 10 | Commissions and fees | `commissions-fees` | Referral fees, broker commissions, payment processing fees (Stripe/Square) |
| Line 11 | Contract labor | `contract-labor` | 1099 subcontractors (subs, especialistas), freelancers |
| Line 12 | Depletion | `depletion` | N/A para construção (natural resources only) |
| Line 13 | Depreciation (Form 4562) | `depreciation` | Equipment, tools >$2,500, vehicles, Section 179 deduction |
| Line 14 | Employee benefit programs | `employee-benefits` | Health insurance (não owner), retirement contributions employees |
| Line 15 | Insurance (other than health) | `insurance` | General liability, workers' comp, commercial auto, bonding, E&O |
| Line 16a | Interest on mortgage | `interest-mortgage` | Business property mortgage interest |
| Line 16b | Interest, other | `interest-other` | Business loan interest, credit card interest, equipment financing |
| Line 17 | Legal and professional services | `legal-professional` | CPA/accountant fees, attorney fees, bookkeeper, consulting |
| Line 18 | Office expense | `office-expense` | Office supplies, paper, postage, small equipment <$200 |
| Line 19 | Pension and profit-sharing plans | `pension-plans` | SEP-IRA, SIMPLE IRA, solo 401(k) contributions |
| Line 20a | Rent — vehicles, machinery, equipment | `rent-equipment` | Tool/equipment rental, vehicle leases, crane rental |
| Line 20b | Rent — other business property | `rent-property` | Office space, warehouse, storage unit, shop rent |
| Line 21 | Repairs and maintenance | `repairs-maintenance` | Tool repair, vehicle maintenance, equipment servicing |
| Line 22 | Supplies | `supplies` | Construction supplies, safety gear, consumables, materials <$200 |
| Line 23 | Taxes and licenses | `taxes-licenses` | Business license, contractor license, property tax (business), state franchise tax, vehicle registration |
| Line 24a | Travel | `travel` | Airfare, hotel, rental car (business travel, not daily commute) |
| Line 24b | Deductible meals | `meals` | 50% deductible — client meals, travel meals (not entertainment) |
| Line 25 | Utilities | `utilities` | Electric, water, gas, phone, internet (business portion) |
| Line 26 | Wages | `wages` | W-2 employee wages (NOT owner salary in LLC, NOT 1099 contractors) |
| Line 27a | Other expenses | `other-expenses` | Anything not fitting lines 8-26: bank fees, software subscriptions (QuickBooks, GladPros), uniforms, safety training, permits, dumpster rental, porta-potty |

### 2.3 Categorias Especiais para Construção

| Categoria | scheduleCLine | Notas |
|-----------|---------------|-------|
| Materials (COGS) | Line 4 (COGS) | Materiais que viram parte do produto final (lumber, drywall, pipe, wire) |
| Subcontractor payments | Line 11 | Precisa de 1099-NEC se >$600/ano por sub |
| Tool purchases >$2,500 | Line 13 | Depreciation ou Section 179 immediate deduction |
| Tool purchases <$200 | Line 22 (Supplies) | Expense immediately |
| Tools $200-$2,500 | Line 22 or Line 13 | De minimis safe harbor election |
| Home office | Line 30 | Calculado separadamente (simplified: $5/sqft até $1,500 ou actual method) |
| Health insurance (owner, LLC) | Form 1040 adjustment | NÃO é Schedule C expense — é adjustment to income |
| Health insurance (owner, S-Corp) | W-2 + Form 1040 adjustment | Incluído no W-2 mas dedutível no 1040 |

---

## 3. Owner Compensation

### 3.1 LLC — Owner Draw

```
Tipo: OWNER_DRAW
Tributação: Nenhuma direta — é distribuição de lucro já tributado
Schedule C: NÃO aparece como expense
Contabilidade: Débito Cash/Bank, Crédito Owner's Equity
Frequência: A critério do owner (semanal, quinzenal, mensal, irregular)
Limite: Não pode exceder saldo bancário business + retained earnings
```

**Regras do sistema**:
- Registrar como `OwnerCompensation` tipo `OWNER_DRAW`
- NÃO incluir no cálculo de expenses dedutíveis
- Incluir na reconciliação bancária
- Mostrar no dashboard como "Retiradas do Proprietário"
- Alerta se draw > 80% do saldo disponível

### 3.2 S-Corp — Salary + Distribution

**Salary (W-2)**:
```
Tipo: SALARY
Tributação: Income tax + FICA (7.65% employee + 7.65% employer)
Form 1120-S: Dedutível como expense (Line 7 — Compensation of officers)
W-2: Emitido anualmente ao owner-employee
Payroll: Frequência regular obrigatória (biweekly ou semimonthly recomendado)
```

**Distribution**:
```
Tipo: DISTRIBUTION
Tributação: Income tax only (NO self-employment/FICA tax) — este é o benefício fiscal do S-Corp
K-1: Reportado via Schedule K-1 ao owner
Contabilidade: Débito Cash, Crédito Retained Earnings / AAA (Accumulated Adjustments Account)
Frequência: Após payroll processado, tipicamente mensal ou trimestral
Limite: NÃO pode exceder AAA (Accumulated Adjustments Account)
```

**Regras do sistema**:
- Salary: registrar como `OwnerCompensation` tipo `SALARY`, incluir no cálculo de despesas dedutíveis
- Distribution: registrar como `OwnerCompensation` tipo `DISTRIBUTION`, NÃO incluir nas despesas
- **Alerta**: Se salary < 30% do net income → avisar sobre "unreasonable compensation" risk
- **Alerta**: Se salary = 0 e há Distribution → BLOQUEIO — IRS exige salary antes de distribution
- Employer FICA (7.65%): registrar como Expense na categoria `taxes-licenses`

### 3.3 Comparativo de Economia S-Corp

```
Exemplo: Net Income = $150,000

LLC:
  Income tax: ~$30,000 (estimativa, varia por bracket)
  SE tax: $150,000 × 15.3% = $22,950
  Total: ~$52,950

S-Corp (salary = $70,000):
  Salary FICA: $70,000 × 15.3% = $10,710
  Distribution: $80,000 (sem SE tax)
  Income tax: ~$30,000
  Total: ~$40,710
  
  Economia: ~$12,240/ano
```

**⚠️ DISCLAIMER**: Valores são estimativas simplificadas. Taxas efetivas variam conforme filing status, deductions, credits. Sempre validar com CPA.

---

## 4. Quarterly Estimated Tax (Form 1040-ES)

### 4.1 Due Dates

| Quarter | Período de Income | Due Date | Observação |
|---------|-------------------|----------|------------|
| Q1 | Jan 1 – Mar 31 | **April 15** | Mesmo dia do tax return anual |
| Q2 | Apr 1 – May 31 | **June 15** | Período mais curto (2 meses) |
| Q3 | Jun 1 – Aug 31 | **September 15** | |
| Q4 | Sep 1 – Dec 31 | **January 15** (ano seguinte) | Ou file annual return by Jan 31 |

Se due date cai em weekend/holiday → próximo business day.

### 4.2 Cálculo

**LLC**:
```
Estimated Tax = Income Tax + Self-Employment Tax - Credits

Income Tax: Apply marginal brackets to estimated annual net profit
SE Tax: Net Profit × 92.35% × 15.3%
       (92.35% = employer-equivalent deduction)
```

**S-Corp**:
```
Estimated Tax = Income Tax on (Salary + Distribution) - Withholding on Salary

Se withholding no salary cobre 100% do tax → não precisa de estimated payments
```

### 4.3 Safe Harbor Rules

Para evitar penalty:
- Pagar ≥ **90%** do tax do ano corrente, OU
- Pagar ≥ **100%** do tax do ano anterior (110% se AGI > $150,000)

### 4.4 Regras do Sistema

- Track cada payment como `EstimatedTaxPayment` (quarter, due date, amount, actual paid, status)
- **30 dias antes** do due date: Alerta AMARELO "Estimated tax vence em 30 dias"
- **7 dias antes**: Alerta VERMELHO "Estimated tax vence em 7 dias"
- Calcular estimated tax automaticamente baseado no income YTD (ano corrente)
- Mostrar comparativo: estimated (sistema) vs actual paid vs safe harbor target
- Se underpaid → calcular potencial penalty estimada

---

## 5. Regras de Dedutibilidade

### 5.1 Critérios Gerais (IRS)

Uma despesa é dedutível se:
1. **Ordinary** — comum e aceita no ramo (construção/serviços)
2. **Necessary** — útil e apropriada para o negócio
3. **Business purpose** — primariamente para o negócio (não pessoal)
4. **Documented** — recibo, nota fiscal, ou registro adequado

### 5.2 Regras por Tipo

| Tipo | Dedutível? | Regra | Campo no sistema |
|------|------------|-------|-----------------|
| Business expense normal | ✅ 100% | Ordinary & necessary | `dedutivel: true` |
| Owner Draw (LLC) | ❌ | Distribuição, não expense | `dedutivel: false` |
| Owner Salary (S-Corp) | ✅ 100% | Compensation of officers | `dedutivel: true` |
| Meals (business) | ✅ 50% | Somente com business purpose documentado | `dedutivel: true`, `percentualDedutivel: 50` |
| Entertainment | ❌ | Não dedutível desde TCJA 2017 | `dedutivel: false` |
| Personal expense | ❌ | Não é business expense | `dedutivel: false` |
| Mixed-use (phone, internet) | ✅ Parcial | Business % only | `dedutivel: true`, `percentualDedutivel: calculado` |
| Home office | ✅ Parcial | Simplified: $5/sqft até $1,500 | Calculado separadamente |
| Vehicle (business use) | ✅ Parcial | Standard mileage (67¢/mile 2024) ou actual expenses | `percentualDedutivel: business_use_%` |
| Fines/penalties | ❌ | Nunca dedutível | `dedutivel: false` |
| Political contributions | ❌ | Nunca dedutível | `dedutivel: false` |

### 5.3 Documentação Exigida

| Tipo de Despesa | Documentação Mínima |
|-----------------|---------------------|
| Qualquer expense >$75 | Recibo com data, valor, vendor, descrição |
| Meals | Recibo + quem participou + business purpose |
| Travel | Datas, destino, business purpose |
| Vehicle | Log de mileage OU registros de expenses reais |
| Contractor payment >$600/ano | 1099-NEC emitido ao contractor |

---

## 6. Reports para Contador (Accountant Export Pack)

### 6.1 Relatórios Obrigatórios

| Relatório | Frequência | Formato | Conteúdo |
|-----------|------------|---------|----------|
| Schedule C Summary | Anual + YTD | Excel + PDF | Todas as linhas do Schedule C com totais |
| Profit & Loss (P&L) | Mensal + Trimestral + Anual | Excel + PDF | Revenue - Expenses = Net Income, por categoria |
| Owner Compensation Summary | Anual | Excel + PDF | Todos draws/salary/distributions com datas e valores |
| Contractor Payments (1099) | Anual | Excel | Lista de 1099 contractors: nome, TIN, total pago (para emissão de 1099-NEC) |
| Bank Reconciliation | Mensal | Excel | Saldo sistema vs saldo banco, itens pendentes |
| Quarterly Tax Estimate | Trimestral | PDF | Income YTD, estimated tax, payments made, balance due |
| Expense Detail by Category | Anual + por período | Excel | Cada expense com data, vendor, valor, categoria, scheduleCLine, receipt ref |

### 6.2 Formato Excel

- Uma aba por categoria/seção
- Header com: Company name, período, data de geração
- Colunas tipadas (currency como número, datas como date)
- Total row no final de cada seção
- Sheet "Summary" como primeira aba

### 6.3 Formato PDF

- Header com logo GladPros + dados da empresa
- Estilo profissional, legível
- Page numbers
- Summary na primeira página
- Detail pages seguintes

---

## 7. Alertas e Validações Fiscais

### 7.1 Alertas Automáticos

| Alerta | Condição | Severidade | Ação |
|--------|----------|------------|------|
| Estimated tax approaching | 30 dias antes do due date | ⚠️ Warning | Notificação + banner |
| Estimated tax overdue | Past due date sem pagamento | 🔴 Critical | Notificação urgente |
| Underpayment risk | YTD payments < safe harbor | ⚠️ Warning | Calcular penalty estimada |
| Owner salary missing (S-Corp) | Regime S-Corp + sem salary registrado | 🔴 Critical | Bloqueio de distribution |
| Owner salary too low (S-Corp) | Salary < 30% net income | ⚠️ Warning | Sugestão de ajuste |
| 1099 threshold reached | Contractor total approaching $600 | ℹ️ Info | Lembrete de 1099-NEC |
| Unclassified expense | Expense sem scheduleCLine | ⚠️ Warning | Solicitar categorização |
| Mixed-use without % | Expense parcial sem percentualDedutivel | ⚠️ Warning | Solicitar % business use |
| Large cash transaction | Cash payment > $10,000 | 🔴 Critical | Form 8300 requirement |
| Expense without receipt | Expense >$75 sem receipt attachment | ⚠️ Warning | Solicitar comprovante |
| Revenue vs Invoice mismatch | Revenue total ≠ Invoice paid total | ⚠️ Warning | Reconciliação necessária |

### 7.2 Dashboard Fiscal

O dashboard fiscal deve mostrar:
1. **Regime atual**: LLC ou S-Corp (com data de vigência)
2. **YTD Net Income**: Revenue - Deductible Expenses
3. **Estimated Tax Liability**: Baseado no YTD extrapolado
4. **Quarterly Payments**: Paid vs Due, com status por quarter
5. **Owner Compensation YTD**: Total draws OU salary + distributions
6. **Schedule C Preview**: Mini-version com as linhas principais
7. **Alerts**: Lista de alertas pendentes

---

## 8. Integração com Módulos Existentes

### 8.1 Mapa de Dependências

```
Invoice (PAID) ──────────────────→ Revenue (auto-create?)
    │                                   │
    │                                   ▼
    │                          Tax Calculation
    │                                   │
    ▼                                   ▼
Accounts Receivable ───→ Bank Account (reconciliation)
                                        │
Expense ────────→ Schedule C Line ──→ Tax Calculation
    │                                   │
    │                                   ▼
    ▼                          Net Income
Worker (OWNER_OPERATOR) ──→ Owner Compensation ──→ Tax Impact
    │                                   │
    ▼                                   ▼
WorkEntry ──→ Hours tracked       Estimated Tax
Assignment ──→ Project linked      Payment Tracker
```

### 8.2 Invoice → Revenue → Tax

1. Invoice status → PAID: registrar como Revenue
2. Revenue classificada por tipo (project, OS, other)
3. Revenue → Schedule C Line 1 (gross receipts)
4. Revenue considerada para cálculo de quarterly estimate

### 8.3 Expense → Category → Schedule C

1. Expense criada com categoryId
2. CategoryId → ExpenseCategory com `scheduleCLine`
3. `dedutivel` flag determina se entra no cálculo
4. `percentualDedutivel` para categorias parciais (meals = 50%)
5. Expense total por scheduleCLine → Schedule C report

### 8.4 Worker (OWNER_OPERATOR) → Compensation → Tax

1. Worker com classification OWNER_OPERATOR = o owner
2. Worker pode ter WorkEntry (horas) e Assignment (projetos)
3. OwnerCompensation tracks draws/salary/distributions
4. Compensation type depende do regime (LLC = draw only, S-Corp = salary + distribution)
5. S-Corp salary → dedutível; Draw/Distribution → não dedutível

---

## 9. Disclaimer & Limites do Sistema

> **⚠️ AVISO IMPORTANTE**: Este sistema é uma FERRAMENTA DE GESTÃO, não substitui aconselhamento
> fiscal profissional. Todas as decisões fiscais devem ser validadas por um CPA (Certified Public Accountant)
> qualificado. Os cálculos de impostos são ESTIMATIVAS baseadas em regras gerais do IRS e podem
> não refletir condições específicas do contribuinte. GladPros não oferece tax advice.

- O sistema calcula estimativas, nunca valores definitivos
- Alteração de regime tributário requer validação pelo CPA
- Valores de reasonable salary (S-Corp) devem ser definidos pelo CPA
- Schedule C é pré-preenchido para facilitar — o CPA faz a versão final
- Todos os cálculos mostram tag: "Estimativa — consulte seu contador"
