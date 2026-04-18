# 📊 ANÁLISE COMPLETA - MÓDULO FINANCEIRO GLADPROS

**Data:** 12 de outubro de 2025  
**Analista:** GitHub Copilot (Engenharia de Software Sênior)  
**Status:** Análise completa pronta para discussão

---

## 🎯 DECISÕES CONFIRMADAS

| Decisão | Escolha | Observações |
|---------|---------|-------------|
| **#1 - Arquitetura** | **B - Dupla Entrada** | Ledger completo, escalável, auditável |
| **#2 - Integração Horas** | **A - Com análise prévia** | Integrar `horas_mo` de Propostas + Projetos |
| **#3 - Taxas (Sales Tax)** | **Texas (8.25%)** | Parametrizável para futuro multi-estado |
| **#4 - Moeda** | **USD** | Sistema Texas/USA, conversão futura |
| **#5 - Roadmap** | **6 semanas** | Aprovado |
| **#6 - Idioma** | **PT-BR (código)** | Interface multi-idioma futura |

---

## 🔍 DESCOBERTAS CRÍTICAS DO SISTEMA ATUAL

### 1. ✅ MÓDULO DE PROPOSTAS (Análise Completa)

#### Estrutura Atual no Prisma Schema

```prisma
model Proposta {
  id                         Int
  numeroProposta             String @unique
  clienteId                  Int
  valorEstimado              Decimal @db.Decimal(12,2)
  moeda                      String @default("USD")
  status                     Proposta_status
  internalEstimate           String? @db.LongText  // JSON com estimativas
  
  // Campos de custo (importantes para integração!)
  precoPropostaCliente       Decimal? @db.Decimal(12,2)
  descontosOfertados         Decimal? @db.Decimal(5,2)
  percentualSinal            Decimal? @db.Decimal(5,2)
  
  // Relações
  PropostaEtapa              PropostaEtapa[]
  PropostaMaterial           PropostaMaterial[]
  Projetos                   Projeto[] @relation("PropostaProjetos")
}

model PropostaEtapa {
  id                   Int
  propostaId           Int
  servico              String
  descricao            String
  custoMaoObraEstimado Decimal? @db.Decimal(12,2)  // 🎯 HORAS AQUI!
  duracaoEstimadaHoras Decimal? @db.Decimal(8,2)   // 🎯 HORAS AQUI!
  quantidade           Decimal?
  unidade              String?
}

model PropostaMaterial {
  id                     Int
  propostaId             Int
  codigo                 String?
  nome                   String
  quantidade             Decimal @db.Decimal(12,3)
  unidade                String?
  precoUnitario          Decimal? @db.Decimal(12,2)
  moeda                  String @default("USD")
  totalItem              Decimal? @db.Decimal(12,2)
}
```

#### Frontend - Dados Estruturados de Horas

**Arquivo:** `src/components/propostas/types.ts`

```typescript
export interface InternoInfo {
  custo_material: number      // Custo de materiais
  custo_mo: number           // 🎯 CUSTO MÃO DE OBRA
  horas_mo: number           // 🎯 HORAS MÃO DE OBRA
  custo_terceiros: number    // Custo terceirizados
  overhead_pct: number       // % Overhead
  margem_pct: number         // % Margem desejada
  impostos_pct: number       // % Impostos
  contingencia_pct: number   // % Contingência
  frete: number              // Frete/Logística
}
```

**Cálculo Atual (Frontend):**

```typescript
// src/components/propostas/adapter.ts
const custoMaterial = materiais.reduce((acc, m) => 
  acc + (m.preco || 0) * m.quantidade, 0)
const custoMaoObra = formData.interno.custo_mo      // Manual
const horasMO = formData.interno.horas_mo           // Manual
const custoTerceiros = formData.interno.custo_terceiros
const freteLogistica = formData.interno.frete

const base = custoMaterial + custoMaoObra + custoTerceiros + freteLogistica
const overhead = base * (formData.interno.overhead_pct / 100)
const margem = (base + overhead) * (formData.interno.margem_pct / 100)
const impostos = (base + overhead + margem) * (formData.interno.impostos_pct / 100)

const valorTotal = base + overhead + margem + impostos
```

#### Schema de Validação (Zod)

```typescript
// src/shared/lib/validations/proposta.ts
export const internalEstimateSchema = z.object({
  custoMaterialEstimado: z.number().min(0).optional(),
  custoMaoObraEstimado: z.number().min(0).optional(),   // 🎯
  horasMaoObraEstimadas: z.number().min(0).optional(),  // 🎯
  custoTerceirosEstimado: z.number().min(0).optional(),
  overheadPercentual: z.number().min(0).max(100).optional(),
  margemDesejadaPercentual: z.number().min(0).max(100).optional(),
  impostosPercentual: z.number().min(0).max(100).optional(),
  contingenciaPercentual: z.number().min(0).max(100).optional(),
  freteLogisticaEstimado: z.number().min(0).optional(),
  totalEstimadoInterno: z.number().min(0).optional()
}).optional()
```

---

### 2. ✅ MÓDULO DE PROJETOS (Análise Completa)

