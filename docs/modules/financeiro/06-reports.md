# 📊 RELATÓRIOS & DASHBOARDS - MÓDULO FINANCEIRO

**6 Relatórios Prioritários + 3 Dashboards Executivos**  
**Objetivo:** Transformar dados financeiros em inteligência de negócio  
**"Financeiro = Cérebro da Empresa"** 🧠

---

## 🎯 VISÃO GERAL

### Hierarquia de Relatórios

```
┌─────────────────────────────────────────────────────────────┐
│                   INTELIGÊNCIA FINANCEIRA                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📈 OPERACIONAIS (Dia a Dia)                               │
│  ├─ Fluxo de Caixa (entradas/saídas)                      │
│  ├─ DRE por Projeto (lucro real)                          │
│  ├─ Margem por Projeto (budget vs real)                   │
│  └─ Aging A/R (cobranças pendentes)                       │
│                                                             │
│  🔮 ESTRATÉGICOS (Projeção)                                │
│  ├─ Cash Forecast 30/60/90d (projeção saldo)             │
│  └─ Budget vs Real (drill-down hierárquico)              │
│                                                             │
│  🎯 DASHBOARDS EXECUTIVOS                                  │
│  ├─ CEO: Visão geral (lucro, tendências, alertas)        │
│  ├─ CFO: Cash flow, A/R, despesas, conciliações          │
│  └─ Gerente: Custo real vs orçado por projeto            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 RELATÓRIO #1: Fluxo de Caixa

### Objetivo
Visualizar entradas e saídas de caixa, saldo acumulado, tendências.

### Visualizações

#### 1.1 Gráfico de Linha
```typescript
interface CashFlowChartData {
  labels: string[]  // ['01/01', '02/01', ..., '31/01']
  datasets: [
    {
      label: 'Entradas'
      data: number[]  // [5000, 0, 12000, ...]
      color: 'green'
    },
    {
      label: 'Saídas'
      data: number[]  // [2000, 3500, 1800, ...]
      color: 'red'
    },
    {
      label: 'Saldo Acumulado'
      data: number[]  // [15000, 18000, 26200, ...]
      color: 'blue'
      type: 'line'
    }
  ]
}
```

**Exemplo Visual:**
```
$30k ┤                             ╭─Saldo
     │                         ╭───╯
$25k ┤                     ╭───╯
     │                 ╭───╯
$20k ┤     ╭───────────╯      ↑Entradas
     │ ╭───╯                   ↓Saídas
$15k ┼─╯────────────────────────────────
     0   5   10  15  20  25  30 (dias)
```

#### 1.2 Tabela Detalhada
| Data       | Entradas  | Saídas    | Saldo Diário | Saldo Acumulado |
|------------|-----------|-----------|--------------|-----------------|
| 01/01/2025 | $5,000.00 | $2,000.00 | +$3,000.00   | $15,000.00      |
| 02/01/2025 | $0.00     | $3,500.00 | -$3,500.00   | $11,500.00      |
| 03/01/2025 | $12,000.00| $1,800.00 | +$10,200.00  | $21,700.00      |
| ...        | ...       | ...       | ...          | ...             |
| **TOTAL**  | **$87,000**| **$65,000**| **+$22,000**| **$37,000**     |

#### 1.3 Filtros
- **Período:** dia, semana, mês, trimestre, ano, customizado
- **Projeto:** todos, projeto específico
- **Centro de Custo:** todos, departamento específico
- **Bank Account:** todos, conta específica

### Query Backend
```typescript
// GET /api/reports/cash-flow?periodo=mes&ano=2025&mes=1

interface CashFlowReportParams {
  dataInicio: Date
  dataFim: Date
  projetoId?: number
  centroCustoId?: number
  bankAccountId?: number
}

