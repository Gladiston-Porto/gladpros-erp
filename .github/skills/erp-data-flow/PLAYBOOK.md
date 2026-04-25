# GladPros — ERP Data Flow PLAYBOOK

> **Uso**: Guia passo a passo para implementar ou depurar fluxos que cruzam múltiplos módulos.
> Para o mapa de FKs e status machines, ver `SKILL.md`.

---

## 1. Fluxo Completo: Proposta → Invoice (Caminho Crítico)

```
PASSO 1: Criar Cliente
POST /api/clientes
{ nome, email, telefone, addressStreet, addressCity, addressState: 'TX', addressZip }
→ clienteId: 42

PASSO 2: Criar Proposta
POST /api/propostas
{ clienteId: 42, titulo, etapas[], materiais[], gatilhoFaturamento: 'NA_APROVACAO' }
→ propostaId: 7

PASSO 3: Cliente aprova proposta
PATCH /api/propostas/7/status { status: 'APROVADA' }
→ Se gatilhoFaturamento = NA_APROVACAO → Sistema cria Invoice automaticamente
→ invoiceId: 15

PASSO 4: Enviar invoice ao cliente
PATCH /api/invoices/15/send
→ Status DRAFT → SENT
→ NotificationService dispara INVOICE_SENT
→ [Opcional] WhatsApp template invoice_sent

PASSO 5: Cliente paga
PATCH /api/invoices/15/payment
{ valorPago: 2500.00, dataPagamento: '2024-12-20', metodoPagamento: 'BANK_TRANSFER' }
→ Status → PAID (se valorPago >= valorTotal) ou PARTIALLY_PAID
→ Cria LedgerTransaction (double-entry)
→ Proposta/Projeto marcados como faturados
```

---

## 2. Quando Proposta Vira Projeto

```
PASSO 1: Aprovar proposta e criar projeto
POST /api/projetos/from-proposal
{ propostaId: 7 }
→ Cria Projeto com projetoId: 3
→ Proposta.projetoId = 3 (FK única — 1 proposta : 1 projeto)
→ Copia etapas e materiais da proposta para o projeto

PASSO 2: Iniciar projeto
PATCH /api/projetos/3/status { status: 'EM_EXECUCAO' }

PASSO 3: Alocar materiais do estoque
POST /api/projetos/3/materiais
{ materialId: 10, quantidade: 5 }
→ Cria ProjetoMaterialEstoque com status RESERVA
→ Decrementa Produto.quantidadeReservada

PASSO 4: Usar materiais
PATCH /api/projetos/3/materiais/[id]/consumir
→ Status RESERVA → USO
→ Cria MaterialMovimentacao (SAIDA)
→ Decrementa Produto.quantidadeEstoque

PASSO 5: Concluir projeto e faturar
PATCH /api/projetos/3/status { status: 'CONCLUIDO' }
→ Se gatilhoFaturamento = CONCLUSAO_PROJETO → Invoice criada automaticamente

PASSO 6: Invoice paga → Projeto arquivado
Invoice PAID → Projeto EM_INSPECAO → ARQUIVADO
```

---

## 3. Service Order com Projeto (OS Vinculada)

```
Cenário: OS é trabalho de campo de um projeto existente

POST /api/service-orders
{ projetoId: 3, clienteId: 42, titulo: 'Phase 2 — Electrical install' }

Regra: SO com projetoId pode faturar:
  - Opção A: pelo projeto (projeto.invoiceId) — não cria invoice própria
  - Opção B: invoice própria (so.invoiceId) — independente do projeto

NUNCA ambas ao mesmo tempo.

Verificação antes de criar invoice da SO:
if (so.projetoId) {
  const projeto = await prisma.projeto.findUnique({ where: { id: so.projetoId } })
  if (projeto?.invoiceId) {
    throw new Error('Service Order já vinculada a invoice do projeto. Não criar invoice separada.')
  }
}
```

---

## 4. Gatilhos de Faturamento da Proposta

