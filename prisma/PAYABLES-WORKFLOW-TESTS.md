# Roteiro de Testes cURL - Workflow Payables

## Pré-requisitos
- Servidor dev rodando (`npm run dev`)
- Banco de dados conectado
- Token de autenticação válido (ADMIN ou FINANCEIRO)

---

## 1. Criar Worker

```bash
curl -X POST http://localhost:3000/api/workforce/workers \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<TOKEN>" \
  -d '{
    "name": "Test Contractor",
    "email": "test.contractor@example.com",
    "type": "INDIVIDUAL"
  }'
```

**Esperado:** `201 Created`
```json
{"success":true,"data":{"id":1,"name":"Test Contractor","email":"test.contractor@example.com"}}
```

---

## 2. Criar Assignment

```bash
curl -X POST http://localhost:3000/api/workforce/assignments \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<TOKEN>" \
  -d '{
    "workerId": 1,
    "jobId": 1,
    "payType": "HOURLY",
    "costRateHourly": 50
  }'
```

**Esperado:** `201 Created`
```json
{"success":true,"data":{"id":1,"workerId":1,"status":"ACTIVE"}}
```

---

## 3. Criar Timesheet

```bash
curl -X POST http://localhost:3000/api/workforce/timesheets \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<TOKEN>" \
  -d '{
    "assignmentId": 1,
    "periodStart": "2026-01-01",
    "periodEnd": "2026-01-07"
  }'
```

**Esperado:** `201 Created`
```json
{"success":true,"data":{"id":1,"status":"DRAFT"}}
```

---

## 4. Adicionar Entries

```bash
curl -X POST http://localhost:3000/api/workforce/timesheets/1/entries \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<TOKEN>" \
  -d '{
    "date": "2026-01-06",
    "hours": 8,
    "note": "Trabalho no projeto"
  }'
```

**Esperado:** `201 Created`

---

## 5. Submit Timesheet

```bash
curl -X POST http://localhost:3000/api/workforce/timesheets/1/submit \
  -H "Cookie: token=<TOKEN>"
```

**Esperado:** `200 OK`
```json
{"success":true,"data":{"id":1,"status":"SUBMITTED"}}
```

---

## 6. Approve Timesheet

```bash
curl -X POST http://localhost:3000/api/workforce/timesheets/1/approve \
  -H "Cookie: token=<TOKEN>"
```

**Esperado:** `200 OK`
```json
{"success":true,"data":{"id":1,"status":"APPROVED"}}
```

---

## 7. Generate Payable

```bash
curl -X POST http://localhost:3000/api/workforce/payables/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<TOKEN>" \
  -d '{"workerId": 1}'
```

**Esperado:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "PENDING",
    "totalAmount": "400.00",
    "worker": {"id": 1, "name": "Test Contractor"},
    "lineItems": [...]
  }
}
```

---

## 8. Approve Payable

```bash
curl -X POST http://localhost:3000/api/workforce/payables/1/approve \
  -H "Cookie: token=<TOKEN>"
```

**Esperado:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "APPROVED",
    "worker": {"id": 1, "name": "Test Contractor"}
  }
}
```

---

## 9. Mark Paid

```bash
curl -X POST http://localhost:3000/api/workforce/payables/1/mark-paid \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<TOKEN>" \
  -d '{
    "paymentMethod": "CHECK",
    "paymentRef": "CHK-2026-001"
  }'
```

**Esperado:** `200 OK`
```json
{
  "success": true,
  "data": {
    "payable": {
      "id": 1,
      "status": "PAID",
      "expenseId": 123
    },
    "expense": {
      "id": 123,
      "descricao": "Pagamento Worker: Test Contractor",
      "valor": "400.00",
      "status": "PAGO"
    }
  }
}
```

---

## 10. Listar Payables (API)

```bash
curl http://localhost:3000/api/workforce/payables \
  -H "Cookie: token=<TOKEN>"
```

**Esperado:** `200 OK`
- Array com payable id=1
- status=PAID
- worker preenchido
- expenseId preenchido

---

## 11. Validar Expense no Banco (SQL)

```sql
SELECT e.id, e.descricao, e.valor, e.status, e.origem, e.origem_id, e.empresa_id
FROM expenses e
WHERE e.origem = 'WORKER_PAYABLE' AND e.origem_id = 1;
```

**Esperado:**
- `origem = 'WORKER_PAYABLE'`
- `origem_id = 1` (payable id)
- `empresa_id` = empresaId do usuário (não hardcoded)
- `status = 'PAGO'`

---

## 12. Validar FK e Índices (SQL)

```sql
-- Verificar FK worker_id
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'payables' AND COLUMN_NAME = 'worker_id';

-- Verificar índice
SHOW INDEX FROM payables WHERE Column_name = 'worker_id';
```

**Esperado:** FK e índice existentes em `worker_id`

---

## Resumo de Status Codes

| Teste | Endpoint | Esperado |
|-------|----------|----------|
| 1 | POST /workers | 201 |
| 2 | POST /assignments | 201 |
| 3 | POST /timesheets | 201 |
| 4 | POST /timesheets/1/entries | 201 |
| 5 | POST /timesheets/1/submit | 200 |
| 6 | POST /timesheets/1/approve | 200 |
| 7 | POST /payables/generate | 201 |
| 8 | POST /payables/1/approve | 200 |
| 9 | POST /payables/1/mark-paid | 200 |
| 10 | GET /payables | 200 |