async function getCashFlowReport(params: CashFlowReportParams) {
  // 1. Buscar todas entradas (Bank debit)
  const entradas = await prisma.ledgerEntry.groupBy({
    by: ['transaction.data'],
    where: {
      transaction: {
        data: { gte: params.dataInicio, lte: params.dataFim },
        projetoId: params.projetoId,
        centroCustoId: params.centroCustoId
      },
      account: { tipo: 'ASSET', codigo: { startsWith: '1.1.01' } },  // Cash/Bank
      debito: { gt: 0 }
    },
    _sum: { debito: true }
  })

  // 2. Buscar todas saídas (Bank credit)
  const saidas = await prisma.ledgerEntry.groupBy({
    by: ['transaction.data'],
    where: {
      transaction: {
        data: { gte: params.dataInicio, lte: params.dataFim },
        projetoId: params.projetoId,
        centroCustoId: params.centroCustoId
      },
      account: { tipo: 'ASSET', codigo: { startsWith: '1.1.01' } },
      credito: { gt: 0 }
    },
    _sum: { credito: true }
  })

  // 3. Agregar por data
  const cashFlowByDate = aggregateByDate(entradas, saidas, params.dataInicio)

  // 4. Calcular saldo acumulado
  let saldoAcumulado = await getSaldoInicial(params.dataInicio)
  const result = cashFlowByDate.map(day => {
    saldoAcumulado += day.entradas - day.saidas
    return {
      ...day,
      saldoAcumulado
    }
  })

  return result
}
```

### Exportação
- **PDF:** Layout formatado com gráfico + tabela
- **Excel:** Planilha com fórmulas, gráfico embutido
- **CSV:** Dados tabulares simples

---

## 💼 RELATÓRIO #2: DRE (P&L) por Projeto

### Objetivo
Demonstração de Resultado por Projeto (Profit & Loss Statement).

### Estrutura DRE

```
┌─────────────────────────────────────────────────────────────┐
│              DRE - PROJETO: CASA AUSTIN                     │
│                 Período: Q4 2025                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RECEITA BRUTA                              $85,000.00      │
│    Service Revenue                           $75,000.00     │
│    Material Sales Revenue                    $10,000.00     │
│                                                             │
│  (-) CUSTO DOS SERVIÇOS (COGS)             ($42,500.00)    │
│    Materials COGS                           ($25,000.00)    │
│    Labor COGS                               ($12,000.00)    │
│    Subcontractor COGS                        ($4,500.00)    │
│    Equipment COGS                            ($1,000.00)    │
│                                                             │
│  = LUCRO BRUTO                               $42,500.00     │
│    Margem Bruta: 50.0%                                      │
│                                             ─────────────   │
│                                                             │
│  (-) DESPESAS OPERACIONAIS                  ($15,000.00)    │
│    Salários - Operacional                    ($8,000.00)    │
│    Vehicle Expenses                          ($3,000.00)    │
│    Tools & Equipment Maintenance             ($2,000.00)    │
│    Logistics                                 ($2,000.00)    │
│                                                             │
│  = LUCRO OPERACIONAL (EBIT)                  $27,500.00     │
│    Margem Operacional: 32.4%                                │
│                                             ─────────────   │
│                                                             │
│  (-) DESPESAS ADMINISTRATIVAS                ($5,000.00)    │
│    Alocação ADM (10% receita)                ($8,500.00)    │
│    + Recuperação Centro Custo                 $3,500.00     │
│                                                             │
│  = LUCRO LÍQUIDO                             $22,500.00     │
│    Margem Líquida: 26.5%                    ═════════════   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Drill-down por Centro de Custo

```typescript
interface DREPorCentroCusto {
  centroCusto: CentroCusto
  receita: number
  cogs: {
    materiais: number
    maoObra: number
    subcontratados: number
    equipamentos: number
    total: number
  }
  lucroBruto: number
  margemBruta: number  // %
  despesasOper: {
    salarios: number
    veiculos: number
    ferramentas: number
    logistica: number
    outras: number
    total: number
  }
  lucroOperacional: number
  margemOperacional: number  // %
  despesasAdm: number  // Alocação proporcional
  lucroLiquido: number
  margemLiquida: number  // %
}
```

### Comparativo Multi-Projetos

| Projeto         | Receita    | COGS       | Lucro Bruto | Desp. Oper | Lucro Líquido | Margem % |
|-----------------|------------|------------|-------------|------------|---------------|----------|
| Casa Austin     | $85,000    | $42,500    | $42,500     | $15,000    | **$22,500**   | **26.5%** |
| Reforma Escritório | $45,000 | $28,000    | $17,000     | $8,000     | **$6,500**    | **14.4%** |
| Manutenção ABC  | $12,000    | $5,500     | $6,500      | $2,000     | **$3,500**    | **29.2%** |
| **TOTAL**       | **$142,000** | **$76,000** | **$66,000** | **$25,000** | **$32,500**   | **22.9%** |

### Query Backend
```typescript
// GET /api/reports/dre?projetoId=123&periodo=2025-Q4

async function getDREPorProjeto(projetoId: number, dataInicio: Date, dataFim: Date) {
  // 1. Receita (Revenue accounts)
  const receita = await prisma.ledgerEntry.aggregate({
    where: {
      projetoId,
      transaction: { data: { gte: dataInicio, lte: dataFim } },
      account: { tipo: 'REVENUE' },
      credito: { gt: 0 }
    },
    _sum: { credito: true }
  })

  // 2. COGS (por categoria)
  const cogsMateriais = await sumAccountsByPrefix(projetoId, '6.1', dataInicio, dataFim)
  const cogsMO = await sumAccountsByPrefix(projetoId, '6.2', dataInicio, dataFim)
  const cogsSub = await sumAccountsByPrefix(projetoId, '6.3', dataInicio, dataFim)
  const cogsEquip = await sumAccountsByPrefix(projetoId, '6.4', dataInicio, dataFim)
  
  const cogTotal = cogsMateriais + cogsMO + cogsSub + cogsEquip
  const lucroBruto = receita._sum.credito - cogTotal
  const margemBruta = (lucroBruto / receita._sum.credito) * 100

  // 3. Despesas Operacionais (expense accounts)
  const despesasOper = await sumAccountsByPrefix(projetoId, '5.1', dataInicio, dataFim)  // OPE

  const lucroOperacional = lucroBruto - despesasOper
  const margemOperacional = (lucroOperacional / receita._sum.credito) * 100

  // 4. Despesas Administrativas (alocação proporcional)
  const despesasAdm = receita._sum.credito * 0.10  // 10% da receita

  const lucroLiquido = lucroOperacional - despesasAdm
  const margemLiquida = (lucroLiquido / receita._sum.credito) * 100

  return {
    receita: receita._sum.credito,
    cogs: { materiais: cogsMateriais, maoObra: cogsMO, subcontratados: cogsSub, equipamentos: cogsEquip, total: cogTotal },
    lucroBruto,
    margemBruta,
    despesasOper,
    lucroOperacional,
    margemOperacional,
    despesasAdm,
    lucroLiquido,
    margemLiquida
  }
}
```

### Alertas
- 🚨 Margem Bruta < 30% (vermelho)
- ⚠️ Margem Bruta 30-40% (amarelo)
- ✅ Margem Bruta > 40% (verde)

