# ⚡ HOOKS & AUTOMAÇÕES - MÓDULO FINANCEIRO

**Integração Automática:** Estoque ↔ Projetos ↔ Financeiro  
**Objetivo:** Zero intervenção manual para lançamentos contábeis  
**Tecnologia:** Event-driven hooks + Scheduled jobs

---

## 🎯 VISÃO GERAL

### Fluxo Automático Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE INTEGRAÇÃO                      │
└─────────────────────────────────────────────────────────────┘

1. COMPRA RECEBIDA
   ├─ Trigger: Compra.status = "RECEBIDA"
   ├─ Hook: onCompraRecebida()
   └─ Ledger: 
       ├─ Débito: Inventory (1.1.03.001)
       └─ Crédito: A/P (2.1.01.001)

2. ESTOQUE SAÍDA (Material usado em projeto)
   ├─ Trigger: Movimentacao.tipo = "SAIDA" && projetoId != null
   ├─ Hook: onEstoqueSaida()
   └─ Ledger:
       ├─ Débito: COGS Materials (6.1.01)
       └─ Crédito: Inventory (1.1.03.001)

3. INVOICE ENVIADA
   ├─ Trigger: Invoice.status = "DRAFT" → "SENT"
   ├─ Hook: onInvoiceSent()
   └─ Ledger:
       ├─ Débito: A/R (1.1.02.001)
       └─ Crédito: Revenue (4.1.01) + Sales Tax (2.1.02.001)

4. INVOICE PAGA
   ├─ Trigger: InvoicePayment created
   ├─ Hook: onInvoicePayment()
   └─ Ledger:
       ├─ Débito: Bank (1.1.01.001)
       └─ Crédito: A/R (1.1.02.001)

5. PROJETO CUSTO REAL SYNC
   ├─ Trigger: Job a cada 15min ou on-demand
   ├─ Job: syncProjetoCustoReal()
   └─ Update: Projeto.custoReal, lucroReal, margemReal

6. ORÇAMENTO ALERTAS
   ├─ Trigger: Job a cada 15min
   ├─ Job: checkOrcamentoAlertas()
   └─ Create: OrcamentoAlerta (80%, 100%, 110%)
```

---

## 🔧 HOOK #1: Compra Recebida → Inventory

### Trigger
```typescript
// src/hooks/financeiro/onCompraRecebida.ts

import { Compra } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { criarLedgerTransaction } from '@/lib/ledger'

export async function onCompraRecebida(compra: Compra) {
  // Validações
  if (compra.status !== 'RECEBIDA') {
    console.log(`[Hook] Compra ${compra.id} não está RECEBIDA, ignorando`)
    return
  }

  // Verificar se já foi contabilizada
  const jaContabilizada = await prisma.ledgerTransaction.findFirst({
    where: {
      origin: 'COMPRA_RECEBIDA',
      originId: compra.id,
      revertida: false
    }
  })

  if (jaContabilizada) {
    console.log(`[Hook] Compra ${compra.id} já foi contabilizada`)
    return
  }

  console.log(`[Hook] Contabilizando compra ${compra.id}...`)

  // Buscar contas
  const inventoryAccount = await prisma.account.findUnique({
    where: { codigo: '1.1.03.001' }  // Materials Inventory
  })

  const apAccount = await prisma.account.findUnique({
    where: { codigo: '2.1.01.001' }  // A/P Suppliers
  })

  if (!inventoryAccount || !apAccount) {
    throw new Error('Contas contábeis não encontradas (Inventory ou A/P)')
  }

  // Buscar fornecedor
  const fornecedor = compra.fornecedorId 
    ? await prisma.fornecedor.findUnique({ where: { id: compra.fornecedorId } })
    : null

  // Criar transaction
  const transaction = await criarLedgerTransaction({
    origin: 'COMPRA_RECEBIDA',
    originId: compra.id,
    originTable: 'compras',
    data: compra.dataRecebimento || new Date(),
    descricao: `Compra recebida - ${fornecedor?.nome || 'Fornecedor'}`,
    projetoId: compra.projetoId,
    fornecedorId: compra.fornecedorId,
    centroCustoId: compra.projetoId 
      ? await getCentroCustoPorProjeto(compra.projetoId)
      : null,
    entries: [
      {
        accountId: inventoryAccount.id,
        debito: compra.valorTotal,
        credito: 0,
        projetoId: compra.projetoId,
        fornecedorId: compra.fornecedorId,
        descricao: `Entrada estoque - ${compra.itens?.length || 0} itens`
      },
      {
        accountId: apAccount.id,
        debito: 0,
        credito: compra.valorTotal,
        fornecedorId: compra.fornecedorId,
        descricao: `A pagar - ${fornecedor?.nome || 'Fornecedor'}`
      }
    ]
  })

  console.log(`✅ [Hook] Compra ${compra.id} contabilizada - Transaction ${transaction.id}`)

  return transaction
}
```

### Integração Prisma Middleware
```typescript
// src/middleware/prisma-hooks.ts

