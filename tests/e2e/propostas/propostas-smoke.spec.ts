import { test, expect } from '@playwright/test'
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth'

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local'
const ADMIN_PASS = 'Admin@12345'

test.describe('[SMOKE] Módulo Propostas', () => {
  test('[SMOKE-01] Dashboard de propostas carrega sem erro', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/propostas')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('text=500').first()).not.toBeVisible()
    await expect(page.locator('text=Internal Server').first()).not.toBeVisible()
  })

  test('[SMOKE-02] Redirect sem autenticação — /propostas → /login', async ({ page }) => {
    await page.goto('/propostas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('[SMOKE-02] Redirect sem autenticação — /propostas/nova → /login', async ({ page }) => {
    await page.goto('/propostas/nova')
    await expect(page).toHaveURL(/\/login/)
  })

  test('[SMOKE-03] Página de nova proposta carrega com autenticação', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/propostas/nova')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('text=500').first()).not.toBeVisible()
  })

  test('[SMOKE-04] GET /api/propostas sem auth retorna 401', async ({ page }) => {
    const resp = await page.request.get('/api/propostas')
    expect(resp.status()).toBe(401)
  })

  test('[SMOKE-04] POST /api/propostas sem auth retorna 401', async ({ page }) => {
    const resp = await page.request.post('/api/propostas', { data: {} })
    expect(resp.status()).toBe(401)
  })

  test('[SMOKE-04] POST /api/propostas/export/pdf sem auth retorna 401', async ({ page }) => {
    const resp = await page.request.post('/api/propostas/export/pdf', { data: {} })
    expect(resp.status()).toBe(401)
  })

  test('[SMOKE-04] POST /api/propostas/export/csv sem auth retorna 401', async ({ page }) => {
    const resp = await page.request.post('/api/propostas/export/csv', { data: {} })
    expect(resp.status()).toBe(401)
  })
})