---

## 📈 RELATÓRIO #3: Margem por Projeto (Budget vs Real)

### Objetivo
Comparar orçamento planejado vs custo real, identificar variâncias.

### Tabela Principal

| Item              | Orçado     | Real       | Variância $ | Variância % | Status |
|-------------------|------------|------------|-------------|-------------|--------|
| **RECEITA**       | $85,000    | $87,000    | +$2,000     | +2.4%       | ✅ |
| **COGS**          | $40,000    | $42,500    | -$2,500     | -6.3%       | ⚠️ |
| - Materiais       | $24,000    | $25,000    | -$1,000     | -4.2%       | ⚠️ |
| - Mão de Obra     | $11,000    | $12,000    | -$1,000     | -9.1%       | 🚨 |
| - Subcontratados  | $4,000     | $4,500     | -$500       | -12.5%      | 🚨 |
| - Equipamentos    | $1,000     | $1,000     | $0          | 0%          | ✅ |
| **LUCRO BRUTO**   | $45,000    | $44,500    | -$500       | -1.1%       | ⚠️ |
| **MARGEM BRUTA**  | 52.9%      | 51.1%      | -1.8pp      | -         | ⚠️ |
| **DESP. OPER**    | $14,000    | $15,000    | -$1,000     | -7.1%       | ⚠️ |
| **LUCRO LÍQUIDO** | $31,000    | $27,500    | -$3,500     | -11.3%      | 🚨 |
| **MARGEM LÍQUIDA**| 36.5%      | 31.6%      | -4.9pp      | -         | 🚨 |

### Gráfico de Barras Comparativo
```
$50k ┤         ORÇADO vs REAL
     │
$40k ┤ ████████  ████████        ████████  ██████
     │ ████████  ████████        ████████  ██████
$30k ┤ ████████  ████████        ████████  ██████
     │ ████████  ████████        ████████  ██████
$20k ┤ ████████  ████████        ████████  ██████
     │ ████████  ████████        ████████  ██████
$10k ┤ ████████  ████████        ████████  ██████
     │ ████████  ████████        ████████  ██████
   0 ┴─────────────────────────────────────────────
     Receita  COGS   Lucro Bruto  Desp  Lucro Líq
      Orçado: ████  Real: ████
```

### Drill-down Hierárquico (Centro de Custo)

```
GLADPROS (TOTAL)
└─ OPERACIONAL
   ├─ Obras
   │  ├─ Casa Austin
   │  │  ├─ Materiais: $25k (orçado $24k) ⚠️ -4.2%
   │  │  ├─ MO: $12k (orçado $11k) 🚨 -9.1%
   │  │  └─ Subcontratados: $4.5k (orçado $4k) 🚨 -12.5%
   │  └─ Reforma Escritório
   │     └─ ...
   └─ Manutenção
      └─ ...
```

### Query Backend
```typescript
// GET /api/reports/margem-projeto?projetoId=123

async function getMargemPorProjeto(projetoId: number) {
  // 1. Buscar orçamento do projeto
  const orcamento = await prisma.orcamento.findFirst({
    where: { projetoId, status: 'ATIVO' }
  })

  if (!orcamento) {
    throw new Error('Projeto sem orçamento ativo')
  }

  // 2. Buscar breakdown orçado (de PropostaEtapas ou manual)
  const orcamentoBreakdown = await getOrcamentoBreakdown(orcamento.id)

  // 3. Buscar custo real (do Ledger)
  const custoReal = await getCustoRealDetalhado(projetoId)

  // 4. Calcular variâncias
  const varianciaTotal = custoReal.total - orcamentoBreakdown.total
  const varianciaPercent = (varianciaTotal / orcamentoBreakdown.total) * 100

  return {
    orcado: orcamentoBreakdown,
    real: custoReal,
    variancia: {
      valor: varianciaTotal,
      percentual: varianciaPercent,
      status: varianciaPercent < -10 ? 'CRITICO' : varianciaPercent < 0 ? 'ATENCAO' : 'OK'
    }
  }
}
```

### Alertas
- 🚨 **Crítico:** Variância > 10% negativa (estourou orçamento)
- ⚠️ **Atenção:** Variância 5-10% negativa
- ✅ **OK:** Variância dentro de ±5%
- 🎯 **Excelente:** Variância positiva (economizou)

---

## 📅 RELATÓRIO #4: Aging A/R (Accounts Receivable)

### Objetivo
Identificar invoices pendentes de pagamento, priorizar cobranças.

### Tabela Aging Buckets

| Cliente          | 0-30 dias | 31-60 dias | 61-90 dias | > 90 dias | **Total A/R** |
|------------------|-----------|------------|------------|-----------|---------------|
| ABC Construction | $12,000   | $0         | $0         | $0        | **$12,000**   |
| XYZ Corp         | $5,000    | $8,000     | $0         | $0        | **$13,000**   |
| Acme Inc         | $0        | $3,000     | $7,000     | $2,000    | **$12,000**   |
| Smith Family     | $0        | $0         | $0         | $15,000   | **$15,000** 🚨|
| **TOTAL**        | **$17,000**| **$11,000** | **$7,000** | **$17,000** | **$52,000**   |
| **% do Total**   | **32.7%** | **21.2%**  | **13.5%**  | **32.7%** 🚨| **100%**     |