prisma.$use(async (params, next) => {
  const result = await next(params)

  // Hook: onCompraRecebida
  if (params.model === 'Compra' && params.action === 'update') {
    const compra = result as Compra
    
    if (compra.status === 'RECEBIDA') {
      // Executar hook assíncrono (não bloqueia)
      onCompraRecebida(compra)
        .catch(err => console.error('[Hook Error]', err))
    }
  }

  return result
})
```

---

## 🔧 HOOK #2: Estoque Saída → COGS

### Trigger
```typescript
// src/hooks/financeiro/onEstoqueSaida.ts

import { Movimentacao } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { criarLedgerTransaction } from '@/lib/ledger'

export async function onEstoqueSaida(movimentacao: Movimentacao) {
  // Validações
  if (movimentacao.tipo !== 'SAIDA') {
    return
  }

  if (!movimentacao.projetoId) {
    console.log(`[Hook] Movimentação ${movimentacao.id} sem projeto, ignorando`)
    return
  }

  // Verificar se já foi contabilizada
  const jaContabilizada = await prisma.ledgerTransaction.findFirst({
    where: {
      origin: 'ESTOQUE_SAIDA',
      originId: movimentacao.id,
      revertida: false
    }
  })

  if (jaContabilizada) {
    console.log(`[Hook] Movimentação ${movimentacao.id} já contabilizada`)
    return
  }

  console.log(`[Hook] Contabilizando saída estoque ${movimentacao.id}...`)

  // Buscar material
  const material = await prisma.material.findUnique({
    where: { id: movimentacao.materialId }
  })

  if (!material) {
    throw new Error(`Material ${movimentacao.materialId} não encontrado`)
  }

  // Calcular custo
  const custoUnitario = material.custoMedio || material.ultimoCusto || 0
  const custoTotal = movimentacao.quantidade * custoUnitario

  if (custoTotal === 0) {
    console.warn(`[Hook] Custo zero para movimentação ${movimentacao.id}`)
  }

  // Buscar contas
  const cogsAccount = await prisma.account.findUnique({
    where: { codigo: '6.1.01' }  // COGS Materials
  })

  const inventoryAccount = await prisma.account.findUnique({
    where: { codigo: '1.1.03.001' }  // Inventory
  })

  if (!cogsAccount || !inventoryAccount) {
    throw new Error('Contas contábeis não encontradas (COGS ou Inventory)')
  }

  // Buscar centro de custo do projeto
  const centroCustoId = await getCentroCustoPorProjeto(movimentacao.projetoId)

  // Criar transaction
  const transaction = await criarLedgerTransaction({
    origin: 'ESTOQUE_SAIDA',
    originId: movimentacao.id,
    originTable: 'movimentacoes',
    data: movimentacao.dataMovimentacao,
    descricao: `COGS - ${material.nome} (${movimentacao.quantidade} ${material.unidade})`,
    projetoId: movimentacao.projetoId,
    centroCustoId,
    entries: [
      {
        accountId: cogsAccount.id,
        debito: custoTotal,
        credito: 0,
        projetoId: movimentacao.projetoId,
        centroCustoId,
        descricao: `${material.codigo} - ${material.nome} @ $${custoUnitario}/${material.unidade}`
      },
      {
        accountId: inventoryAccount.id,
        debito: 0,
        credito: custoTotal,
        descricao: `Saída estoque - ${material.codigo}`
      }
    ]
  })

  console.log(`✅ [Hook] Saída estoque ${movimentacao.id} contabilizada - COGS $${custoTotal}`)

  // Trigger: atualizar custo real do projeto
  await triggerSyncProjetoCustoReal(movimentacao.projetoId)

  return transaction
}
```

---

## 🔧 HOOK #3: Invoice Enviada → A/R + Revenue

### Trigger
```typescript
// src/hooks/financeiro/onInvoiceSent.ts

