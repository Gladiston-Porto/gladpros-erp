---
name: regression-testing
description: "Use quando precisar criar testes de regressão para bugs corrigidos. Cobre a convenção @bug:ID, onde criar os testes, como validar e como atualizar known-bugs.json."
---

# Skill: Regression Testing

## Por que Testes de Regressão Importam

No GladPros, tivemos bugs P2 de segurança que foram corrigidos 3 vezes e voltaram. A causa raiz: **nenhum teste de regressão foi criado**.

A regra é simples:
> **Bug corrigido sem teste de regressão = bug que vai voltar.**

---

## Convenção @bug:ID

Todo teste de regressão deve ter a tag `// @bug:ID` no topo do arquivo. Isso permite:
- Rastrear qual teste cobre qual bug
- Validar automaticamente via `check-module-health.mjs`
- Buscar facilmente: `grep -r "@bug:" src/__tests__/`

---

## Onde Criar

```
src/__tests__/api/[modulo]/regression/[BUG-ID].test.ts
```

Exemplos:
- `src/__tests__/api/usuarios/regression/USUARIOS-P2-003.test.ts`
- `src/__tests__/api/financeiro/regression/FINANCEIRO-P2-001.test.ts`

---

## Template de Teste de Regressão

```typescript
// src/__tests__/api/[modulo]/regression/[BUG-ID].test.ts
// @bug:[BUG-ID]
// @description: [descrição do bug original — o que causava o problema]
// @fix: [o que foi corrigido e em qual arquivo/linha]
// @pr: [número do PR que fez o fix, se houver]

import { NextRequest } from 'next/server'

// Mocks mínimos necessários
jest.mock('@/lib/prisma', () => ({
  prisma: {
    // apenas o que o handler usa
  }
}))
jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn().mockResolvedValue({
    id: 1, email: 'admin@gladpros.com', role: 'ADMIN', empresaId: 1
  }),
}))

describe('REGRESSION [BUG-ID]: [título do bug]', () => {
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deve [comportamento correto após o fix] — cenário principal', async () => {
    // Arrange: configurar o cenário que causava o bug
    
    // Act: executar a ação que causava o bug
    
    // Assert: verificar que o fix está funcionando
    // (verificar o comportamento correto, não só que não crasha)
  })

  it('deve [verificar que o patch específico está presente]', async () => {
    // Teste que verifica o patch em si
    // Ex: "tokenVersion deve ser incrementado no DELETE"
  })
  
})
```

---

## Exemplos Reais do Módulo Usuarios

### USUARIOS-P2-003 — DELETE sem tokenVersion

```typescript
// @bug:USUARIOS-P2-003
// @description: DELETE /api/usuarios/[id] não incrementava tokenVersion, 
//               permitindo que usuário deletado continuasse autenticado via JWT
// @fix: src/app/api/usuarios/[id]/route.ts linha 577: tokenVersion: { increment: 1 }

import { DELETE } from '@/app/api/usuarios/[id]/route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() }
  }
}))

describe('REGRESSION USUARIOS-P2-003: DELETE deve invalidar JWT', () => {
  it('deve incrementar tokenVersion ao fazer soft-delete', async () => {
    const mockUser = { id: 42, empresaId: 1, nivel: 'USUARIO', status: 'ATIVO' }
    ;(prisma.usuario.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.usuario.update as jest.Mock).mockResolvedValue({ ...mockUser, status: 'INATIVO', tokenVersion: 2 })

    const req = new NextRequest('http://localhost/api/usuarios/42', { method: 'DELETE' })
    req.headers.set('x-user-id', '1')
    req.headers.set('x-user-role', 'ADMIN')

    await DELETE(req, { params: { id: '42' } })

    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenVersion: { increment: 1 }
        })
      })
    )
  })
})
```

---

## Atualizar known-bugs.json Após Criar Teste

Após criar o teste, atualizar `relatorios/known-bugs.json`:

```json
{
  "id": "USUARIOS-P2-003",
  "status": "FIXED",
  "regressionTest": "src/__tests__/api/usuarios/regression/USUARIOS-P2-003.test.ts",
  "fixedInCommit": "abc1234",
  "fixedAt": "2026-05-21"
}
```

O campo `regressionTest` é **obrigatório** para que `certify-module.mjs` aceite o status FIXED.

---

## Validação Automática

O `scripts/check-module-health.mjs` verifica:

```
⚠️  Bug USUARIOS-P2-003 marcado como FIXED mas regressionTest está null
    → Crie um teste em src/__tests__/api/usuarios/regression/USUARIOS-P2-003.test.ts
```

E o `scripts/certify-module.mjs` **bloqueia certificação** se existir FIXED sem teste.

---

## Checklist ao Corrigir um Bug

1. [ ] Fazer o fix mínimo necessário no código
2. [ ] Criar teste em `src/__tests__/.../regression/[BUG-ID].test.ts`
3. [ ] Adicionar tag `// @bug:[BUG-ID]` no topo do teste
4. [ ] Rodar `npm test -- --testPathPattern="[BUG-ID]"` e confirmar que passa
5. [ ] Atualizar `relatorios/known-bugs.json` com `regressionTest` preenchido
6. [ ] Verificar se precisa criar/atualizar regra Semgrep (`.semgrep/gladpros/`)
7. [ ] Rodar `node scripts/check-module-health.mjs` e confirmar saída limpa