### Gráfico Pizza
```
      Aging A/R Distribution
    
      ╱────────╲
     ╱32.7%     ╲
    │  0-30d     │
    │            │  32.7%
    │  21.2%     │  >90d 🚨
     ╲  31-60d  ╱
      ╲   13.5%╱
       ╲ 61-90d╱
        ╲────╱
```

### Detalhamento por Invoice

| Invoice #   | Cliente      | Data Emissão | Vencimento | Dias Atraso | Valor      | Status    | Ações      |
|-------------|--------------|--------------|------------|-------------|------------|-----------|------------|
| INV-2025-001| Smith Family | 2024-08-15   | 2024-09-15 | **120** 🚨  | $15,000.00 | OVERDUE   | [Cobrar] [Escalonar] |
| INV-2025-012| Acme Inc     | 2024-10-20   | 2024-11-20 | **73**  🚨  | $7,000.00  | OVERDUE   | [Cobrar] |
| INV-2025-034| XYZ Corp     | 2024-11-10   | 2024-12-10 | **33**  ⚠️  | $8,000.00  | OVERDUE   | [Lembrete] |
| INV-2025-089| ABC Const    | 2025-01-05   | 2025-02-05 | 8           | $12,000.00 | SENT      | [Monitorar] |

### Query Backend
```typescript
// GET /api/reports/aging-ar?dataReferencia=2025-01-13

async function getAgingAR(dataReferencia: Date = new Date()) {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'VIEWED', 'PARTIAL_PAID', 'OVERDUE'] },
      saldo: { gt: 0 }
    },
    include: { cliente: true }
  })

  const aging = invoices.map(inv => {
    const diasAtraso = differenceInDays(dataReferencia, inv.dataVencimento)
    const bucket = diasAtraso <= 30 ? '0-30' :
                   diasAtraso <= 60 ? '31-60' :
                   diasAtraso <= 90 ? '61-90' : '>90'
    
    return {
      invoiceId: inv.id,
      numeroInvoice: inv.numeroInvoice,
      clienteId: inv.clienteId,
      clienteNome: inv.cliente.nome,
      dataEmissao: inv.dataEmissao,
      dataVencimento: inv.dataVencimento,
      diasAtraso,
      bucket,
      saldo: inv.saldo,
      status: inv.status
    }
  })

  // Agrupar por bucket
  const summary = {
    '0-30': aging.filter(a => a.bucket === '0-30').reduce((sum, a) => sum + a.saldo, 0),
    '31-60': aging.filter(a => a.bucket === '31-60').reduce((sum, a) => sum + a.saldo, 0),
    '61-90': aging.filter(a => a.bucket === '61-90').reduce((sum, a) => sum + a.saldo, 0),
    '>90': aging.filter(a => a.bucket === '>90').reduce((sum, a) => sum + a.saldo, 0)
  }

  const total = Object.values(summary).reduce((sum, val) => sum + val, 0)

  return {
    summary,
    total,
    percentages: {
      '0-30': (summary['0-30'] / total) * 100,
      '31-60': (summary['31-60'] / total) * 100,
      '61-90': (summary['61-90'] / total) * 100,
      '>90': (summary['>90'] / total) * 100
    },
    detalhamento: aging
  }
}
```

### Ações Automatizadas
- **0-30 dias:** Monitoramento passivo
- **31-60 dias:** Enviar lembrete automático (dunning)
- **61-90 dias:** Overdue notice + contato telefônico
- **> 90 dias:** Escalação (jurídico, cobrança externa)

---

## 🔮 RELATÓRIO #5: Cash Forecast 30/60/90 Dias

### Objetivo
Projetar saldo de caixa futuro baseado em entradas/saídas previstas.

### Tabela Forecast

| Data       | Saldo Inicial | Entradas Previstas | Saídas Previstas | Saldo Projetado | Status  |
|------------|---------------|--------------------|--------------------|-----------------|---------|
| Hoje       | $37,000       | -                  | -                  | $37,000         | ✅      |
| 15/01/2025 | $37,000       | $12,000 (INV-089)  | $5,000 (A/P)       | $44,000         | ✅      |
| 20/01/2025 | $44,000       | $8,000 (INV-034)   | $3,000 (Salários)  | $49,000         | ✅      |
| 28/01/2025 | $49,000       | $0                 | $12,000 (Folha)    | $37,000         | ⚠️      |
| 05/02/2025 | $37,000       | $7,000 (INV-012)   | $8,000 (Fornec)    | $36,000         | ⚠️      |
| 15/02/2025 | $36,000       | $15,000 (INV-001?) | $4,000 (Diversos)  | $47,000         | ✅      |
| ...        | ...           | ...                | ...                | ...             | ...     |
| **30d**    | -             | **$42,000**        | **$32,000**        | **$47,000**     | ✅      |
| **60d**    | -             | **$78,000**        | **$65,000**        | **$50,000**     | ✅      |
| **90d**    | -             | **$112,000**       | **$98,000**        | **$51,000**     | ✅      |

### Gráfico de Linha Projetado
```
$60k ┤                    Saldo Projetado
     │                 ╭──────────────────
$50k ┤             ╭───╯  ⚠️ Queda temporária
     │         ╭───╯
$40k ┤─────────╯
     │    ✅ Seguro
$30k ┤
     │    🚨 Limite crítico ($25k)
$20k ┼─────────────────────────────────────
     0   15   30   45   60   75   90 (dias)
```

### Origem dos Dados

#### Entradas Previstas:
- **Invoices SENT não pagas:** vencimento futuro
- **Invoices OVERDUE:** projeção pessimista (+30d do vencimento)
- **Receita recorrente:** contratos de manutenção