import { Invoice } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { criarLedgerTransaction } from '@/lib/ledger'

export async function onInvoiceSent(invoice: Invoice) {
  // Validações
  if (invoice.status !== 'SENT') {
    return
  }

  // Verificar se já foi contabilizada
  if (invoice.ledgerTransactionId) {
    console.log(`[Hook] Invoice ${invoice.id} já contabilizada`)
    return
  }

  console.log(`[Hook] Contabilizando invoice ${invoice.numeroInvoice}...`)

  // Buscar contas
  const arAccount = await prisma.account.findUnique({
    where: { codigo: '1.1.02.001' }  // A/R Construction
  })

  const revenueAccount = await prisma.account.findUnique({
    where: { codigo: '4.1.01' }  // Service Revenue
  })

  const taxLiabilityAccount = await prisma.account.findUnique({
    where: { codigo: '2.1.02.001' }  // Sales Tax Payable Texas
  })

  if (!arAccount || !revenueAccount || !taxLiabilityAccount) {
    throw new Error('Contas contábeis não encontradas')
  }

  // Buscar cliente
  const cliente = await prisma.cliente.findUnique({
    where: { id: invoice.clienteId }
  })

  // Buscar centro de custo se houver projeto
  const centroCustoId = invoice.projetoId
    ? await getCentroCustoPorProjeto(invoice.projetoId)
    : null

  // Criar transaction
  const transaction = await criarLedgerTransaction({
    origin: 'INVOICE_SENT',
    originId: invoice.id,
    originTable: 'invoices',
    data: invoice.dataEmissao,
    descricao: `Invoice ${invoice.numeroInvoice} - ${cliente?.nome || 'Cliente'}`,
    projetoId: invoice.projetoId,
    clienteId: invoice.clienteId,
    centroCustoId,
    entries: [
      // Débito: A/R (direito a receber)
      {
        accountId: arAccount.id,
        debito: invoice.valorTotal,
        credito: 0,
        projetoId: invoice.projetoId,
        clienteId: invoice.clienteId,
        centroCustoId,
        descricao: `A receber - ${cliente?.nome || 'Cliente'}`
      },
      // Crédito: Revenue (receita de serviços)
      {
        accountId: revenueAccount.id,
        debito: 0,
        credito: invoice.subtotal,
        projetoId: invoice.projetoId,
        clienteId: invoice.clienteId,
        centroCustoId,
        descricao: `Receita serviços - ${invoice.numeroInvoice}`
      },
      // Crédito: Sales Tax Liability
      {
        accountId: taxLiabilityAccount.id,
        debito: 0,
        credito: invoice.taxAmount,
        descricao: `Texas Sales Tax ${invoice.taxRate}%`
      }
    ]
  })

  // Vincular transaction à invoice
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { ledgerTransactionId: transaction.id }
  })

  console.log(`✅ [Hook] Invoice ${invoice.numeroInvoice} contabilizada - A/R $${invoice.valorTotal}`)

  return transaction
}
```

---

## 🔧 HOOK #4: Invoice Pagamento → Bank + A/R

### Trigger
```typescript
// src/hooks/financeiro/onInvoicePayment.ts

import { InvoicePayment } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { criarLedgerTransaction } from '@/lib/ledger'