#### Estrutura Atual no Prisma Schema

```prisma
model Projeto {
  id                    Int @id
  propostaId            Int? @map("proposta_id")
  clienteId             Int
  numeroProjeto         String @unique
  titulo                String
  status                Projeto_status @default(planejado)
  
  // 🎯 CAMPOS FINANCEIROS CHAVE
  valorEstimado         Decimal? @map("valor_estimado") @db.Decimal(12,2)
  custoPrevisto         Decimal? @map("custo_previsto") @db.Decimal(12,2)
  custoReal             Decimal? @map("custo_real") @db.Decimal(12,2)
  margemPrevista        Decimal? @map("margem_prevista") @db.Decimal(7,2)
  margemReal            Decimal? @map("margem_real") @db.Decimal(7,2)
  lucroPrevisto         Decimal? @map("lucro_previsto") @db.Decimal(12,2)
  lucroReal             Decimal? @map("lucro_real") @db.Decimal(12,2)
  
  // Relações
  Proposta              Proposta? @relation("PropostaProjetos")
  Etapas                ProjetoEtapa[]
  Materiais             ProjetoMaterial[]
  MovimentacoesEstoque  ProjetoMovimentacaoEstoque[]
  
  // Relações com Estoque (já existentes!)
  materiaisEstoque      ProjetoMaterialEstoque[]
  equipamentosEstoque   ProjetoEquipamento[]
  movimentacoesMateriaisEstoque MaterialMovimentacao[]
  movimentacoesUnificadas Movimentacao[]
  equipamentosAlocados  Equipamento[]
  alertasEstoque        AlertaEstoque[]
  comprasEstoque        Compra[]
}

model ProjetoMaterial {
  id                   Int @id
  projetoId            Int
  codigo               String?
  nome                 String
  unidade              String?
  quantidadePlanejada  Decimal @db.Decimal(12,3)
  quantidadeLiberada   Decimal @db.Decimal(12,3)
  quantidadeUtilizada  Decimal @db.Decimal(12,3)
  quantidadeDevolvida  Decimal @db.Decimal(12,3)
  status               ProjetoMaterial_status
  centroCustoId        Int?  // 🎯 JÁ TEM CENTRO DE CUSTO!
  repassarCustoCliente Boolean @default(true)  // 🎯 FLAG IMPORTANTE!
  
  Movimentacoes        ProjetoMovimentacaoEstoque[]
}

model ProjetoMovimentacaoEstoque {
  id                    Int @id
  projetoId             Int
  materialId            Int
  tipoMovimentacao      ProjetoMovimentacaoEstoque_tipo
  quantidade            Decimal @db.Decimal(12,3)
  quantidadeAnterior    Decimal @db.Decimal(12,3)
  observacao            String?
  usuarioId             Int
  
  // 🎯 INTEGRAÇÃO COM ESTOQUE EXTERNO
  estoqueExternoId      String?
  statusIntegracao      ProjetoMovimentacaoEstoque_status
  erroIntegracao        String?
  metadadosIntegracao   Json?
  
  criadoEm              DateTime
  processadoEm          DateTime?
}
```

#### Status Possíveis

```prisma
enum Projeto_status {
  planejado
  em_execucao
  pausado
  concluido
  cancelado
}

enum ProjetoMaterial_status {
  planejado
  aprovado
  liberado
  em_uso
  concluido
  cancelado
}

enum ProjetoMovimentacaoEstoque_tipo {
  REQUISICAO     // Pedido de material
  LIBERACAO      // Liberado do almoxarifado
  CONSUMO        // Usado no projeto
  DEVOLUCAO      // Devolvido ao estoque
  TRANSFERENCIA  // Entre projetos
  AJUSTE         // Ajuste de inventário
}

enum ProjetoMovimentacaoEstoque_status {
  PENDENTE
  INTEGRADO
  ERRO
  CANCELADO
}
```

---

### 3. ✅ MÓDULO DE ESTOQUE (Análise Completa)

**Status:** Recém completado com qualidade 9.8/10

#### Integração com Projetos (JÁ IMPLEMENTADA!)

```prisma
// Relações já existentes no Projeto:
comprasEstoque        Compra[]              // Compras vinculadas
movimentacoesUnificadas Movimentacao[]      // Movimentações de estoque
equipamentosAlocados  Equipamento[]         // Equipamentos alocados
alertasEstoque        AlertaEstoque[]       // Alertas de estoque
```

#### Tipos de Movimentação

```prisma
enum Movimentacao_tipo {
  ENTRADA         // Entrada de material
  SAIDA          // Saída para projeto 🎯
  AJUSTE         // Ajuste de inventário
  TRANSFERENCIA  // Entre locais
  DEVOLUCAO      // Devolução de projeto 🎯
}
```

#### Compras com Custo Real