#### Saídas Previstas:
- **A/P vencendo:** fornecedores, folha, impostos
- **Despesas fixas:** aluguel, utilities, seguros
- **Despesas variáveis:** média móvel 3 meses

### Query Backend
```typescript
// GET /api/reports/cash-forecast?dias=90

async function getCashForecast(dias: number = 90) {
  const hoje = new Date()
  const dataFim = addDays(hoje, dias)

  // 1. Saldo inicial (saldo atual Bank accounts)
  const saldoInicial = await getBankAccountsTotalBalance()

  // 2. Entradas previstas (invoices não pagas)
  const entradasPrevistas = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'VIEWED', 'PARTIAL_PAID', 'OVERDUE'] },
      saldo: { gt: 0 },
      dataVencimento: { lte: dataFim }
    },
    select: {
      dataVencimento: true,
      saldo: true,
      numeroInvoice: true,
      status: true
    }
  })

  // Ajustar data prevista (OVERDUE: +30 dias do vencimento)
  const entradasAjustadas = entradasPrevistas.map(inv => ({
    data: inv.status === 'OVERDUE' ? addDays(inv.dataVencimento, 30) : inv.dataVencimento,
    valor: inv.saldo,
    tipo: 'ENTRADA',
    origem: inv.numeroInvoice
  }))

  // 3. Saídas previstas (A/P)
  const saidasAP = await prisma.contasPagar.findMany({
    where: {
      status: 'PENDENTE',
      dataVencimento: { lte: dataFim }
    },
    select: {
      dataVencimento: true,
      valor: true,
      descricao: true
    }
  })

  const saidasAjustadas = saidasAP.map(ap => ({
    data: ap.dataVencimento,
    valor: ap.valor,
    tipo: 'SAIDA',
    origem: ap.descricao
  }))

  // 4. Despesas fixas (projetar)
  const despesasFixas = await projetarDespesasFixas(hoje, dataFim)  // Aluguel, utilities, etc.

  // 5. Consolidar tudo
  const movimentacoes = [
    ...entradasAjustadas,
    ...saidasAjustadas,
    ...despesasFixas
  ].sort((a, b) => a.data.getTime() - b.data.getTime())

  // 6. Calcular saldo projetado dia a dia
  let saldoAtual = saldoInicial
  const forecast = []

  for (const mov of movimentacoes) {
    if (mov.tipo === 'ENTRADA') {
      saldoAtual += mov.valor
    } else {
      saldoAtual -= mov.valor
    }

    forecast.push({
      data: mov.data,
      tipo: mov.tipo,
      valor: mov.valor,
      origem: mov.origem,
      saldoProjetado: saldoAtual
    })
  }

  return {
    saldoInicial,
    forecast,
    resumo: {
      dias30: forecast.find(f => differenceInDays(f.data, hoje) >= 30),
      dias60: forecast.find(f => differenceInDays(f.data, hoje) >= 60),
      dias90: forecast.find(f => differenceInDays(f.data, hoje) >= 90)
    }
  }
}
```

### Alertas
- 🚨 **Crítico:** Saldo projetado < $25,000 (limite crítico)
- ⚠️ **Atenção:** Saldo projetado $25k-$35k
- ✅ **Seguro:** Saldo projetado > $35k

### Ações Recomendadas
- **Alerta Crítico:**
  - Acelerar cobranças (dunning agressivo)
  - Renegociar prazos A/P
  - Buscar linha de crédito emergencial
  - Postergar despesas não-essenciais

---

## 📊 RELATÓRIO #6: Budget vs Real (Hierárquico)

### Objetivo
Comparar orçamento vs gasto real com drill-down por Centro de Custo.

### Hierarquia Drill-down

```
┌─ GLADPROS (EMPRESA) ────────────────────────────────────────┐
│  Orçado: $500,000  │  Real: $485,000  │  Variância: +$15,000 (+3.0%) ✅
│
├─┬ OPERACIONAL (DEPARTAMENTO)
│ │  Orçado: $350,000  │  Real: $360,000  │  Variância: -$10,000 (-2.9%) ⚠️
│ │
│ ├─┬ Obras (SUBDEPARTAMENTO)
│ │ │  Orçado: $250,000  │  Real: $258,000  │  Variância: -$8,000 (-3.2%) ⚠️
│ │ │
│ │ ├── Casa Austin (PROJETO)
│ │ │   Orçado: $85,000  │  Real: $87,000  │  Variância: -$2,000 (-2.4%) ⚠️
│ │ │   ├─ Materiais: Orçado $24k │ Real $25k │ -$1k (-4.2%) ⚠️
│ │ │   ├─ MO: Orçado $11k │ Real $12k │ -$1k (-9.1%) 🚨
│ │ │   └─ Subcontratados: Orçado $4k │ Real $4.5k │ -$0.5k (-12.5%) 🚨
│ │ │
│ │ └── Reforma Escritório (PROJETO)
│ │     Orçado: $45,000  │  Real: $43,000  │  Variância: +$2,000 (+4.4%) ✅
│ │
│ └─┬ Manutenção (SUBDEPARTAMENTO)
│   │  Orçado: $100,000  │  Real: $102,000  │  Variância: -$2,000 (-2.0%) ⚠️
│   └── ...
│
├─┬ ADMINISTRATIVO (DEPARTAMENTO)
│ │  Orçado: $100,000  │  Real: $85,000  │  Variância: +$15,000 (+15.0%) ✅
│ │  ├─ Salários: Orçado $50k │ Real $45k │ +$5k (+10%) ✅
│ │  ├─ Rent & Utilities: Orçado $25k │ Real $22k │ +$3k (+12%) ✅
│ │  └─ ...
│
└─┬ COMERCIAL (DEPARTAMENTO)
    Orçado: $50,000  │  Real: $40,000  │  Variância: +$10,000 (+20.0%) ✅
    └── ...
```

