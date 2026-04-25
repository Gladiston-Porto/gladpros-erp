# GladPros — Service Order Module PLAYBOOK

> **Uso**: Referência operacional completa para o módulo de Ordens de Serviço.
> Para regras de domínio, ver `SKILL.md`. Este playbook foca em **procedimentos passo a passo**.

---

## 1. Fluxo Completo: Do Agendamento ao Fechamento

### Cenário A: OS Autônoma (sem projeto)
```
1. Criar OS (DRAFT)
   POST /api/service-orders
   { clienteId, titulo, descricao, technicianId? }

2. Agendar (DRAFT → SCHEDULED)
   PATCH /api/service-orders/[id]/status
   { status: 'SCHEDULED', scheduledDate: '2024-12-15T10:00:00-06:00' }

3. Iniciar execução (SCHEDULED → IN_PROGRESS)
   PATCH /api/service-orders/[id]/status { status: 'IN_PROGRESS' }

4. [Opcional] Adicionar materiais
   POST /api/service-orders/[id]/materials
   { materialId: 5, quantityPlanned: 2 }  ← do estoque
   { name: 'Wire 14AWG', unit: 'ft', quantityPlanned: 50 }  ← compra campo

5. [Opcional] Reservar materiais do estoque
   POST /api/service-orders/[id]/materials/reserve

6. Concluir (IN_PROGRESS → COMPLETED)
   PATCH /api/service-orders/[id]/status { status: 'COMPLETED' }

7. Consumir materiais usados
   POST /api/service-orders/[id]/materials/consume
   { materialId: 5, quantityUsed: 1.5 }

8. Faturar (COMPLETED → AWAITING_PAYMENT)
   → Sistema cria Invoice automaticamente ao transicionar para AWAITING_PAYMENT
   PATCH /api/service-orders/[id]/status { status: 'AWAITING_PAYMENT' }

9. Fechar (AWAITING_PAYMENT → CLOSED)
   → Após registrar pagamento na invoice vinculada
   PATCH /api/service-orders/[id]/status { status: 'CLOSED' }
```

### Cenário B: Write-Off (sem cobrança)
```
COMPLETED → WRITE_OFF
PATCH /api/service-orders/[id]/status
{ status: 'WRITE_OFF', writeOffReason: 'Warranty work — no charge' }
```

### Cenário C: Cancelamento
```
DRAFT ou SCHEDULED → CANCELED
PATCH /api/service-orders/[id]/status
{ status: 'CANCELED', cancellationReason: 'Client rescheduled' }

// Reabrir cancelada (se necessário)
CANCELED → DRAFT
PATCH /api/service-orders/[id]/status
{ status: 'DRAFT', reopenReason: 'Client confirmed — reschedule' }
```

---

## 2. Gestão de Materiais — Guia de Decisão

```
Tenho o material no estoque?
  ├── SIM → POST /materials com materialId
  │           Status automático: PENDING (estoque OK) ou NEEDS_PURCHASE (falta)
  │           Depois: /materials/reserve → /materials/consume
  └── NÃO → POST /materials SEM materialId (campo purchase)
              Status: NEEDS_PURCHASE
              Técnico compra → PATCH /materials/[id] { status: 'CONSUMED', quantityUsed, unitCostActual }
```

**Regra crítica**: Materiais com `materialId` (do estoque) **NÃO PODEM** usar PATCH para marcar CONSUMED.
Devem usar a rota específica `/consume`. Isso protege o estoque de baixas incorretas.

---

## 3. Bloqueadores de Transição — O Que Impede Cada Status

| Transição | Bloqueadores |
|-----------|-------------|
| DRAFT → SCHEDULED | `scheduledDate` ou `scheduleDateStart + End` ausente |
| SCHEDULED → IN_PROGRESS | Nenhum (sempre permitido) |
| IN_PROGRESS → COMPLETED | Materiais RESERVED não consumidos (avisar mas não bloquear) |
| COMPLETED → AWAITING_PAYMENT | Já tem invoice vinculada (`invoiceId` não null) |
| AWAITING_PAYMENT → CLOSED | Invoice não está PAID |
| Any → CANCELED | Status já é CLOSED, PAID, ou WRITE_OFF |

---

## 4. RBAC por Ação

| Ação | ADMIN | GERENTE | FINANCEIRO | ESTOQUE | USUARIO |
|------|-------|---------|------------|---------|---------|
| Criar OS | ✅ | ✅ | ❌ | ❌ | ✅ |
| Ver OS | ✅ | ✅ | ✅ (próprias) | ✅ (próprias) | ✅ (próprias) |
| Editar OS (DRAFT) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Mudar status | ✅ | ✅ | ❌ | ❌ | ✅ |
| Adicionar materiais | ✅ | ✅ | ❌ | ✅ | ✅ |
| Reservar/consumir | ✅ | ✅ | ❌ | ✅ | ✅ |
| Write-off | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cancelar | ✅ | ✅ | ❌ | ❌ | ✅ (DRAFT/SCHEDULED) |
| Ver invoice gerada | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## 5. Casos Limite e Como Tratar

### OS vinculada a Projeto
```
- SO com projetoId: pode faturar pelo projeto (via Project Invoice) OU diretamente
- Não pode ter AMBOS: invoiceId da OS + invoice do projeto para o mesmo trabalho
- Verificar antes de criar invoice: if (so.projetoId && projeto.invoiceId) → avisar
```

### Reagendamento
```
OS em SCHEDULED → editar scheduledDate sem mudar status
PATCH /api/service-orders/[id]
{ scheduledDate: 'nova data' }
→ Criar nota no histórico: "Reagendado de X para Y"
→ Notificar técnico via NotificationService
```

### Técnico Trocado Após Agendamento
```
PATCH /api/service-orders/[id]
{ technicianId: novoTechId }
→ Notificar novo técnico: SERVICE_ORDER_SCHEDULED
→ Notificar técnico anterior: OS reatribuída
```

### Material do Estoque Insuficiente
```
POST /materials com materialId → status NEEDS_PURCHASE automático
Opções:
1. Aguardar reposição de estoque (aguardar PurchaseOrder)
2. Técnico compra em campo → PATCH para CONSUMED com unitCostActual
```

---

## 6. Integração com Outros Módulos

| Módulo | Ponto de Integração |
|--------|---------------------|
| Estoque | `/materials/reserve` decrementa `reservado`; `/consume` decrementa `quantidadeEstoque` |
| Financeiro | AWAITING_PAYMENT → cria Invoice → Invoice PAID → cria LedgerTransaction |
| Notificações | Toda mudança de status notifica técnico e gerente |
| WhatsApp | SCHEDULED → envia template `service_order_scheduled` ao cliente |
| Workforce | `technicianId` FK para Worker; valida se worker está ativo |

---

## 7. Queries Mais Usadas

```typescript
// Dashboard do técnico — suas OS do dia
const todasHoje = await prisma.serviceOrder.findMany({
  where: {
    technicianId: userId,
    scheduledDate: {
      gte: startOfDay(today),
      lte: endOfDay(today),
    },
    status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
  },
  include: {
    client: { select: { id: true, nome: true, telefone: true, addressStreet: true } },
    materials: { where: { status: 'PENDING' } }
  },
  orderBy: { scheduledDate: 'asc' }
})

// OS vencidas (AWAITING_PAYMENT > 30 dias)
const vencidas = await prisma.serviceOrder.findMany({
  where: {
    status: 'AWAITING_PAYMENT',
    completedAt: { lte: subDays(new Date(), 30) }
  },
  include: { client: { select: { nome: true } }, invoice: { select: { id: true, numero: true } } }
})
```
