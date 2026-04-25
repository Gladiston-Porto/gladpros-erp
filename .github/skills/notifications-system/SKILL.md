---
name: notifications-system
description: "Use when working on the in-app notification system — creating, delivering, reading, or broadcasting notifications via REST or WebSocket. Covers notification types, channels, delivery rules, and real-time WS connections."
---

# Skill: Notifications System

## When to Use
- Working on `/api/notifications/`, `/api/notifications/[id]`, `/api/notifications/ws`
- Triggering notifications from business events (OS status change, invoice sent, etc.)
- Implementing real-time UI badge/feed updates
- Debugging missing or duplicate notifications

---

## Architecture Overview

```
Business Event (status change, invoice, etc.)
  │
  ▼
NotificationService.create({ userId, type, title, message, data })
  │
  ├── Persists to DB (Notification table)
  │
  └── Broadcasts via WebSocket (if user is connected)
         /api/notifications/ws → SSE or WebSocket channel per userId
```

---

## API Endpoints

| Method | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| `GET` | `/api/notifications` | Autenticado | Lista notificações do usuário (`limit`, `offset`, `unread_only`) |
| `POST` | `/api/notifications` | `ADMIN` only | Cria notificação manual para qualquer userId |
| `GET` | `/api/notifications/[id]` | Owner | Busca notificação específica |
| `PATCH` | `/api/notifications/[id]` | Owner | Marca como lida |
| `DELETE` | `/api/notifications/[id]` | Owner | Remove notificação |
| `GET` | `/api/notifications/ws` | Autenticado | WebSocket / SSE para notificações em tempo real |

---

## Tipos de Notificação

```typescript
type NotificationType =
  | 'SERVICE_ORDER_SCHEDULED'    // OS agendada para o técnico
  | 'SERVICE_ORDER_COMPLETED'    // OS concluída
  | 'SERVICE_ORDER_CANCELLED'    // OS cancelada
  | 'INVOICE_SENT'               // Invoice enviada ao cliente
  | 'INVOICE_OVERDUE'            // Invoice vencida
  | 'PAYMENT_RECEIVED'           // Pagamento recebido
  | 'PROPOSAL_APPROVED'          // Proposta aprovada pelo cliente
  | 'PROPOSAL_REJECTED'          // Proposta rejeitada
  | 'PROJECT_STATUS_CHANGED'     // Mudança de status de projeto
  | 'MATERIAL_LOW_STOCK'         // Estoque abaixo do mínimo
  | 'USER_MENTION'               // Menção em comentário
  | 'SYSTEM_ALERT'               // Alerta do sistema (ADMIN only)
  | 'TASK_ASSIGNED'              // Tarefa atribuída
```

---

## Como Criar Notificações (Service Layer)

```typescript
import { NotificationService } from '@/shared/lib/notifications'

// Notificação simples
await NotificationService.create({
  userId: technicianId,
  type: 'SERVICE_ORDER_SCHEDULED',
  title: 'New Service Order Assigned',
  message: `You have a new service order scheduled for ${formatDate(scheduledDate)}`,
  data: {
    serviceOrderId: so.id,
    clientName: so.client.name,
    address: so.address,
  }
})

// Notificação com expiração
await NotificationService.create({
  userId: managerId,
  type: 'MATERIAL_LOW_STOCK',
  title: 'Low Stock Alert',
  message: `${product.name} is below minimum stock (${product.quantidadeEstoque} remaining)`,
  data: { productId: product.id, currentStock: product.quantidadeEstoque },
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
})
```

---

## WebSocket / SSE Channel

```typescript
// Client-side connection
const eventSource = new EventSource('/api/notifications/ws', {
  withCredentials: true  // inclui cookies de auth
})

eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data)
  // Update badge count, show toast, etc.
}

eventSource.onerror = () => {
  // Reconnect logic
  setTimeout(() => reconnect(), 3000)
}
```

**Regras de reconexão:**
- Reconectar automaticamente após 3s em caso de erro
- Não criar múltiplas conexões para o mesmo userId
- Fechar conexão ao deslogar (`eventSource.close()`)

---

## Delivery Rules

| Condição | Comportamento |
|----------|--------------|
| Usuário conectado via WS | Entrega em tempo real + persiste no DB |
| Usuário offline | Persiste no DB, entregue no próximo GET |
| `expiresAt` passou | Filtrado da listagem, pode ser limpo por cron |
| `isRead = true` | Não conta no badge, ainda aparece no histórico |
| Notificação duplicada | Verificar por `(userId, type, data.entityId)` antes de criar |

---

## Paginação (Padrão Obrigatório)

```typescript
// GET /api/notifications?limit=20&offset=0&unread_only=true
const result = await NotificationService.getUserNotifications(userId, {
  limit: Math.min(Number(limit), 50),  // máximo 50
  offset: Number(offset),
  unreadOnly: unread_only === 'true'
})

// Resposta
{
  data: Notification[],
  unreadCount: number,
  total: number,
  success: true
}
```

---

## Integração nos Módulos

### Onde disparar notificações (hooks de negócio)

```typescript
// Após mudar status da OS
if (newStatus === 'SCHEDULED' && so.technicianId) {
  await NotificationService.create({ userId: so.technicianId, type: 'SERVICE_ORDER_SCHEDULED', ... })
}

// Após aprovar proposta
if (proposal.status === 'APROVADA') {
  await NotificationService.create({ userId: proposal.createdBy, type: 'PROPOSAL_APPROVED', ... })
}

// Após invoice vencer (cron job)
// /api/cron → verifica invoices overdue → notifica FINANCEIRO + ADMIN
```

---

## RBAC

| Ação | Regra |
|------|-------|
| Ler próprias notificações | Qualquer role autenticado |
| Marcar como lida | Apenas o dono (userId match) |
| Criar notificação manual | `ADMIN` apenas |
| Ver notificações de outro usuário | `ADMIN` apenas |
| Deletar | Apenas o dono ou `ADMIN` |

---

## Anti-patterns

```typescript
// ❌ NUNCA incluir dados sensíveis no campo data
data: { ssn: client.ssn, creditCard: "4111..." }

// ❌ NUNCA criar notificações em loop sem deduplicate
items.forEach(async (item) => {
  await NotificationService.create(...)  // N+1 e duplicatas
})

// ✅ CORRETO — verificar antes de criar
const existing = await prisma.notification.findFirst({
  where: { userId, type, 'data.serviceOrderId': serviceOrderId }
})
if (!existing) await NotificationService.create(...)
```