### Breakdown por Categoria (Expenses)

| Categoria                | Orçado     | Real       | Variância $ | Variância % | Status |
|--------------------------|------------|------------|-------------|-------------|--------|
| **COGS**                 | $200,000   | $210,000   | -$10,000    | -5.0%       | ⚠️ |
| - Materials              | $120,000   | $125,000   | -$5,000     | -4.2%       | ⚠️ |
| - Labor                  | $55,000    | $60,000    | -$5,000     | -9.1%       | 🚨 |
| - Subcontractor          | $20,000    | $22,000    | -$2,000     | -10.0%      | 🚨 |
| - Equipment              | $5,000     | $3,000     | +$2,000     | +40.0%      | ✅ |
| **OPERACIONAL**          | $150,000   | $150,000   | $0          | 0%          | ✅ |
| - Salários               | $80,000    | $80,000    | $0          | 0%          | ✅ |
| - Vehicles               | $40,000    | $42,000    | -$2,000     | -5.0%       | ⚠️ |
| - Tools                  | $20,000    | $18,000    | +$2,000     | +10.0%      | ✅ |
| - Logistics              | $10,000    | $10,000    | $0          | 0%          | ✅ |
| **ADMINISTRATIVO**       | $100,000   | $85,000    | +$15,000    | +15.0%      | ✅ |
| **COMERCIAL**            | $50,000    | $40,000    | +$10,000    | +20.0%      | ✅ |
| **TOTAL**                | **$500,000** | **$485,000** | **+$15,000** | **+3.0%** | ✅ |

### Gráfico Sunburst (Hierarchical)
```
            ┌──────────────────────┐
            │     GLADPROS         │
            │   $485k / $500k      │
            └─────────┬────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    ┌───┴───┐     ┌───┴───┐     ┌───┴───┐
    │  OPE  │     │  ADM  │     │  COM  │
    │ $360k │     │  $85k │     │  $40k │
    └───┬───┘     └───────┘     └───────┘
        │
    ┌───┴───┐
    │ Obras │ Manutenção
    │$258k  │  $102k
```

### Query Backend
```typescript
// GET /api/reports/budget-vs-real?centroCustoId=1&periodo=2025-Q1

async function getBudgetVsReal(
  centroCustoId?: number,
  dataInicio?: Date,
  dataFim?: Date
) {
  // 1. Buscar orçamentos do período
  const orcamentos = await prisma.orcamento.findMany({
    where: {
      centroCustoId,
      status: 'ATIVO',
      dataInicio: { gte: dataInicio },
      dataFim: { lte: dataFim }
    },
    include: { centroCusto: true }
  })

  // 2. Para cada orçamento, calcular gasto real
  const results = await Promise.all(
    orcamentos.map(async orc => {
      const gastoReal = await calcularGastoOrcamento(orc)
      const variancia = orc.valorLimite - gastoReal
      const varianciaPercent = (variancia / orc.valorLimite) * 100

      return {
        orcamentoId: orc.id,
        centroCusto: orc.centroCusto,
        orcado: orc.valorLimite,
        real: gastoReal,
        variancia,
        varianciaPercent,
        status: varianciaPercent < -10 ? 'CRITICO' : varianciaPercent < 0 ? 'ATENCAO' : 'OK'
      }
    })
  )

  // 3. Drill-down hierárquico (se houver filhos)
  if (centroCustoId) {
    const filhos = await prisma.centroCusto.findMany({
      where: { parentId: centroCustoId }
    })

    const drillDown = await Promise.all(
      filhos.map(filho => getBudgetVsReal(filho.id, dataInicio, dataFim))
    )

    return {
      resumo: results,
      drillDown
    }
  }

  return results
}
```

---

## 🎯 DASHBOARD #1: CEO (Executivo)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                    CEO DASHBOARD                             │
│                  Visão Geral da Empresa                      │
└──────────────────────────────────────────────────────────────┘

┌─────────────┬─────────────┬─────────────┬─────────────┐
│   RECEITA   │ LUCRO LÍQU. │  MARGEM %   │  CASH FLOW  │
│   MENSAL    │   MENSAL    │   MENSAL    │   ATUAL     │
├─────────────┼─────────────┼─────────────┼─────────────┤
│  $142,000   │   $32,500   │   22.9%     │   $37,000   │
│  +12% ↑     │   +8% ↑     │   -1.2pp ↓  │   -5% ↓ ⚠️  │
└─────────────┴─────────────┴─────────────┴─────────────┘

┌───────────────────────────────────────────────────────────┐
│  RECEITA & LUCRO - Últimos 12 Meses                       │
│                                                           │
│ $150k ┤              ╭─Revenue                            │
│       │          ╭───╯                                    │
│ $100k ┤      ╭───╯                                        │
│       │  ╭───╯                                            │
│  $50k ┤──╯────Net Profit                                  │
│       │                                                   │
│     0 ┴───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───  │
│         Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec  │
└───────────────────────────────────────────────────────────┘

