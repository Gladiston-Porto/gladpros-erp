// @bug:USUARIOS-P3-001
// @description: Evita regressão de duplicação da função withRetry em rotas de usuarios.

import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('REGRESSION USUARIOS-P3-001', () => {
  const repoRoot = resolve(process.cwd())

  it('mantém withRetry centralizado em src/lib/utils/retry.ts', async () => {
    const listRoutePath = resolve(repoRoot, 'src/app/api/usuarios/route.ts')
    const detailRoutePath = resolve(repoRoot, 'src/app/api/usuarios/[id]/route.ts')

    const listRoute = readFileSync(listRoutePath, 'utf8')
    const detailRoute = readFileSync(detailRoutePath, 'utf8')

    expect(listRoute).not.toMatch(/function\s+withRetry\s*\(/)
    expect(detailRoute).not.toMatch(/function\s+withRetry\s*\(/)

    expect(listRoute).toContain('import { withRetry } from "@/lib/utils/retry";')
    expect(detailRoute).toContain("import { withRetry } from '@/lib/utils/retry';")
  })
})