export async function onInvoicePayment(payment: InvoicePayment) {
  // Verificar se já foi contabilizado
  if (payment.ledgerTransactionId) {
    console.log(`[Hook] Payment ${payment.id} já contabilizado`)
    return
  }

  console.log(`[Hook] Contabilizando pagamento ${payment.id}...`)

  // Buscar invoice
  const invoice = await prisma.invoice.findUnique({
    where: { id: payment.invoiceId },
    include: { cliente: true, projeto: true }
  })

  if (!invoice) {
    throw new Error(`Invoice ${payment.invoiceId} não encontrada`)
  }

  // Buscar contas
  const bankAccount = await prisma.account.findUnique({
    where: { 
      bankAccountId: payment.bankAccountId || invoice.projeto?.bankAccountId || 1 
    }
  })

  const arAccount = await prisma.account.findUnique({
    where: { codigo: '1.1.02.001' }
  })

  if (!bankAccount || !arAccount) {
    throw new Error('Contas contábeis não encontradas (Bank ou A/R)')
  }

  // Buscar centro de custo
  const centroCustoId = invoice.projetoId
    ? await getCentroCustoPorProjeto(invoice.projetoId)
    : null

  // Criar transaction
  const transaction = await criarLedgerTransaction({
    origin: 'INVOICE_PAYMENT',
    originId: payment.id,
    originTable: 'invoice_payments',
    data: payment.dataPagamento,
    descricao: `Pagamento recebido - Invoice ${invoice.numeroInvoice}`,
    projetoId: invoice.projetoId,
    clienteId: invoice.clienteId,
    centroCustoId,
    entries: [
      // Débito: Bank (entrada de dinheiro)
      {
        accountId: bankAccount.id,
        debito: payment.valor,
        credito: 0,
        projetoId: invoice.projetoId,
        clienteId: invoice.clienteId,
        descricao: `Recebido via ${payment.metodoPagamento}`
      },
      // Crédito: A/R (baixa do recebível)
      {
        accountId: arAccount.id,
        debito: 0,
        credito: payment.valor,
        projetoId: invoice.projetoId,
        clienteId: invoice.clienteId,
        centroCustoId,
        descricao: `Baixa A/R - ${invoice.numeroInvoice}`
      }
    ]
  })

  // Vincular transaction ao payment
  await prisma.invoicePayment.update({
    where: { id: payment.id },
    data: { ledgerTransactionId: transaction.id }
  })

  // Atualizar status invoice
  const novoSaldo = invoice.saldo - payment.valor
  const novoStatus = novoSaldo <= 0.01 ? 'PAID' : 'PARTIAL_PAID'

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      valorPago: { increment: payment.valor },
      saldo: novoSaldo,
      status: novoStatus,
      dataPagamento: novoStatus === 'PAID' ? payment.dataPagamento : invoice.dataPagamento
    }
  })

  console.log(`✅ [Hook] Pagamento ${payment.id} contabilizado - Bank +$${payment.valor}`)

  // Notificar
  await notifyPaymentReceived(invoice, payment)

  return transaction
}
```

---

## ⏱️ JOB #1: Sync Projeto Custo Real

### Scheduled Job (a cada 15 minutos)
```typescript
// src/jobs/syncProjetoCustoReal.ts

import { prisma } from '@/lib/prisma'

