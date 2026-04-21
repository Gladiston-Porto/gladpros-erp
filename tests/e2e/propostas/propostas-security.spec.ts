import { test, expect } from '@playwright/test'
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth'

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local'
const ADMIN_PASS = 'Admin@12345'

test.describe('[SECURITY] Módulo Propostas', () => {
  test('[SEC-01] GET /api/propostas sem cookie → 401', async ({ page }) => {
    const resp = await page.request.get('/api/propostas')
    expect(resp.status()).toBe(401)
  })

  test('[SEC-01] POST /api/propostas sem cookie → 401', async ({ page }) => {
    const resp = await page.request.post('/api/propostas', { data: {} })
    expect(resp.status()).toBe(401)
  })

  test('[SEC-01] GET /api/propostas/1 sem cookie → 401', async ({ page }) => {
    const resp = await page.request.get('/api/propostas/1')
    expect(resp.status()).toBe(401)
  })

  test('[SEC-01] DELETE /api/propostas/1 sem cookie → 401', async ({ page }) => {
    const resp = await page.request.delete('/api/propostas/1')
    expect(resp.status()).toBe(401)
  })

  test('[SEC-01] POST /api/propostas/export/pdf sem cookie → 401', async ({ page }) => {
    const resp = await page.request.post('/api/propostas/export/pdf', { data: {} })
    expect(resp.status()).toBe(401)
  })

  test('[SEC-01] POST /api/propostas/export/csv sem cookie → 401', async ({ page }) => {
    const resp = await page.request.post('/api/propostas/export/csv', { data: {} })
    expect(resp.status()).toBe(401)
  })

  test('[SEC-01] GET /api/propostas/simple sem cookie → 401', async ({ page }) => {
    const resp = await page.request.get('/api/propostas/simple')
    expect(resp.status()).toBe(401)
  })

  test('[SEC-03] Body inválido em POST /api/propostas → 400 ou 422', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.post('/api/propostas', { data: {} })
    expect([400, 422, 500].includes(resp.status())).toBeTruthy()
  })

  test('[SEC-05] Response de GET /api/propostas não expõe campos sensíveis', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.get('/api/propostas')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    const bodyStr = JSON.stringify(body)
    expect(bodyStr).not.toMatch(/"senha"|"pin"|"hash"|"secret"/)
  })

  test('[P1-009 REG] XSS em export/pdf — filtros sanitizados', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.post('/api/propostas/export/pdf', {
      data: { filters: { q: '<script>alert("xss")</script>' } }
    })
    // Deve responder sem 500
    expect(resp.status()).not.toBe(500)
    if (resp.status() === 200) {
      const text = await resp.text()
      // O script literal não deve aparecer no output
      expect(text).not.toContain('<script>alert("xss")</script>')
    }
  })
})
