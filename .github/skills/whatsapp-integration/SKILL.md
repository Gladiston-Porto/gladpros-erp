---
name: whatsapp-integration
description: "Use when working on WhatsApp Business API integration — send messages, handle webhooks, manage templates, track delivery status. Covers GladPros-specific use cases: OS notifications, proposals, payment reminders."
---

# Skill: WhatsApp Integration

## When to Use
- Working on `/api/whatsapp/send`, `/api/whatsapp/webhook`, `/api/whatsapp/templates`
- Building notification triggers that send WhatsApp messages
- Implementing template approval or management flows
- Debugging webhook delivery or message failures

---

## Current Implementation Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/whatsapp/send` | **Mock** — simulates send, não envia real | Produção requer `WHATSAPP_ACCESS_TOKEN` |
| `GET /api/whatsapp/webhook` | **Ativo** — verificação Meta webhook | `WHATSAPP_VERIFY_TOKEN` obrigatório em prod |
| `POST /api/whatsapp/webhook` | **Estrutura pronta** — processa eventos | Handler de eventos para prod |
| `GET /api/whatsapp/templates` | Gestão de templates | Listagem e criação de templates aprovados |

> **⚠️ Estado atual**: A integração está em modo mock. Para produção, configure as variáveis de ambiente abaixo e substitua a simulação pela chamada real à API do Meta.

---

## Variáveis de Ambiente Obrigatórias (Produção)

```bash
WHATSAPP_ACCESS_TOKEN=          # Bearer token da Meta Business API
WHATSAPP_PHONE_NUMBER_ID=       # ID do número de telefone registrado
WHATSAPP_BUSINESS_ACCOUNT_ID=   # ID da conta WhatsApp Business
WHATSAPP_VERIFY_TOKEN=          # Token para verificação do webhook Meta
WHATSAPP_APP_SECRET=            # Para validar assinatura do webhook (X-Hub-Signature-256)
```

---

## API Meta WhatsApp Business — Referência

### Envio de Mensagem de Texto
```
POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}

{
  "messaging_product": "whatsapp",
  "to": "15551234567",
  "type": "text",
  "text": { "body": "Mensagem aqui" }
}
```

### Envio por Template Aprovado
```json
{
  "messaging_product": "whatsapp",
  "to": "15551234567",
  "type": "template",
  "template": {
    "name": "service_order_scheduled",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "John" },
          { "type": "text", "text": "2024-12-15 at 10:00 AM" }
        ]
      }
    ]
  }
}
```

---

## Formato de Número de Telefone

```typescript
// ✅ CORRETO — formato E.164 sem +
const phone = "15551234567"  // US number (1 + area code + number)

// ❌ ERRADO
const phone = "+1 (555) 123-4567"
const phone = "555-123-4567"
```

**Validação no GladPros:**
```typescript
// US numbers — usado em clientes do Texas
const usPhoneRegex = /^1\d{10}$/   // 11 digits starting with 1

// Brazilian numbers (legado no mock)
const brPhoneRegex = /^55\d{10,11}$/  // 12-13 digits starting with 55
```

---

## Casos de Uso no GladPros

| Trigger | Template | Módulo de Origem |
|---------|----------|-----------------|
| OS agendada | `service_order_scheduled` | Service Orders |
| OS concluída | `service_order_completed` | Service Orders |
| Proposta enviada | `proposal_sent` | Propostas |
| Invoice enviada | `invoice_sent` | Invoices |
| Invoice vencendo | `payment_reminder` | Financeiro |
| Invoice vencida | `payment_overdue` | Financeiro |
| Primeiro acesso | `welcome_user` | Auth |

---

## Segurança do Webhook

### Verificação de Assinatura (Produção Obrigatório)
```typescript
import { createHmac } from 'crypto'

function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  appSecret: string
): boolean {
  const expected = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')
  return `sha256=${expected}` === signature
}

// Usar no handler:
const signature = request.headers.get('x-hub-signature-256') ?? ''
const rawBody = await request.text()

if (!verifyWebhookSignature(rawBody, signature, process.env.WHATSAPP_APP_SECRET!)) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
}
```

> **Nunca aceitar webhook sem verificar a assinatura em produção.**

---

## Tipos de Eventos do Webhook

```typescript
type WhatsAppWebhookEvent = {
  object: 'whatsapp_business_account'
  entry: Array<{
    id: string
    changes: Array<{
      field: 'messages'
      value: {
        messaging_product: 'whatsapp'
        messages?: Array<{
          id: string
          from: string
          type: 'text' | 'image' | 'audio' | 'document' | 'interactive'
          timestamp: string
          text?: { body: string }
        }>
        statuses?: Array<{
          id: string
          recipient_id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
        }>
      }
    }>
  }>
}
```

---

## Rate Limits (Meta API)

| Tipo | Limite |
|------|--------|
| Mensagens por segundo | 80 msg/s (Tier 1) |
| Mensagens por 24h por usuário | 1 conversação de negócios ativa |
| Templates por conta | 250 aprovados |
| Janela de atendimento | 24h após última mensagem do cliente |

> Fora da janela de 24h: **apenas templates aprovados** podem ser enviados.
> Dentro da janela: qualquer tipo de mensagem.

---

## Erros Comuns e Soluções

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| 131047 | Message failed to send | Número fora da janela 24h | Usar template aprovado |
| 131030 | Parameter not valid | Formato de número inválido | Usar E.164 sem `+` |
| 131056 | Business Account not verified | Conta não verificada | Verificar no Meta Business |
| 100 | Invalid parameter | `WHATSAPP_ACCESS_TOKEN` errado | Verificar token no env |

---

## RBAC — Quem Pode Enviar

| Ação | ADMIN | GERENTE | FINANCEIRO | USUARIO |
|------|-------|---------|------------|---------|
| Enviar mensagem manual | ✅ | ✅ | ✅ | ✅ |
| Criar/aprovar template | ✅ | ❌ | ❌ | ❌ |
| Ver histórico de mensagens | ✅ | ✅ | ✅ | ❌ |
| Configurar webhook | ✅ | ❌ | ❌ | ❌ |

---

## Anti-patterns

```typescript
// ❌ NUNCA logar mensagens com dados de cliente
console.log(`Sending to ${clientPhone}: ${message}`)

// ❌ NUNCA hardcodar números de produção
const to = "+15551234567"

// ❌ NUNCA enviar sem rate limiting em batch
await Promise.all(clients.map(c => sendWhatsApp(c.phone, msg)))  // pode exceder limite

// ✅ CORRETO — batch com delay
for (const client of clients) {
  await sendWhatsApp(client.phone, msg)
  await new Promise(r => setTimeout(r, 50))  // ~20 msg/s, seguro
}
```
