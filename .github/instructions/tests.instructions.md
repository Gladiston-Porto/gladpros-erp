---
description: "Use when creating or modifying test files. Covers Jest unit/integration test patterns, Playwright E2E patterns, mock conventions, and coverage expectations for the GladPros ERP."
applyTo: "**/*.test.ts,**/*.test.tsx,tests/**/*.spec.ts"
---

# Test Standards

## Jest — Unit & Integration Tests

### File Location
```
src/[módulo]/__tests__/[arquivo].test.ts   # testes de componente/helper específico
src/shared/lib/__tests__/[util].test.ts    # testes de utilitários compartilhados
src/app/api/[módulo]/__tests__/route.test.ts  # testes de API routes (se necessário)
```

### Structure
```typescript
import { funcao } from '../arquivo'

describe('[módulo ou arquivo]', () => {
  describe('[funcao ou comportamento]', () => {
    it('deve [resultado esperado] quando [condição]', () => {
      // Arrange
      const input = { ... }
      // Act
      const result = funcao(input)
      // Assert
      expect(result).toEqual({ ... })
    })
  })
})
```

---

## Mocks Obrigatórios

### Prisma
```typescript
jest.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    // ... outros models necessários
  }
}))

// Uso
import { prisma } from '@/lib/prisma'
const mockFindMany = prisma.cliente.findMany as jest.MockedFunction<typeof prisma.cliente.findMany>
mockFindMany.mockResolvedValue([{ id: 1, nome: 'John Smith', ... }])
```

### Auth (requireUser)
```typescript
jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn().mockResolvedValue({
    id: 1,
    email: 'admin@gladpros.com',
    role: 'ADMIN',
    empresaId: 1,
  }),
  can: jest.fn().mockReturnValue(true),
}))
```

### RBAC por Role
```typescript
// Testar acesso negado
const mockRequireUser = requireUser as jest.Mock
mockRequireUser.mockResolvedValue({ id: 2, role: 'USUARIO', empresaId: 1 })

const mockCan = can as jest.Mock
mockCan.mockReturnValue(false)  // role sem permissão

const response = await GET(mockRequest)
expect(response.status).toBe(403)
```

---

## Dados de Teste Realistas (Dallas, TX)

```typescript
const mockCliente = {
  id: 1,
  nome: 'John Smith',
  email: 'john.smith@example.com',
  telefone: '(214) 555-0123',
  addressStreet: '1234 Oak Lawn Ave',
  addressCity: 'Dallas',
  addressState: 'TX',
  addressZip: '75219',
  empresaId: 1,
}

const mockServiceOrder = {
  id: 1,
  titulo: 'Electrical Panel Replacement',
  status: 'DRAFT',
  scheduledDate: new Date('2024-12-15T10:00:00-06:00'),  // America/Chicago
  empresaId: 1,
}

const mockInvoice = {
  id: 1,
  numero: 'INV-2024-00001',
  valorTotal: 1500.00,
  taxAmount: 123.75,   // 8.25% TX sales tax
  status: 'DRAFT',
  empresaId: 1,
}
```

---

## Cobertura Esperada por Tipo

### API Route
```typescript
describe('GET /api/[módulo]', () => {
  it('retorna 401 quando não autenticado')
  it('retorna 403 para role sem permissão')
  it('retorna 200 com dados paginados')
  it('retorna 400 com parâmetros inválidos')
})

describe('POST /api/[módulo]', () => {
  it('retorna 401 quando não autenticado')
  it('retorna 403 para role sem permissão')
  it('retorna 201 com entidade criada')
  it('retorna 400 com body inválido (Zod)')
  it('retorna 409 quando há duplicata')
})
```

### Máquina de Estado
```typescript
describe('transições de status', () => {
  it('DRAFT → SENT é válido com itens e clienteId')
  it('SENT → PAID é válido com valorPago = valorTotal')
  it('PAID → DRAFT é inválido (deve lançar erro)')
  it('status desconhecido → rejeitar com erro claro')
})
```

### Cálculos
```typescript
describe('calculateInvoiceTotals', () => {
  it('calcula subtotal corretamente')
  it('aplica TX sales tax 8.25% apenas em itens taxáveis')
  it('arredonda para 2 casas decimais')
  it('retorna zero tax quando nenhum item é taxável')
})
```

---

## Playwright — E2E Tests

### File Location
```
tests/e2e/[módulo].spec.ts       # fluxos principais
tests/e2e/[módulo]-rbac.spec.ts  # testes de permissão por role
```

### Base Structure
```typescript
import { test, expect } from '@playwright/test'

test.describe('[Módulo] — [Role]', () => {
  test.use({ storageState: 'tests/.auth/admin.json' })  // autenticação pre-salva

  test('deve criar [entidade] e exibir na lista', async ({ page }) => {
    await page.goto('/[módulo]/novo')
    await page.fill('[data-testid=campo-nome]', 'Test Entity')
    await page.click('[data-testid=btn-salvar]')
    await expect(page.locator('[data-testid=success-toast]')).toBeVisible()
    await expect(page).toHaveURL('/[módulo]')
    await expect(page.getByText('Test Entity')).toBeVisible()
  })
})
```

### Data-testid Convention
```typescript
// Usar data-testid para elementos interativos nos testes
<Button data-testid="btn-salvar-invoice">Salvar</Button>
<Input data-testid="input-valor-total" />
<div data-testid="status-badge-paid">Paid</div>
```

---

## Anti-patterns

```typescript
// ❌ Estado compartilhado entre testes
let createdId: number
it('cria entidade', () => { createdId = result.id })
it('usa entidade criada', () => { fetch(`/api/${createdId}`) })  // depende do anterior

// ❌ console.log nos testes
console.log('debug', result)  // remover antes de commitar

// ❌ Testes que dependem de dados do banco real
const result = await prisma.cliente.findFirst()  // banco pode estar vazio
expect(result?.nome).toBe('John')  // frágil

// ❌ expect sem mensagem em casos críticos de RBAC
expect(response.status).toBe(403)  // ok, mas pode adicionar mensagem
expect(response.status).toBe(403)  // { message: 'should block USUARIO from deleting invoice' }
```