```prisma
model Compra {
  id              Int
  fornecedorId    Int
  numeroNf        String?
  dataCompra      DateTime
  tipo            Compra_tipo  // MATERIAL | EQUIPAMENTO
  projetoId       Int?  // 🎯 VINCULADO A PROJETO!
  
  valorTotal      Decimal @db.Decimal(12,2)  // 🎯 CUSTO REAL
  desconto        Decimal @db.Decimal(12,2)
  frete           Decimal @db.Decimal(12,2)
  
  status          Compra_status
  // RASCUNHO, PENDENTE, APROVADA, PEDIDA, PARCIAL, RECEBIDA, CANCELADA
  
  itens           CompraItem[]
}

model CompraItem {
  id                  Int
  compraId            Int
  materialId          Int?
  equipamentoId       Int?
  quantidade          Decimal @db.Decimal(12,3)
  quantidadeRecebida  Decimal @db.Decimal(12,3)
  valorUnitario       Decimal @db.Decimal(12,2)  // 🎯 CUSTO UNITÁRIO REAL
  valorTotal          Decimal @db.Decimal(12,2)  // 🎯 CUSTO TOTAL ITEM
}
```

#### Campos de Custo em Material

```prisma
model Material {
  id              Int
  codigo          String @unique
  nome            String
  categoriaId     Int
  unidadeId       Int
  
  ultimoCusto     Decimal? @db.Decimal(12,2)  // 🎯 ÚLTIMO CUSTO
  custoMedio      Decimal? @db.Decimal(12,2)  // 🎯 CUSTO MÉDIO
  ultimaCompraEm  DateTime?
  
  estoqueMinimo   Decimal @db.Decimal(12,3)
  pontoReposicao  Decimal @db.Decimal(12,3)
  saldoAtual      Decimal  // Calculado dinamicamente
}
```

---

### 4. ❌ MÓDULO FINANCEIRO (NÃO EXISTE AINDA)

**Status:** Não implementado. Apenas uma referência antiga na especificação:

> "Tabela existente: **financeiro_empresa** (a ser revisada/expandida)"

**Grep Search Result:** `No matches found` para "financeiro" no schema.prisma

**Conclusão:** Começaremos do zero com arquitetura limpa!

---

## 🔗 MAPEAMENTO DE INTEGRAÇÕES

### Fluxo Completo: Proposta → Projeto → Financeiro

