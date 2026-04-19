import { test, expect } from '@playwright/test'

test.describe('Financeiro Module - Security Tests', () => {
  test('All financeiro API routes block unauthenticated access', async ({ page }) => {
    const routes = [
      { method: 'GET', path: '/api/financeiro/contas' },
      { method: 'GET', path: '/api/financeiro/transferencias' },
      { method: 'GET', path: '/api/financeiro/receitas' },
      { method: 'GET', path: '/api/financeiro/fluxo-caixa?empresaId=1' },
      { method: 'GET', path: '/api/financeiro/despesas?empresaId=1' },
      { method: 'GET', path: '/api/financeiro/despesas/categorias?empresaId=1' },
      { method: 'GET', path: '/api/financeiro/receitas/categorias?empresaId=1' },
      { method: 'GET', path: '/api/financeiro/dashboard' },
    ]

    for (const { method, path } of routes) {
      const res = await page.request.fetch(path, { method })
      expect([401, 403]).toContain(res.status())
    }
  })

  test('POST to protected routes requires auth', async ({ page }) => {
    const routes = [
      '/api/financeiro/contas',
      '/api/financeiro/transferencias',
      '/api/financeiro/receitas',
    ]
    for (const path of routes) {
      const res = await page.request.post(path, { data: {} })
      expect([401, 403]).toContain(res.status())
    }
  })

  test('Owner compensation route requires auth', async ({ page }) => {
    const res = await page.request.get('/api/financeiro/owner-compensation')
    expect([401, 403]).toContain(res.status())
  })

  test('Tax regime route requires auth', async ({ page }) => {
    const res = await page.request.get('/api/financeiro/tax/regime')
    expect([401, 403]).toContain(res.status())
  })
})
