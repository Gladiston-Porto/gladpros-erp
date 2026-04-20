# Deploy Runbook — Módulo Invoices
**GladPros ERP · Última atualização: 2026-04-19**

---

## Pré-requisitos

Antes de fazer deploy do módulo de invoices em produção, todos os itens abaixo devem estar concluídos:

---

## 1. Variáveis de Ambiente Obrigatórias

### 1.1 `INVOICE_WEBHOOK_SECRET` ⚠️ Crítico

Usado para autenticar chamadas externas ao webhook `/api/webhooks/invoice-paid`.
Sem essa variável, o endpoint retorna `401` para **todas** as chamadas.

**Como gerar:**
```bash
openssl rand -hex 32
# Exemplo de saída: 8f3a9c2d1e4b7a6f0d5c8e2a1b9f4e7d3c6a0b2f5e8d1c4a7b0e3f6d9c2a5b8e
```

**Onde definir:**
```bash
# .env.production
INVOICE_WEBHOOK_SECRET=<valor-gerado-acima>
```

**Como o caller usa:**
```bash
curl -X POST https://gladpros.com/api/webhooks/invoice-paid \
  -H "Authorization: Bearer <INVOICE_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": 123, "paymentMethod": "BANK_TRANSFER", "paidAt": "2026-04-19T20:00:00Z"}'
```

**Como testar em staging:**
```bash
# 1. Defina a variável no ambiente de staging
# 2. Execute:
curl -X POST https://staging.gladpros.com/api/webhooks/invoice-paid \
  -H "Authorization: Bearer $INVOICE_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": 1, "paymentMethod": "BANK_TRANSFER"}'
# Resposta esperada: {"data":{"invoiceId":1,...},"success":true}

# Sem token — deve retornar 401:
curl -X POST https://staging.gladpros.com/api/webhooks/invoice-paid \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": 1}'
# Resposta esperada: {"error":"Unauthorized","success":false}
```

---

### 1.2 Variáveis SMTP

Para envio de invoices por email:

```bash
SMTP_HOST=smtp.sendgrid.net      # ou seu provedor
SMTP_PORT=587
SMTP_SECURE=false                # true para porta 465
SMTP_USER=apikey                 # para SendGrid
SMTP_PASS=<api-key-sendgrid>
SMTP_FROM=GladPros <billing@gladpros.com>
```

**Como testar SMTP:**
```bash
# Via endpoint de send (requer invoice DRAFT existente):
curl -X POST https://staging.gladpros.com/api/invoices/1/send \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json"
```

---

## 2. Migration de Banco — `empresaId` no Invoice

Se ainda não executada, rodar antes do deploy:

```bash
cd /projeto
npx prisma migrate deploy
```

Isso aplica a migration `add_empresaid_to_invoice` que:
- Adiciona coluna `empresaId INT DEFAULT 1` à tabela `Invoice`
- Atualiza todos os registros existentes com `empresaId = 1`
- Cria índices compostos `(empresaId, status)` e `(clienteId, status)`

**Verificar:**
```bash
# Confirmar que a coluna existe
npx prisma db pull --print | grep -A 3 "empresaId"
```

---

## 3. Checklist Pré-Deploy

```
[ ] INVOICE_WEBHOOK_SECRET definido em .env.production
[ ] SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS definidos
[ ] npx prisma migrate deploy executado (migration empresaId)
[ ] npx tsc --noEmit → 0 erros
[ ] npx jest "src/__tests__/api/invoices" → 55/55 passando
[ ] Build de produção sem erros: npm run build
```

---

## 4. Checklist Pós-Deploy

```
[ ] GET /api/invoices → 200 (ou 401 sem token)
[ ] POST /api/webhooks/invoice-paid sem token → 401
[ ] POST /api/webhooks/invoice-paid com token válido → 200
[ ] Envio de invoice por email funcional (testar com invoice DRAFT)
[ ] Rate limit de email: 5 envios/hora por usuário (429 após 5)
```

---

## 5. Rollback

Se necessário reverter:

```bash
# Reverter migration do banco
npx prisma migrate resolve --rolled-back add_empresaid_to_invoice

# Reverter código (se usando Git tags)
git checkout <tag-anterior>
npm run build && pm2 restart gladpros
```

---

## 6. Monitoramento Pós-Deploy

| Métrica | Como verificar |
|---------|---------------|
| Erros de SMTP | Logs do servidor: `grep "Erro ao enviar email" /var/log/app.log` |
| Webhook rejeitado | `grep "invoice-paid.*401" /var/log/nginx/access.log` |
| Rate limit atingido | `grep "429" /var/log/app.log \| grep "send"` |
| Erros de invoice | `grep "Invoice" /var/log/app.log \| grep "error"` |

---

## 7. Contatos de Emergência

| Situação | Ação |
|----------|------|
| SMTP não funciona | Verificar credenciais no painel SendGrid / provedor SMTP |
| Webhook não funciona | Confirmar `INVOICE_WEBHOOK_SECRET` no env e reiniciar processo |
| Migration falhou | `npx prisma migrate status` para ver estado; não reverter manualmente |