┌─────────────────────────────┬─────────────────────────────┐
│  TOP 5 PROJETOS LUCRATIVOS  │  AGING A/R                  │
│                             │                             │
│  1. Casa Austin     $22.5k  │  ┌─────────┐               │
│  2. Manutenção ABC  $15.2k  │  │ 32.7%   │ 0-30d         │
│  3. Reforma XYZ     $12.8k  │  │ 21.2%   │ 31-60d        │
│  4. Escritório DEF  $9.5k   │  │ 13.5%   │ 61-90d        │
│  5. Casa GHI        $7.2k   │  │ 32.7% 🚨│ >90d          │
│                             │  └─────────┘               │
└─────────────────────────────┴─────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  🚨 ALERTAS CRÍTICOS                                      │
│                                                           │
│  ⚠️ Cash Flow projetado abaixo de $25k em 30 dias        │
│  🚨 Orçamento "Casa Austin" estourou 110% (MO)            │
│  ⚠️ A/R >90 dias: $17k (32.7% do total) - Smith Family   │
│  🚨 Margem líquida Casa Austin caiu para 26.5% (target: 30%)│
└───────────────────────────────────────────────────────────┘
```

### Query Backend
```typescript
// GET /api/dashboards/ceo?periodo=mes

async function getCEODashboard(periodo: 'mes' | 'trimestre' | 'ano') {
  const { dataInicio, dataFim } = getPeriodoRange(periodo)

  // KPIs principais
  const receita = await getTotalReceita(dataInicio, dataFim)
  const lucroLiquido = await getLucroLiquido(dataInicio, dataFim)
  const margem = (lucroLiquido / receita) * 100
  const cashFlow = await getBankAccountsTotalBalance()

  // Tendências (comparar com período anterior)
  const periodoAnterior = getPeriodoAnteriorRange(periodo)
  const receitaAnterior = await getTotalReceita(periodoAnterior.dataInicio, periodoAnterior.dataFim)
  const receitaTendencia = ((receita - receitaAnterior) / receitaAnterior) * 100

  // Gráfico 12 meses
  const ultimos12Meses = await getReceitaLucroUltimos12Meses()

  // Top 5 projetos
  const topProjetos = await getTopProjetosLucrativos(5)

  // Aging A/R
  const agingAR = await getAgingAR()

  // Alertas críticos
  const alertas = await getAlertasCriticos()

  return {
    kpis: { receita, lucroLiquido, margem, cashFlow, receitaTendencia },
    grafico12Meses: ultimos12Meses,
    topProjetos,
    agingAR: agingAR.summary,
    alertas
  }
}
```

---

## 🎯 DASHBOARD #2: CFO (Financeiro)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                    CFO DASHBOARD                             │
│                Controle Financeiro Completo                  │
└──────────────────────────────────────────────────────────────┘

┌─────────────┬─────────────┬─────────────┬─────────────┐
│ CASH ATUAL  │   A/R       │   A/P       │ WORKING CAP │
├─────────────┼─────────────┼─────────────┼─────────────┤
│  $37,000    │  $52,000    │  $28,000    │  $61,000    │
│  -5% ↓ ⚠️   │  +8% ↑ ⚠️   │  -3% ↓ ✅   │  +12% ↑ ✅  │
└─────────────┴─────────────┴─────────────┴─────────────┘

┌───────────────────────────────────────────────────────────┐
│  CASH FLOW - 90 Dias Forecast                             │
│                                                           │
│ $60k ┤                    ╭──────Forecast                 │
│      │                ╭───╯                               │
│ $50k ┤            ╭───╯                                   │
│      │        ╭───╯                                       │
│ $40k ┤────────╯──────────────────────────────────────    │
│      │   ⚠️ Queda temporária                              │
│ $30k ┤                                                    │
│      │   🚨 Limite crítico                                │
│ $20k ┼────────────────────────────────────────────────   │
│      0   15   30   45   60   75   90 (dias)             │
└───────────────────────────────────────────────────────────┘

┌─────────────────────────────┬─────────────────────────────┐
│  DESPESAS POR CENTRO CUSTO  │  CONCILIAÇÕES PENDENTES     │
│                             │                             │
│  OPE:  $360k (72%)  █████   │  Chase Bank: Em andamento   │
│  ADM:  $85k  (17%)  ██      │  Wells Fargo: Concluída ✅  │
│  COM:  $40k  (8%)   █       │  Petty Cash: Divergência 🚨 │
│  Outros: $15k (3%)          │  AmEx Credit: Pendente      │
│                             │                             │
└─────────────────────────────┴─────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  A/R AGING (Priorizar Cobranças)                          │
│                                                           │
│  Cliente          0-30d  31-60d  61-90d  >90d 🚨 Total   │
│  Smith Family       $0     $0      $0   $15k    $15k 🚨  │
│  Acme Inc           $0    $3k     $7k    $2k    $12k     │
│  XYZ Corp          $5k    $8k      $0     $0    $13k     │
│  ABC Construction $12k     $0      $0     $0    $12k     │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  🚨 ALERTAS FINANCEIROS                                   │
│                                                           │
│  🚨 Cash projetado < $25k em 28 dias - URGENTE!           │
│  ⚠️ A/R >90 dias: $17k (32.7%) - Escalonar cobrança       │
│  ⚠️ Conciliação Petty Cash com divergência de $250        │
│  ⚠️ A/P vencendo em 7 dias: $8,500 (fornecedores)        │
└───────────────────────────────────────────────────────────┘
```

---

## 🎯 DASHBOARD #3: Gerente de Projeto

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                  GERENTE PROJETO DASHBOARD                   │
│                   Projeto: Casa Austin                       │
└──────────────────────────────────────────────────────────────┘