export async function syncProjetoCustoReal(projetoId?: number) {
  console.log(`[Job] Sincronizando custos reais dos projetos...`)

  // Buscar projetos ativos ou projeto específico
  const projetos = projetoId
    ? [await prisma.projeto.findUnique({ where: { id: projetoId } })]
    : await prisma.projeto.findMany({
        where: { 
          status: { in: ['EM_ANDAMENTO', 'AGUARDANDO', 'PLANEJAMENTO'] }
        }
      })

  let processados = 0

  for (const projeto of projetos) {
    if (!projeto) continue

    try {
      // 1. Calcular COGS (materiais)
      const cogsMateriais = await prisma.ledgerEntry.aggregate({
        where: {
          projetoId: projeto.id,
          account: { codigo: { startsWith: '6.1' } },  // COGS Materials
          debito: { gt: 0 }
        },
        _sum: { debito: true }
      })

      // 2. Calcular COGS (mão de obra)
      const cogsMO = await prisma.ledgerEntry.aggregate({
        where: {
          projetoId: projeto.id,
          account: { codigo: { startsWith: '6.2' } },  // COGS Labor
          debito: { gt: 0 }
        },
        _sum: { debito: true }
      })

      // 3. Calcular COGS (subcontratados)
      const cogsSub = await prisma.ledgerEntry.aggregate({
        where: {
          projetoId: projeto.id,
          account: { codigo: { startsWith: '6.3' } },  // COGS Subcontractor
          debito: { gt: 0 }
        },
        _sum: { debito: true }
      })

      // 4. Outros custos diretos
      const outrosCustos = await prisma.ledgerEntry.aggregate({
        where: {
          projetoId: projeto.id,
          account: { codigo: { startsWith: '6.4' } },  // Equipment COGS
          debito: { gt: 0 }
        },
        _sum: { debito: true }
      })

      const custoReal = 
        (cogsMateriais._sum.debito || 0) +
        (cogsMO._sum.debito || 0) +
        (cogsSub._sum.debito || 0) +
        (outrosCustos._sum.debito || 0)

      // 5. Calcular receita (invoices pagas)
      const receita = await prisma.invoice.aggregate({
        where: {
          projetoId: projeto.id,
          status: { in: ['PAID', 'PARTIAL_PAID'] }
        },
        _sum: { valorPago: true }
      })

      const receitaReal = receita._sum.valorPago || 0
      const lucroReal = receitaReal - custoReal
      const margemReal = receitaReal > 0 ? (lucroReal / receitaReal) * 100 : 0

      // 6. Atualizar Projeto
      await prisma.projeto.update({
        where: { id: projeto.id },
        data: {
          custoReal,
          lucroReal,
          margemReal,
          atualizadoEm: new Date()
        }
      })

      processados++

      console.log(`✅ [Job] Projeto ${projeto.id} atualizado - Custo: $${custoReal}, Lucro: $${lucroReal}`)

    } catch (error) {
      console.error(`❌ [Job] Erro ao processar projeto ${projeto.id}:`, error)
    }
  }

  console.log(`✅ [Job] ${processados} projetos processados`)
  return processados
}

// Helper: trigger on-demand
export async function triggerSyncProjetoCustoReal(projetoId: number) {
  // Adicionar à fila (ou executar imediatamente)
  setTimeout(() => {
    syncProjetoCustoReal(projetoId).catch(console.error)
  }, 1000)
}
```

### Configuração Cron
```typescript
// src/jobs/cron.ts

import cron from 'node-cron'
import { syncProjetoCustoReal } from './syncProjetoCustoReal'
import { checkOrcamentoAlertas } from './checkOrcamentoAlertas'

// A cada 15 minutos
cron.schedule('*/15 * * * *', async () => {
  console.log('[Cron] Executando jobs financeiros...')
  
  await syncProjetoCustoReal()
  await checkOrcamentoAlertas()
})
```

---

## ⏱️ JOB #2: Check Orçamento Alertas

### Scheduled Job (a cada 15 minutos)
```typescript
// src/jobs/checkOrcamentoAlertas.ts

import { prisma } from '@/lib/prisma'