```
┌─────────────────────────────────────────────────────────────────┐
│                        PROPOSTA (Estimativa)                    │
├─────────────────────────────────────────────────────────────────┤
│ • valorEstimado: $50,000                                        │
│ • precoPropostaCliente: $50,000                                 │
│ • internalEstimate (JSON):                                      │
│   - custoMaterialEstimado: $18,000                             │
│   - custoMaoObraEstimado: $12,000  🎯                          │
│   - horasMaoObraEstimadas: 240h    🎯                          │
│   - custoTerceirosEstimado: $5,000                             │
│   - freteLogisticaEstimado: $1,000                             │
│   - overheadPercentual: 12%                                     │
│   - margemDesejadaPercentual: 20%                              │
│   - impostosPercentual: 8.25% (Texas)                          │
│                                                                  │
│ PropostaEtapa[] (detalhe por serviço):                         │
│   - servico: "Instalação Elétrica"                             │
│     duracaoEstimadaHoras: 120h                                  │
│     custoMaoObraEstimado: $6,000                               │
│   - servico: "Instalação Plumbing"                             │
│     duracaoEstimadaHoras: 80h                                   │
│     custoMaoObraEstimado: $4,000                               │
│                                                                  │
│ PropostaMaterial[] (materiais estimados):                      │
│   - nome: "Cabo 14 AWG"                                        │
│     quantidade: 500                                             │
│     precoUnitario: $1.20                                        │
│     totalItem: $600                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (conversão em projeto)
┌─────────────────────────────────────────────────────────────────┐
│                        PROJETO (Execução)                       │
├─────────────────────────────────────────────────────────────────┤
│ • status: em_execucao                                           │
│ • valorEstimado: $50,000 (da proposta)                         │
│ • custoPrevisto: $36,000 (custo interno da proposta)           │
│ • custoReal: $0 → acumulado durante execução 🎯               │
│ • margemPrevista: 28% (50k - 36k = 14k)                        │
│ • margemReal: calculada dinamicamente 🎯                       │
│ • lucroPrevisto: $14,000                                        │
│ • lucroReal: calculado dinamicamente 🎯                        │
│                                                                  │
│ ProjetoMaterial[] (controle de uso):                           │
│   - nome: "Cabo 14 AWG"                                        │
│     quantidadePlanejada: 500                                    │
│     quantidadeLiberada: 250 (1ª liberação)                     │
│     quantidadeUtilizada: 200 (consumida)                       │
│     quantidadeDevolvida: 50 (sobra)                            │
│     centroCustoId: 10 (Obra ABC)                               │
│     repassarCustoCliente: true 🎯                              │
│                                                                  │
│ ProjetoMovimentacaoEstoque[] (rastreio):                       │
│   - tipo: LIBERACAO, quantidade: 250                           │
│     estoqueExternoId: "mat-123"                                │
│     statusIntegracao: INTEGRADO                                │
│   - tipo: CONSUMO, quantidade: 200                             │
│   - tipo: DEVOLUCAO, quantidade: 50                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   ESTOQUE (Custos Reais)                        │
├─────────────────────────────────────────────────────────────────┤
│ Material "Cabo 14 AWG":                                         │
│   - ultimoCusto: $1.25 (compra recente)                        │
│   - custoMedio: $1.22 (média móvel)                            │
│   - saldoAtual: 300 unidades                                    │
│                                                                  │
│ Compra vinculada ao projeto:                                   │
│   - projetoId: 101                                             │
│   - tipo: MATERIAL                                              │
│   - valorTotal: $1,200 (1000 × $1.20)                          │
│   - status: RECEBIDA                                            │
│                                                                  │
│ Movimentacao (SAIDA para projeto):                             │
│   - tipo: SAIDA                                                 │
│   - materialId: "mat-123"                                       │
│   - projetoId: 101                                             │
│   - quantidade: 200                                             │
│   - 💰 Custo implícito: 200 × $1.22 = $244 🎯                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              FINANCEIRO (Contabilização - NOVO!)                │
├─────────────────────────────────────────────────────────────────┤
│ RECEITA (quando invoice paga):                                  │
│   LedgerTransaction:                                             │
│     - origin: "invoice", originId: invoice-101                  │
│     - projectId: 101                                            │
│     - date: 2025-10-15                                          │
│     - entries:                                                   │
│       DR Bank (Asset)           $51,375                         │
│       CR Revenue (Income)       $47,500 (50k - 5% desconto)    │
│       CR Sales Tax Payable      $3,875  (8.25% Texas)          │
│                                                                  │
│ CUSTOS DE MATERIAIS (automático via Estoque):                  │
│   LedgerTransaction:                                             │
│     - origin: "estoque_saida", originId: mov-456                │
│     - projectId: 101                                            │
│     - date: 2025-10-12                                          │
│     - entries:                                                   │
│       DR COGS - Materiais (Expense)  $244 (200 × $1.22)        │
│       CR Inventory (Asset)           $244                       │
│                                                                  │
│ CUSTOS DE MÃO DE OBRA (manual ou time tracking futuro):        │
│   LedgerTransaction:                                             │
│     - origin: "projeto_horas", originId: proj-101               │
│     - projectId: 101                                            │
│     - date: 2025-10-13                                          │
│     - entries:                                                   │
│       DR Labor Costs (Expense)  $6,000 (120h × $50/h)          │
│       CR Accounts Payable       $6,000                          │
│                                                                  │
│ CÁLCULO DE MARGEM (query/report):                              │
│   SELECT                                                         │
│     SUM(debit) WHERE account_type='income' AS receita,  $47,500 │
│     SUM(debit) WHERE account_type='expense' AS custos,  $6,244  │
│     receita - custos AS lucro_bruto,                    $41,256 │
│     (lucro / receita * 100) AS margem_pct              86.9% 🎯│
│   FROM ledger_entries                                           │
│   JOIN ledger_transactions ON ...                               │
│   WHERE project_id = 101                                        │
│                                                                  │
│ ATUALIZAÇÃO NO PROJETO (trigger/job):                          │
│   UPDATE projetos SET                                           │
│     custoReal = $6,244,  // Soma de expenses                   │
│     lucroReal = $41,256, // Receita - Custos                   │
│     margemReal = 86.9%   // (Lucro / Receita) * 100            │
│   WHERE id = 101                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 PONTOS DE INTEGRAÇÃO IDENTIFICADOS

### 1. **Proposta → Projeto** (JÁ EXISTE)

- ✅ Campo `Projeto.propostaId` vincula ao `Proposta.id`
- ✅ `Projeto.valorEstimado` vem de `Proposta.precoPropostaCliente`
- ✅ `Projeto.custoPrevisto` vem de `internalEstimate.totalEstimadoInterno`
- 🔄 **NOVO:** Extrair `horasMaoObraEstimadas` de `PropostaEtapa[]`

### 2. **Projeto ↔ Estoque** (JÁ EXISTE E FUNCIONAL!)

- ✅ `ProjetoMovimentacaoEstoque` rastreia todas movimentações
- ✅ `Movimentacao.projetoId` vincula saídas/devoluções
- ✅ `Compra.projetoId` vincula compras diretas
- ✅ `Material.ultimoCusto` e `custoMedio` para cálculo de COGS
- 🎯 **USAR:** Calcular custo real = quantidade × custoMedio

### 3. **Estoque → Financeiro** (NOVO - A IMPLEMENTAR)

#### Hook Automático em Movimentação

```typescript
// Quando Material SAIR para projeto:
async function onMaterialSaidaParaProjeto(movimentacao: Movimentacao) {
  const material = await prisma.material.findUnique({
    where: { id: movimentacao.materialId }
  })
  
  const custoUnitario = material.custoMedio || material.ultimoCusto || 0
  const custoTotal = movimentacao.quantidade * custoUnitario
  
  // Criar transação contábil
  await criarLedgerTransaction({
    origin: 'estoque_saida',
    originId: movimentacao.id,
    projectId: movimentacao.projetoId,
    date: movimentacao.dataMovimentacao,
    entries: [
      { accountId: COGS_MATERIAIS, debit: custoTotal, credit: 0 },
      { accountId: INVENTORY_ASSET, debit: 0, credit: custoTotal }
    ]
  })
}
```

#### Hook Automático em Compra Recebida

```typescript
// Quando Compra for RECEBIDA:
async function onCompraRecebida(compra: Compra) {
  const valorTotal = compra.valorTotal + compra.frete - compra.desconto
  
  // Se vinculada a projeto:
  if (compra.projetoId) {
    await criarLedgerTransaction({
      origin: 'compra',
      originId: compra.id,
      projectId: compra.projetoId,
      costCenterId: getCentroCustoByProjeto(compra.projetoId),
      date: compra.dataCompra,
      entries: [
        { accountId: INVENTORY_ASSET, debit: valorTotal, credit: 0 },
        { accountId: BANK_CHECKING, debit: 0, credit: valorTotal }
      ]
    })
  }
}
```

### 4. **Projeto → Financeiro** (NOVO - A IMPLEMENTAR)

#### Sincronização de Custos

```typescript
// Job assíncrono (rodar a cada X minutos ou on-demand):
async function sincronizarCustosProjeto(projetoId: number) {
  // 1. Buscar todas transações do projeto
  const transacoes = await prisma.ledgerEntry.findMany({
    where: {
      transaction: { projectId: projetoId }
    },
    include: { account: true, transaction: true }
  })
  
  // 2. Calcular custos por tipo
  const custos = {
    materiais: 0,
    maoObra: 0,
    terceiros: 0,
    outros: 0
  }
  
  transacoes.forEach(entry => {
    if (entry.account.type === 'expense') {
      const valor = entry.debit
      
      if (entry.account.code.startsWith('5100')) {
        custos.materiais += valor  // COGS Materiais
      } else if (entry.account.code.startsWith('5200')) {
        custos.maoObra += valor    // Labor Costs
      } else if (entry.account.code.startsWith('5300')) {
        custos.terceiros += valor  // Serviços Terceiros
      } else {
        custos.outros += valor
      }
    }
  })
  
  const custoTotal = Object.values(custos).reduce((a, b) => a + b, 0)
  
  // 3. Buscar receitas (invoices pagos)
  const receitas = await calcularReceitasProjeto(projetoId)
  
  // 4. Calcular lucro e margem
  const lucroReal = receitas.total - custoTotal
  const margemReal = receitas.total > 0 
    ? (lucroReal / receitas.total) * 100 
    : 0
  
  // 5. Atualizar projeto
  await prisma.projeto.update({
    where: { id: projetoId },
    data: {
      custoReal: custoTotal,
      lucroReal: lucroReal,
      margemReal: margemReal,
      atualizadoEm: new Date()
    }
  })
  
  return { custoTotal, receitas, lucroReal, margemReal }
}
```

### 5. **Horas Trabalhadas** (NOVO - FUTURO)

#### Opção A: Estimativa de Proposta (Imediato)

```typescript
// Usar dados de PropostaEtapa
async function calcularCustoMaoObraEstimado(projetoId: number) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    include: {
      Proposta: {
        include: {
          PropostaEtapa: true
        }
      }
    }
  })
  
  if (!projeto.Proposta) return 0
  
  // Somar horas de todas as etapas
  const totalHoras = projeto.Proposta.PropostaEtapa.reduce(
    (sum, etapa) => sum + (etapa.duracaoEstimadaHoras || 0),
    0
  )
  
  // Custo por hora (configurável ou por projeto)
  const custoPorHora = 50 // USD - parametrizar depois
  
  return totalHoras * custoPorHora
}
```

#### Opção B: Time Tracking Real (Fase 2)

```typescript
// Nova tabela para futuro
model ProjetoHorasTrabalhadas {
  id          Int
  projetoId   Int
  usuarioId   Int
  etapaId     Int?
  data        DateTime
  horasInicio DateTime
  horasFim    DateTime
  duracao     Decimal  @db.Decimal(5,2)  // Horas trabalhadas
  descricao   String?
  valorHora   Decimal  @db.Decimal(8,2)   // Custo por hora
  valorTotal  Decimal  @db.Decimal(10,2)  // duracao × valorHora
  aprovado    Boolean  @default(false)
  
  Projeto     Projeto  @relation(fields: [projetoId], references: [id])
  Usuario     Usuario  @relation(fields: [usuarioId], references: [id])
  Etapa       ProjetoEtapa? @relation(fields: [etapaId], references: [id])
}
```

---

## 🚨 GAPS E MELHORIAS NECESSÁRIAS

### 1. ⚠️ Invoice/Fatura System (CRÍTICO!)

**Status:** ❌ **NÃO EXISTE NO SISTEMA!**

**Evidência:**
- Grep search por "Invoice", "Fatura", "financeiro" = **0 resultados** no schema.prisma
- Especificação menciona "invoices" mas não há implementação

**Impacto:**
- Sem invoices, não há como registrar receitas
- Sem receitas, não há como calcular lucro/margem real
- Blocking para módulo financeiro

**Solução Necessária:**
Criar módulo de Invoices/Faturas integrado com Projetos e Financeiro.

```prisma
// PROPOSTA PARA ADICIONAR AO SCHEMA
model Invoice {
  id              Int              @id @default(autoincrement())
  numeroInvoice   String           @unique
  projetoId       Int
  clienteId       Int
  dataEmissao     DateTime         @default(now())
  dataVencimento  DateTime
  valor           Decimal          @db.Decimal(12,2)
  desconto        Decimal          @default(0) @db.Decimal(12,2)
  taxRate         Decimal          @default(8.25) @db.Decimal(5,2)  // Texas
  taxAmount       Decimal          @db.Decimal(12,2)
  valorTotal      Decimal          @db.Decimal(12,2)  // valor - desconto + tax
  status          Invoice_status   @default(DRAFT)
  // DRAFT, SENT, VIEWED, PARTIAL_PAID, PAID, OVERDUE, CANCELLED
  
  // Pagamentos
  valorPago       Decimal          @default(0) @db.Decimal(12,2)
  saldo           Decimal          @db.Decimal(12,2)
  
  // Integração
  ledgerTransactionId Int?  @unique  // Link para contabilização
  
  Projeto         Projeto          @relation(fields: [projetoId], references: [id])
  Cliente         Cliente          @relation(fields: [clienteId], references: [id])
  Pagamentos      InvoicePayment[]
  
  @@index([projetoId, status])
  @@index([clienteId, status])
}

