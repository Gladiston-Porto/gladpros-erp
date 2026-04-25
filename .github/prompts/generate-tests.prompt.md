---
description: "Gera testes Jest e/ou Playwright para um módulo existente do GladPros ERP, cobrindo RBAC, status machine, validações Zod, e edge cases de negócio"
agent: "agent"
---

# Gerar Testes — GladPros ERP

Use este prompt para gerar uma suíte de testes completa para qualquer módulo ou arquivo existente.

**Informe o que precisa de testes:**

> Exemplo: "Gere testes para src/app/api/invoices/route.ts cobrindo RBAC, status machine e cálculo de TX sales tax"

---

## O que será gerado

### Para API Routes (`src/app/api/`)
1. Teste de autenticação — 401 sem token
2. Teste de RBAC — 403 para cada role sem permissão; 200 para roles com permissão
3. Teste de validação Zod — 400 com dados inválidos
4. Teste de sucesso — 200 com resposta no formato `{ data, success: true }`
5. Teste de not found — 404 quando entidade não existe
6. Teste de conflito — 409 quando há duplicata (se aplicável)

### Para Máquinas de Estado
1. Cada transição válida (deve retornar novo status)
2. Cada transição inválida (deve rejeitar com erro claro)
3. Transição a partir de estado terminal (deve bloquear)

### Para Cálculos Financeiros
1. Valor zero
2. Arredondamento a 2 casas decimais
3. Texas sales tax (8.25%) sobre itens taxáveis
4. Desconto — não pode exceder preço unitário

### Para Fluxos de UI (Playwright)
1. Login como role específico
2. Navegação até o módulo
3. CRUD básico (criar, ver, editar, deletar)
4. Permissões visuais — botões ausentes para roles sem acesso
5. Formulário com validação — campos obrigatórios bloqueados

---

## Parâmetros

Ao usar este prompt, especifique:

| Parâmetro | Exemplo |
|-----------|---------|
| Arquivo alvo | `src/app/api/service-orders/route.ts` |
| Tipo de teste | `jest` \| `playwright` \| `ambos` |
| Role para E2E | `ADMIN` \| `GERENTE` \| `USUARIO` \| `todos` |
| Foco especial | `status machine` \| `RBAC` \| `cálculos` \| `completo` |

---

## Localização dos Arquivos Gerados

```
Jest:       src/[módulo]/__tests__/[arquivo].test.ts
            src/shared/lib/__tests__/[helper].test.ts

Playwright: tests/e2e/[módulo].spec.ts
```

---

## Regras

- Testes devem ser **independentes** — sem estado compartilhado entre `it()`
- Dados de teste devem ser **realistas** — nomes texanos, valores USD, datas America/Chicago
- Mocks de banco via `jest.mock('@/lib/prisma')`
- Mocks de auth via `jest.mock('@/shared/lib/rbac')`
- Nunca importar `@/server/db` nos testes

Informe o módulo e eu gero os testes.
