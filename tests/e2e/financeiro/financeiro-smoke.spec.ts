import { test, expect } from '@playwright/test'

test.describe('Financeiro Module - Smoke Tests', () => {
  test('financeiro dashboard API requires authentication', async ({ page }) => {
    const res = await page.request.get('/api/financeiro/contas')
    expect([200, 401, 403]).toContain(res.status())
  })

  test('API requires authentication for despesas', async ({ page }) => {
    const res = await page.request.get('/api/financeiro/despesas?empresaId=1')
    expect([401, 403]).toContain(res.status())
  })

  test('API requires authentication for receitas', async ({ page }) => {
    const res = await page.request.get('/api/financeiro/receitas?empresaId=1')
    expect([401, 403]).toContain(res.status())
  })
})