model InvoicePayment {
  id              Int      @id @default(autoincrement())
  invoiceId       Int
  dataPagamento   DateTime @default(now())
  valor           Decimal  @db.Decimal(12,2)
  metodoPagamento String   // PIX, BANK_TRANSFER, CARD, CHECK
  referencia      String?  // Número do cheque, ID da transação, etc
  observacao      String?
  
  ledgerTransactionId Int?  @unique
  
  Invoice         Invoice  @relation(fields: [invoiceId], references: [id])
  
  @@index([invoiceId])
}

enum Invoice_status {
  DRAFT
  SENT
  VIEWED
  PARTIAL_PAID
  PAID
  OVERDUE
  CANCELLED
}
```

### 2. ⚠️ Centro de Custo (Parcial)

**Status:** 🟡 **EXISTE PARCIALMENTE**

**Evidência:**
- `ProjetoMaterial.centroCustoId` existe mas sem tabela `CentroCusto`
- Especificação financeira menciona "centros de custo" mas não está modelado

**Solução:**
Criar tabela completa de Centros de Custo na Fase 1 do Financeiro.

```prisma
// ADICIONAR NA FASE 1
model CentroCusto {
  id          Int      @id @default(autoincrement())
  codigo      String   @unique
  nome        String
  tipo        CentroCusto_tipo
  // OPERACIONAL (projetos), ADMINISTRATIVO, COMERCIAL, etc
  descricao   String?
  ativo       Boolean  @default(true)
  criadoEm    DateTime @default(now())
  
  // Orçamentos
  Orcamentos  Orcamento[]
}