```typescript
enum GatilhoFaturamento {
  NA_APROVACAO    // Invoice criada quando proposta muda para APROVADA
  INICIO_PROJETO  // Invoice criada quando projeto muda para EM_EXECUCAO
  CONCLUSAO_PROJETO // Invoice criada quando projeto muda para CONCLUIDO
  MANUAL          // ADMIN/FINANCEIRO cria invoice manualmente
  POR_ETAPAS      // Uma invoice por etapa concluída
}
```

**Implementar cada gatilho no hook de mudança de status:**

```typescript
// Hook de status de Proposta
if (newStatus === 'APROVADA' && proposta.gatilhoFaturamento === 'NA_APROVACAO') {
  await criarInvoiceDaProposta(proposta)
}

// Hook de status de Projeto
if (newStatus === 'EM_EXECUCAO' && projeto.proposta?.gatilhoFaturamento === 'INICIO_PROJETO') {
  await criarInvoiceDoProjeto(projeto)
}
if (newStatus === 'CONCLUIDO' && projeto.proposta?.gatilhoFaturamento === 'CONCLUSAO_PROJETO') {
  await criarInvoiceDoProjeto(projeto)
}
```

---

## 5. Fluxo Financeiro (Ledger Entries)

```
Invoice PAID
  └── POST /api/financeiro/ledger
      {
        invoiceId,
        tipo: 'RECEITA',
        entries: [
          { conta: 'ACCOUNTS_RECEIVABLE', tipo: 'CREDIT', valor },
          { conta: 'REVENUE', tipo: 'DEBIT', valor },
        ]
      }

Expense (custo do projeto)
  └── POST /api/financeiro/ledger
      {
        projetoId,
        tipo: 'DESPESA',
        entries: [
          { conta: 'EXPENSE', tipo: 'DEBIT', valor },
          { conta: 'ACCOUNTS_PAYABLE', tipo: 'CREDIT', valor },
        ]
      }

PurchaseOrder (compra de material)
  └── POST /api/financeiro/ledger
      {
        purchaseOrderId,
        tipo: 'COMPRA',
        entries: [
          { conta: 'INVENTORY', tipo: 'DEBIT', valor },
          { conta: 'ACCOUNTS_PAYABLE', tipo: 'CREDIT', valor },
        ]
      }
```

---

## 6. Diagnóstico de Problemas Cross-Módulo

| Sintoma | Onde Verificar | Causa Comum |
|---------|---------------|------------|
| Proposta aprovada mas Invoice não criada | `gatilhoFaturamento` da proposta | `MANUAL` — não cria automático |
| Estoque negativo após OS concluída | `MaterialMovimentacao` | Consumir chamado duas vezes |
| Projeto `CONCLUIDO` mas Invoice não existe | Hook de status do projeto | Bug no hook ou gatilho = NA_APROVACAO |
| LedgerTransaction duplicada | Invoice paga duas vezes | `ledgerTransactionId @unique` — deve bloquear |
| SO não aparece no financeiro | `invoiceId` null na SO | SO em WRITE_OFF ou sem AWAITING_PAYMENT |
| Cliente vê invoice de outro cliente | WHERE sem clienteId filter | RBAC por role CLIENTE faltando |

---

## 7. Verificação de Consistência de Dados

```sql
-- Invoices PAID sem LedgerTransaction (inconsistência)
SELECT i.id, i.numero, i.status FROM Invoice i
LEFT JOIN LedgerTransaction lt ON lt.invoiceId = i.id
WHERE i.status = 'PAID' AND lt.id IS NULL;

-- Projetos CONCLUIDO sem Invoice (se gatilho = CONCLUSAO_PROJETO)
SELECT p.id, p.titulo, prop.gatilhoFaturamento FROM Projeto p
JOIN Proposta prop ON prop.projetoId = p.id
WHERE p.status = 'CONCLUIDO'
  AND prop.gatilhoFaturamento = 'CONCLUSAO_PROJETO'
  AND NOT EXISTS (SELECT 1 FROM Invoice i WHERE i.projetoId = p.id);

-- Materiais RESERVADOS em projetos ARQUIVADOS (deveria estar USO ou devolvido)
SELECT pm.id, pm.projetoId, pm.status FROM ProjetoMaterialEstoque pm
JOIN Projeto p ON p.id = pm.projetoId
WHERE p.status = 'ARQUIVADO' AND pm.status = 'RESERVA';
```