export async function checkOrcamentoAlertas() {
  console.log(`[Job] Verificando alertas de orçamento...`)

  // Buscar orçamentos ativos
  const orcamentos = await prisma.orcamento.findMany({
    where: { status: 'ATIVO' }
  })

  let alertasGerados = 0

  for (const orc of orcamentos) {
    try {
      // Calcular gasto real
      const gastoReal = await calcularGastoOrcamento(orc)
      const percentual = (gastoReal / orc.valorLimite) * 100

      // Atualizar valores
      await prisma.orcamento.update({
        where: { id: orc.id },
        data: {
          valorGasto: gastoReal,
          percentualGasto: percentual,
          status: percentual > 100 ? 'EXCEDIDO' : 'ATIVO'
        }
      })

      // Verificar alertas
      if (percentual >= 110 && orc.alertar110 && !orc.alertado110) {
        await criarOrcamentoAlerta(orc, 'PERCENTUAL_110', 110, gastoReal)
        await prisma.orcamento.update({
          where: { id: orc.id },
          data: { alertado110: true }
        })
        alertasGerados++
        console.log(`🚨 [Alerta] Orçamento ${orc.id} ESTOUROU 110%!`)
      } else if (percentual >= 100 && orc.alertar100 && !orc.alertado100) {
        await criarOrcamentoAlerta(orc, 'PERCENTUAL_100', 100, gastoReal)
        await prisma.orcamento.update({
          where: { id: orc.id },
          data: { alertado100: true }
        })
        alertasGerados++
        console.log(`🔴 [Alerta] Orçamento ${orc.id} atingiu 100%`)
      } else if (percentual >= 80 && orc.alertar80 && !orc.alertado80) {
        await criarOrcamentoAlerta(orc, 'PERCENTUAL_80', 80, gastoReal)
        await prisma.orcamento.update({
          where: { id: orc.id },
          data: { alertado80: true }
        })
        alertasGerados++
        console.log(`⚠️ [Alerta] Orçamento ${orc.id} atingiu 80%`)
      }

    } catch (error) {
      console.error(`❌ [Job] Erro ao processar orçamento ${orc.id}:`, error)
    }
  }

  console.log(`✅ [Job] ${alertasGerados} alertas gerados`)
  return alertasGerados
}

async function calcularGastoOrcamento(orcamento: Orcamento): Promise<number> {
  // Se for orçamento de projeto
  if (orcamento.projetoId) {
    const projeto = await prisma.projeto.findUnique({
      where: { id: orcamento.projetoId }
    })
    return projeto?.custoReal || 0
  }

  // Se for orçamento de centro de custo
  if (orcamento.centroCustoId) {
    const gastos = await prisma.ledgerEntry.aggregate({
      where: {
        centroCustoId: orcamento.centroCustoId,
        transaction: {
          data: {
            gte: orcamento.dataInicio,
            lte: orcamento.dataFim
          }
        },
        account: { tipo: { in: ['EXPENSE', 'COGS'] } },
        debito: { gt: 0 }
      },
      _sum: { debito: true }
    })
    return gastos._sum.debito || 0
  }

  // Orçamento geral de período
  const gastos = await prisma.ledgerEntry.aggregate({
    where: {
      transaction: {
        data: {
          gte: orcamento.dataInicio,
          lte: orcamento.dataFim
        }
      },
      account: { tipo: { in: ['EXPENSE', 'COGS'] } },
      debito: { gt: 0 }
    },
    _sum: { debito: true }
  })
  return gastos._sum.debito || 0
}

async function criarOrcamentoAlerta(
  orcamento: Orcamento,
  tipo: OrcamentoAlerta_tipo,
  percentual: number,
  valorGasto: number
) {
  await prisma.orcamentoAlerta.create({
    data: {
      orcamentoId: orcamento.id,
      tipo,
      percentual,
      valorGasto,
      valorLimite: orcamento.valorLimite
    }
  })

  // Notificar responsáveis
  await notifyOrcamentoAlerta(orcamento, tipo, percentual, valorGasto)
}
```

---

## 🛠️ HELPER: Criar Ledger Transaction

```typescript
// src/lib/ledger.ts