enum CentroCusto_tipo {
  OPERACIONAL      // Projetos, obras
  ADMINISTRATIVO   // Escritório, RH
  COMERCIAL        // Marketing, vendas
  LOGISTICA        // Transporte, armazenagem
  OUTROS
}
```

### 3. ⚠️ Orçamento por Projeto (Não Existe)

**Status:** ❌ **NÃO IMPLEMENTADO**

**Necessário Para:**
- Alertas de estouro (80%, 100%, 110%)
- Controle de gastos por projeto
- Aprovações de despesas

**Solução:**
Adicionar na Fase 1.

```prisma
model Orcamento {
  id              Int      @id @default(autoincrement())
  projetoId       Int?
  centroCustoId   Int?
  periodo         String   // "2025-Q4", "2025-10", etc
  valorLimite     Decimal  @db.Decimal(12,2)
  valorGasto      Decimal  @default(0) @db.Decimal(12,2)
  percentualGasto Decimal  @default(0) @db.Decimal(5,2)
  status          Orcamento_status @default(ATIVO)
  alertar80       Boolean  @default(true)
  alertar100      Boolean  @default(true)
  alertado80Em    DateTime?
  alertado100Em   DateTime?
  
  Projeto         Projeto? @relation(fields: [projetoId], references: [id])
  CentroCusto     CentroCusto? @relation(fields: [centroCustoId], references: [id])
}

enum Orcamento_status {
  ATIVO
  EXCEDIDO
  CONCLUIDO
  CANCELADO
}
```

### 4. ⚠️ Texas Sales Tax (Configurável)

**Status:** ❌ **NÃO IMPLEMENTADO**

**Necessário:**
- Taxa padrão: 8.25% (state + local)
- Variação por cidade/county
- Parametrizável para futuro multi-estado

**Solução:**
Tabela de configuração de impostos.

```prisma
model TaxRate {
  id          Int      @id @default(autoincrement())
  nome        String   // "Texas State Sales Tax"
  tipo        TaxRate_tipo
  estado      String?  // "TX", "CA", etc
  cidade      String?  // "Austin", "Houston"
  aliquota    Decimal  @db.Decimal(5,4)  // 0.0825 = 8.25%
  aplicaReceita Boolean @default(true)
  aplicaDespesa Boolean @default(false)
  ativo       Boolean  @default(true)
  dataInicio  DateTime @default(now())
  dataFim     DateTime?
  
  @@index([estado, cidade, ativo])
}

