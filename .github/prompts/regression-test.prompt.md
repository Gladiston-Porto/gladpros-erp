---
description: "Cria um teste de regressão completo para um bug específico do GladPros ERP seguindo a convenção @bug:ID."
---

# Regression Test

Crie um teste de regressão para o bug especificado.

## Instruções

**Antes de criar**, colete estas informações:
1. Qual é o Bug ID? (ex: USUARIOS-P2-003)
2. Qual arquivo/rota está sendo testada?
3. Qual é o comportamento correto que deve ser verificado?
4. Quais mocks são necessários?

---

## Localização

```
src/__tests__/api/[modulo]/regression/[BUG-ID].test.ts
```

---

## Template

```typescript
// @bug:[BUG-ID]
// @description: [descrição do bug — o que causava o problema]
// @fix: [arquivo:linha — o que foi mudado para corrigir]
// @discovered: [YYYY-MM-DD] — quando o bug foi encontrado
// @fixed: [YYYY-MM-DD] — quando foi corrigido

import { NextRequest } from 'next/server'
// Importar o handler sendo testado:
import { [METODO] } from '@/app/api/[modulo]/[rota]/route'
// Importar dependencies mockadas:
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'

// === MOCKS ===
jest.mock('@/lib/prisma', () => ({
  prisma: {
    [modelo]: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: { create: jest.fn() }
  }
}))

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn().mockResolvedValue({
    id: 1,
    email: 'admin@gladpros.com',
    role: 'ADMIN',
    empresaId: 1,
    tokenVersion: 1,
  }),
}))

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn().mockReturnValue(true),
}))

// === HELPERS ===
const makeRequest = (method: string, body?: object) => {
  const req = new NextRequest(`http://localhost/api/[path]`, { 
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
  // Headers injetados pelo middleware:
  req.headers.set('x-user-id', '1')
  req.headers.set('x-user-role', 'ADMIN')
  req.headers.set('x-user-email', 'admin@gladpros.com')
  return req
}

// === TESTES ===
describe('REGRESSION [BUG-ID]: [título do bug]', () => {
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Teste principal: verifica que o fix está funcionando
   */
  it('[comportamento correto esperado após o fix]', async () => {
    // Arrange
    const mockData = { id: 1, empresaId: 1 /* ... */ }
    ;(prisma.[modelo].findUnique as jest.Mock).mockResolvedValue(mockData)
    ;(prisma.[modelo].update as jest.Mock).mockResolvedValue({ ...mockData /* + mudanças */ })

    // Act
    const req = makeRequest('DELETE') // ou GET, POST, PATCH
    const res = await [METODO](req, { params: { id: '1' } })
    const body = await res.json()

    // Assert — verificar o fix específico
    expect(prisma.[modelo].update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          // O que deve estar presente após o fix:
          // ex: tokenVersion: { increment: 1 }
        })
      })
    )
    expect(res.status).toBe(200)
  })

  /**
   * Teste de segurança: verificar que o bug não pode ser explorado
   */
  it('não deve [comportamento vulnerável]', async () => {
    // Testar o cenário que causava o bug
    // Verificar que agora está protegido
  })

})
```

---

## Após Criar o Teste

1. Rodar: `npm test -- --testPathPattern="[BUG-ID]" --verbose`
2. Confirmar que passa ✅
3. Atualizar `relatorios/known-bugs.json`:
   ```json
   { "regressionTest": "src/__tests__/api/[modulo]/regression/[BUG-ID].test.ts" }
   ```
4. Commit com mensagem:
   ```
   test([modulo]): regression test for [BUG-ID]
   ```

---

## Convenção @bug:ID

A tag `// @bug:[BUG-ID]` na primeira linha do arquivo é **obrigatória**.
Ela permite:
- `grep -r "@bug:" src/__tests__/` para listar todos os testes de regressão
- `check-module-health.mjs` validar que o regressionTest existe e tem a tag correta
- `certify-module.mjs` bloquear certificação se a tag estiver ausente
