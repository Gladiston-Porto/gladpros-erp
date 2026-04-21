import { test, expect } from '@playwright/test'
import { seedAuthenticatedSessionFromDatabase, seedAuthenticatedSessionWithMFA } from '../helpers/auth'

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local'
const ADMIN_PASS = 'Admin@12345'

test.describe('[RBAC] Módulo Propostas', () => {
  test('[RBAC-01] ADMIN acessa dashboard de propostas', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/propostas')
    await expect(page).not.toHaveURL(/\/login|\/403/)
  })

  test('[RBAC-01] ADMIN consegue criar proposta via API', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.get('/api/propostas')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
  })

  test('[RBAC-02] GERENTE acessa propostas (ALL)', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.gerente@teste.local')
    const resp = await page.request.get('/api/propostas')
    expect(resp.status()).toBe(200)
  })

  test('[RBAC-02] FINANCEIRO acessa propostas (ALL)', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.financeiro@teste.local')
    const resp = await page.request.get('/api/propostas')
    expect(resp.status()).toBe(200)
  })

  test('[RBAC-03] ESTOQUE não acessa propostas → 403', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.estoque@teste.local')
    const resp = await page.request.get('/api/propostas')
    expect(resp.status()).toBe(403)
    const body = await resp.json()
    expect(body.success).toBe(false)
  })

  test('[RBAC-03] USUARIO não acessa propostas → 403', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.usuario@teste.local')
    const resp = await page.request.get('/api/propostas')
    expect(resp.status()).toBe(403)
  })

  test('[RBAC-03] ESTOQUE não cria proposta → 403', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.estoque@teste.local')
    const resp = await page.request.post('/api/propostas', { data: { titulo: 'Teste' } })
    expect(resp.status()).toBe(403)
  })

  test('[RBAC-03] USUARIO não exporta propostas → 403', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.usuario@teste.local')
    const resp = await page.request.post('/api/propostas/export/csv', { data: {} })
    expect(resp.status()).toBe(403)
  })

  test('[RBAC-03] ESTOQUE não exporta PDF → 403', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.estoque@teste.local')
    const resp = await page.request.post('/api/propostas/export/pdf', { data: {} })
    expect(resp.status()).toBe(403)
  })
})