enum TaxRate_tipo {
  SALES_TAX        // Imposto sobre vendas
  SERVICE_TAX      // Imposto sobre serviços
  WITHHOLDING      // Retenção na fonte
  OUTROS
}
```

---

## 📋 CHECKLIST DE INTEGRAÇÕES

### ✅ Já Implementadas

- [x] Proposta vincula a Projeto (`propostaId`)
- [x] Proposta tem estimativas de custo (`internalEstimate` JSON)
- [x] Proposta tem horas estimadas (`PropostaEtapa.duracaoEstimadaHoras`)
- [x] Projeto tem campos financeiros (`custoReal`, `lucroReal`, `margemReal`)
- [x] Projeto vincula a Estoque (`movimentacoesUnificadas`, `comprasEstoque`)
- [x] Material tem custos (`ultimoCusto`, `custoMedio`)
- [x] Compra tem valores reais (`valorTotal`, `valorUnitario`)
- [x] Movimentação rastreia saídas para projeto
- [x] `ProjetoMaterial.centroCustoId` existe (campo)
- [x] `ProjetoMaterial.repassarCustoCliente` existe (flag importante!)

### ⚠️ Parciais (Precisam Complemento)

- [ ] 🟡 Centro de Custo (campo existe, tabela não)
- [ ] 🟡 Horas trabalhadas (estimativa existe, tracking não)

### ❌ Faltam Implementar

- [ ] ❌ **Sistema de Invoices/Faturas** (CRÍTICO!)
- [ ] ❌ Tabela `CentroCusto` completa
- [ ] ❌ Tabela `Orcamento`
- [ ] ❌ Tabela `TaxRate` (Texas sales tax)
- [ ] ❌ Módulo Financeiro completo (Ledger, Accounts, etc)
- [ ] ❌ Hook: Estoque → Financeiro (COGS automático)
- [ ] ❌ Hook: Compra → Financeiro (registro de despesa)
- [ ] ❌ Hook: Invoice → Financeiro (registro de receita)
- [ ] ❌ Job: Sincronização `Projeto.custoReal/lucroReal`

---

## 🎯 RECOMENDAÇÕES ESTRATÉGICAS

### 1. **PRIORIDADE MÁXIMA: Invoice System**

Sem sistema de invoices, não há como:
- Registrar receitas
- Calcular lucro real
- Gerar AR (Accounts Receivable)
- Dunning (cobrança)

**Sugestão:** Implementar Invoice System **ANTES** ou **EM PARALELO** com Fase 1 do Financeiro.

### 2. **Usar Dados Existentes de Horas (Imediato)**

- ✅ `PropostaEtapa.duracaoEstimadaHoras` JÁ EXISTE
- ✅ `PropostaEtapa.custoMaoObraEstimado` JÁ EXISTE
- ✅ Proposta frontend captura `horas_mo` e `custo_mo`

**Implementar:**
- Sincronizar esses dados para `Projeto` quando convertido
- Usar como base para lançamentos de custo de mão de obra
- Criar relatório de "Horas Estimadas vs Horas Reais" (futuro)

### 3. **Aproveitar Integração Estoque (Já Funcional!)**

O módulo de Estoque (9.8/10) já tem:
- ✅ Movimentações vinculadas a projetos
- ✅ Compras vinculadas a projetos
- ✅ Custos unitários (último custo, custo médio)

**Implementar:**
- Hook simples: `onMovimentacaoSaida` → criar `LedgerTransaction`
- Cálculo: `quantidade × custoMedio` = COGS automático
- Resultado: Custo de materiais 100% rastreável

### 4. **Texas Sales Tax Parametrizado**

- Base: 8.25% (state + local médio)
- Parametrizar por cidade/county (futuro)
- Campo `TaxRate.estado`, `TaxRate.cidade`
- Aplicação automática em Invoices

### 5. **Roadmap Ajustado (7 semanas)**

```
SEMANA 0 (Preparação): Invoice System [NOVO!]
  - Criar models Invoice, InvoicePayment
  - APIs CRUD básicas
  - UI mínima (criar, listar, pagar)
  - Integração com Projeto
  - Status: DRAFT → SENT → PAID

SEMANA 1 (Fase 1): Fundamentos Financeiros
  - Plano de Contas (COA) com Texas focus
  - Ledger (dupla entrada)
  - CentroCusto completo
  - TaxRate (8.25% Texas)
  - Orcamento por Projeto
  - Documents AR/AP básicos

SEMANA 2 (Fase 2): Integrações Parte 1
  - Hook: Invoice → Ledger (receita)
  - Hook: Estoque Saída → Ledger (COGS)
  - Hook: Compra → Ledger (inventário)
  - Sincronização Projeto.custoReal