interface CreateLedgerTransactionInput {
  origin: LedgerTransaction_origin
  originId?: number
  originTable?: string
  data: Date
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

export async function criarLedgerTransaction(
  input: CreateLedgerTransactionInput
) {
  // Validação: dupla entrada
  const totalDebito = input.entries.reduce((sum, e) => sum + e.debito, 0)
  const totalCredito = input.entries.reduce((sum, e) => sum + e.credito, 0)

  if (Math.abs(totalDebito - totalCredito) > 0.01) {
    throw new Error(
      `Transaction desbalanceada! Débito: $${totalDebito}, Crédito: $${totalCredito}`
    )
  }

  // Gerar número sequencial
  const numeroTransacao = await generateTransactionNumber()

  // Criar transaction
  const transaction = await prisma.ledgerTransaction.create({
    data: {
      numeroTransacao,
      origin: input.origin,
      originId: input.originId,
      originTable: input.originTable,
      data: input.data,
      descricao: input.descricao,
      projetoId: input.projetoId,
      clienteId: input.clienteId,
      fornecedorId: input.fornecedorId,
      centroCustoId: input.centroCustoId,
      totalDebito,
      totalCredito,
      status: 'POSTED',
      criadoPor: 1,  // TODO: pegar do contexto
      entries: {
        create: input.entries.map(entry => ({
          accountId: entry.accountId,
          debito: entry.debito,
          credito: entry.credito,
          projetoId: entry.projetoId,
          clienteId: entry.clienteId,
          fornecedorId: entry.fornecedorId,
          centroCustoId: entry.centroCustoId,
          descricao: entry.descricao
        }))
      }
    },
    include: { entries: true }
  })

  // Atualizar saldos das contas (cache)
  await atualizarSaldosContas(transaction)

  return transaction
}

async function generateTransactionNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.ledgerTransaction.count({
    where: {
      numeroTransacao: { startsWith: `TRX-${year}-` }
    }
  })
  return `TRX-${year}-${String(count + 1).padStart(6, '0')}`
}

async function atualizarSaldosContas(transaction: LedgerTransaction) {
  const entries = await prisma.ledgerEntry.findMany({
    where: { transactionId: transaction.id }
  })

  for (const entry of entries) {
    await prisma.account.update({
      where: { id: entry.accountId },
      data: {
        saldoDebito: { increment: entry.debito },
        saldoCredito: { increment: entry.credito },
        saldoAtual: { 
          increment: entry.debito - entry.credito 
        },
        ultimaMovimentacao: transaction.data
      }
    })
  }
}
```

---

## 📊 MONITORAMENTO & LOGS

### Dashboard Hooks
```typescript
interface HooksMetrics {
  last24h: {
    comprasContabilizadas: number
    saidasContabilizadas: number
    invoicesContabilizadas: number
    pagamentosContabilizados: number
    erros: number
  }
  performance: {
    avgHookDuration: number  // ms
    maxHookDuration: number
  }
}
```

### Logs Estruturados
```typescript
// src/lib/logger.ts

export function logHookExecution(
  hookName: string,
  entityId: number,
  duration: number,
  success: boolean,
  error?: Error
) {
  const log = {
    timestamp: new Date().toISOString(),
    hook: hookName,
    entityId,
    duration,
    success,
    error: error?.message
  }

  console.log('[Hook]', JSON.stringify(log))

  // Enviar para monitoring (Sentry, DataDog, etc)
  if (!success) {
    // Sentry.captureException(error)
  }
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Hooks
- [ ] ⏳ onCompraRecebida (Inventory + A/P)
- [ ] ⏳ onEstoqueSaida (COGS + Inventory)
- [ ] ⏳ onInvoiceSent (A/R + Revenue + Tax)
- [ ] ⏳ onInvoicePayment (Bank + A/R)

### Jobs
- [ ] ⏳ syncProjetoCustoReal (a cada 15min)
- [ ] ⏳ checkOrcamentoAlertas (a cada 15min)
- [ ] ⏳ Configuração cron

### Helpers
- [ ] ⏳ criarLedgerTransaction (validação dupla entrada)
- [ ] ⏳ getCentroCustoPorProjeto
- [ ] ⏳ atualizarSaldosContas (cache)
- [ ] ⏳ generateTransactionNumber

### Notificações
- [ ] ⏳ notifyPaymentReceived
- [ ] ⏳ notifyOrcamentoAlerta (80%, 100%, 110%)
- [ ] ⏳ Email templates
- [ ] ⏳ SMS integration (Twilio)

### Testes
- [ ] ⏳ Unit: cada hook isolado
- [ ] ⏳ Integration: fluxo completo E2E
- [ ] ⏳ Idempotência (evitar duplicação)
- [ ] ⏳ Performance (< 500ms por hook)

---

**Status:** ✅ Especificação completa de Hooks & Automações  
**Próximo:** FINANCEIRO-ROADMAP-8-SEMANAS.md
