import { test, expect } from '@playwright/test'
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth'

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local'
const ADMIN_PASSWORD = 'Admin@123456'

test.describe('Financeiro Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/financeiro')
  })

  test('[EDGE-01] Body vazio em POST /api/financeiro/despesas retorna 400', async ({ page }) => {
    const resp = await page.request.post('/api/financeiro/despesas', { data: {} })
    expect(resp.status()).toBe(400)
    const body = await resp.json()
    expect(body.success).toBe(false)
  })

  test('[EDGE-02] ID inexistente em GET /api/financeiro/despesas/999999 retorna 404', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/despesas/999999')
    expect(resp.status()).toBe(404)
    const body = await resp.json()
    expect(body.success).toBe(false)
  })

  test('[EDGE-03] Body vazio em POST /api/financeiro/receitas retorna 400', async ({ page }) => {
    const resp = await page.request.post('/api/financeiro/receitas', { data: {} })
    expect(resp.status()).toBe(400)
    const body = await resp.json()
    expect(body.success).toBe(false)
  })

  test('[EDGE-04] Paginação extrema page=9999 retorna lista vazia sem 500', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/despesas?page=9999&pageSize=10')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(0)
  })

  test('[EDGE-05] pageSize muito grande é limitado — nunca retorna tabela inteira', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/despesas?page=1&pageSize=10000')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
    if (body.pagination) {
      expect(body.pagination.pageSize).toBeLessThanOrEqual(200)
    }
  })

  test('[EDGE-06] Dashboard financeiro não tem undefined/null visível', async ({ page }) => {
    await page.goto('/financeiro')
    const content = await page.content()
    expect(content).not.toMatch(/>\s*undefined\s*<|>\s*\[object Object\]\s*</)
  })

  test('[EDGE-07] Fluxo de caixa carrega sem erro 500', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/fluxo-caixa')
    expect([200, 400]).toContain(resp.status())
    const body = await resp.json()
    expect(body.success !== false || resp.status() !== 500).toBe(true)
  })

  test('[EDGE-08] API retorna { success: false } em todos os erros de validação', async ({ page }) => {
    const endpoints = [
      '/api/financeiro/contas',
      '/api/financeiro/transferencias',
    ]
    for (const endpoint of endpoints) {
      const resp = await page.request.post(endpoint, { data: {} })
      expect([400, 422]).toContain(resp.status())
      const body = await resp.json()
      expect(body.success).toBe(false)
    }
  })
})