SEMANA 3 (Fase 3): Integrações Parte 2
  - Horas de Proposta → Projeto
  - Custo Mão de Obra (manual inicial)
  - Reembolsos (básico)
  - Pagamentos (AR/AP)

SEMANA 4 (Fase 4): Conciliação & Reports
  - Import CSV/OFX
  - Conciliação bancária
  - Fluxo de Caixa
  - DRE por Projeto
  - Margem por Projeto

SEMANA 5 (Fase 5): Automações
  - Alertas de Orçamento (80%, 100%)
  - Dunning (D+3, D+7, D+15)
  - Multa/Juros (opt-in)
  - Forecasts (30/60/90 dias)

SEMANA 6 (Fase 6): Dashboards & UX
  - Dashboard Financeiro (by role)
  - KPIs interativos
  - Widgets por projeto
  - Exportações (PDF, Excel)

SEMANA 7 (Buffer): Testes & Ajustes
  - Testes E2E completos
  - Ajustes de UX
  - Performance
  - Documentação
```

---

## 📊 COMPARAÇÃO: Especificação Original vs Sistema Atual

| Item | Especificação | Sistema Atual | Gap |
|------|---------------|---------------|-----|
| **Propostas** | Não detalhado | ✅ Completo com horas | 🟢 Melhor |
| **Projetos** | Básico | ✅ Completo com custos | 🟢 Melhor |
| **Estoque** | Mencionado | ✅ Módulo completo (9.8/10) | 🟢 Melhor |
| **Invoices** | Especificado | ❌ Não existe | 🔴 Crítico |
| **Centro Custo** | Especificado | 🟡 Campo existe, tabela não | 🟡 Médio |
| **Ledger** | Especificado | ❌ Não existe | 🔴 Crítico |
| **Conciliação** | Especificada | ❌ Não existe | 🟠 Alto |
| **Reembolsos** | Especificado | ❌ Não existe | 🟠 Alto |
| **Horas MO** | Básico | ✅ Estimativas existem | 🟢 OK |
| **Texas Tax** | Mencionado | ❌ Não implementado | 🟠 Alto |

---

## 🚀 PRÓXIMOS PASSOS

### 1. **Decisão Crítica: Invoice System**

**Opção A:** Desenvolver Invoice System primeiro (+ 1 semana)
- ✅ Pré-requisito para Financeiro funcional
- ✅ Valor imediato (faturamento)
- ✅ Integração natural com Projetos
- ❌ Atrasa início do Financeiro

**Opção B:** Invoice mínimo na Semana 1 do Financeiro
- ✅ Começa Financeiro mais rápido
- ❌ Funcionalidade limitada
- ❌ Pode gerar retrabalho

**❓ Qual opção você prefere?**

### 2. **Validar Estrutura de Contas (COA)**

Revisar seed do Plano de Contas para:
- ✅ Texas-specific accounts
- ✅ Construction/Contracting industry
- ✅ Materiais, Mão de Obra, Terceiros separados

### 3. **Definir Política de Horas**

**Fase 1 (Imediato):**
- Usar `PropostaEtapa.custoMaoObraEstimado` / `duracaoEstimadaHoras`
- Lançamento manual de custo MO no projeto
- Relatório: Estimado vs Real (futuro tracking)

**Fase 2 (Futuro):**
- Time tracking app/integração
- Aprovação de horas
- Custo por funcionário

### 4. **Confirmar Integrações Automáticas**

Quais hooks você quer **automáticos** na Fase 1?

- [ ] Estoque Saída → COGS (recomendo SIM)
- [ ] Compra Recebida → Inventory (recomendo SIM)
- [ ] Invoice Pago → Revenue (recomendo SIM)
- [ ] Sincronização `Projeto.custoReal` (recomendo SIM, mas agendado)

---

## 📝 PERGUNTAS PARA VOCÊ

### Pergunta 1: Invoice System
Você quer que eu desenvolva o **Invoice System completo** antes de começar o Financeiro? Ou prefere um invoice mínimo integrado na Fase 1?

### Pergunta 2: Horas Trabalhadas
Para **Fase 1**, usar apenas estimativas de `PropostaEtapa` está OK? Time tracking real fica para Fase 2?

### Pergunta 3: Automações
Confirma que quer **hooks automáticos** para:
- Estoque → COGS
- Compra → Inventory
- Invoice → Revenue

### Pergunta 4: Centro de Custo
Como vocês usam centros de custo hoje? Por projeto? Por departamento? Isso ajuda a modelar melhor.

### Pergunta 5: Orçamento
Orçamento por projeto é prioritário? Ou pode ser Fase 2?

---

**Aguardando suas respostas para prosseguir com o planejamento detalhado! 🚀**

---

**Resumo das Descobertas:**
- ✅ Sistema tem **base sólida** (Propostas, Projetos, Estoque)
- ✅ Horas de mão de obra **já existem** em estimativas
- ✅ Integração Estoque **já está pronta** (9.8/10)
- ❌ Falta **Invoice System** (crítico)
- ❌ Falta **Financeiro** completo (objetivo deste projeto)
- 🎯 Com Invoice + Financeiro = **sistema 100% integrado**