┌─────────────┬─────────────┬─────────────┬─────────────┐
│ CUSTO REAL  │  ORÇADO     │  VARIÂNCIA  │  MARGEM %   │
├─────────────┼─────────────┼─────────────┼─────────────┤
│  $42,500    │  $40,000    │  -$2,500    │  51.1%      │
│  COGS       │  BUDGET     │  -6.3% ⚠️   │  target: 52%│
└─────────────┴─────────────┴─────────────┴─────────────┘

┌───────────────────────────────────────────────────────────┐
│  BREAKDOWN: Custo Real vs Orçado                          │
│                                                           │
│  $30k ┤ ████████  ████████        ████████  ████████     │
│       │ ████████  ████████        ████████  ████████     │
│  $20k ┤ ████████  ████████        ████████  ██████       │
│       │ ████████  ████████        ████████  ██████       │
│  $10k ┤ ████████  ████████        ████████  ██████       │
│       │ ████████  ████████        ████████  ██████       │
│     0 ┴─────────────────────────────────────────────     │
│       Materiais   MO    Subcontrat  Equip   Total       │
│        Orçado: ████  Real: ████                          │
└───────────────────────────────────────────────────────────┘

┌─────────────────────────────┬─────────────────────────────┐
│  MATERIAIS (Top 10)         │  MÃO DE OBRA                │
│                             │                             │
│  1. Lumber 2x4    $8,500 ⚠️ │  Horas trabalhadas: 480h    │
│  2. Drywall       $6,200 ✅ │  Custo MO: $12,000          │
│  3. Paint         $3,800 ✅ │  Custo/hora: $25.00         │
│  4. Plumbing      $2,500 ✅ │                             │
│  5. Electrical    $2,000 ✅ │  Breakdown:                 │
│  6. Flooring      $1,500 ✅ │  - Carpinteiros: 320h       │
│  7. Windows       $800   ✅ │  - Ajudantes: 160h          │
│  8. Outros        $700   ✅ │                             │
│  TOTAL: $25,000 (orç $24k) │  Target: $11k  🚨 Excedeu   │
└─────────────────────────────┴─────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  SUBCONTRATADOS                                           │
│                                                           │
│  - Elétrica (ABC Electric): $2,000 ✅                     │
│  - Encanamento (XYZ Plumbing): $1,500 ✅                  │
│  - HVAC (Cool Air): $1,000 ✅                             │
│  TOTAL: $4,500 (orçado $4,000) ⚠️ -12.5%                  │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  ⚠️ ALERTAS DO PROJETO                                    │
│                                                           │
│  🚨 Custo MO estourou orçamento em $1,000 (-9.1%)         │
│  🚨 Subcontratados estouraram orçamento em $500 (-12.5%)  │
│  ⚠️ Materiais Lumber 2x4 acima do esperado (+4.2%)        │
│  ✅ Projeto dentro da margem target (51% vs 52%)          │
└───────────────────────────────────────────────────────────┘
```

---

## 📤 EXPORTAÇÃO DE RELATÓRIOS

### Formatos Suportados
- **PDF:** Layout formatado, gráficos, tabelas
- **Excel (.xlsx):** Planilhas com fórmulas, gráficos dinâmicos
- **CSV:** Dados tabulares simples

### Exemplo: Export PDF
```typescript
// GET /api/reports/cash-flow/export?formato=pdf

import PDFDocument from 'pdfkit'

async function exportCashFlowPDF(params) {
  const data = await getCashFlowReport(params)
  const doc = new PDFDocument()

  // Header
  doc.fontSize(20).text('GLADPROS - Relatório de Fluxo de Caixa', { align: 'center' })
  doc.fontSize(12).text(`Período: ${params.dataInicio} - ${params.dataFim}`, { align: 'center' })
  
  // Gráfico (usar biblioteca chart.js + canvas)
  const chartBuffer = await generateChartImage(data)
  doc.image(chartBuffer, { fit: [500, 300] })

  // Tabela
  doc.addPage()
  doc.fontSize(14).text('Detalhamento')
  // Renderizar tabela...

  return doc
}
```

---

## ✅ CHECKLIST RELATÓRIOS

### Backend APIs
- [ ] ⏳ GET /api/reports/cash-flow
- [ ] ⏳ GET /api/reports/dre
- [ ] ⏳ GET /api/reports/margem-projeto
- [ ] ⏳ GET /api/reports/aging-ar
- [ ] ⏳ GET /api/reports/cash-forecast
- [ ] ⏳ GET /api/reports/budget-vs-real
- [ ] ⏳ GET /api/dashboards/ceo
- [ ] ⏳ GET /api/dashboards/cfo
- [ ] ⏳ GET /api/dashboards/gerente

### Frontend Pages
- [ ] ⏳ 6 páginas de relatórios com gráficos
- [ ] ⏳ 3 dashboards executivos
- [ ] ⏳ Filtros (período, projeto, centro custo)
- [ ] ⏳ Drill-down hierárquico (Budget vs Real)

### Exportação
- [ ] ⏳ PDF generation (todos relatórios)
- [ ] ⏳ Excel export (.xlsx)
- [ ] ⏳ CSV export

### Testes
- [ ] ⏳ Unit: queries, cálculos
- [ ] ⏳ Integration: dados seed
- [ ] ⏳ E2E: visualizar → exportar

---

**Status:** ✅ Especificação completa de Relatórios & Dashboards  
**Próximo:** FINANCEIRO-APIs.md
