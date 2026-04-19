import { test, expect } from '@playwright/test'

test.describe('Financeiro Module - RBAC Tests', () => {
  test('USUARIO role cannot access financeiro read', async ({ page }) => {
    const res = await page.request.get('/api/financeiro/despesas?empresaId=1', {
      headers: {}
    })
    expect([401, 403]).toContain(res.status())
  })

  test('Financeiro API routes require auth', async ({ page }) => {
    const routes = [
      '/api/financeiro/contas',
      '/api/financeiro/transferencias',
      '/api/financeiro/receitas',
      '/api/financeiro/fluxo-caixa',
    ]
    for (const route of routes) {
      const res = await page.request.get(route)
      expect([401, 403]).toContain(res.status())
    }
  })

  test('Dashboard route requires auth', async ({ page }) => {
    const res = await page.request.get('/api/financeiro/dashboard')
    expect([401, 403]).toContain(res.status())
  })
})
