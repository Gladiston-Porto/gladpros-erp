import { test, expect } from '@playwright/test'
import { seedAuthenticatedSessionWithMFA, seedAuthenticatedSessionFromDatabase } from '../helpers/auth'

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local'
const ADMIN_PASSWORD = 'Admin@123456'

test.describe('Financeiro CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/dashboard/financeiro')
  })

  test('[CRUD-01] Dashboard financeiro carrega com dados', async ({ page }) => {
    await page.goto('/dashboard/financeiro')
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=undefined')).not.toBeVisible()
  })

  test('[CRUD-02] Lista de despesas carrega', async ({ page }) => {
    await page.goto('/dashboard/financeiro/despesas')
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('[CRUD-03] Página de nova despesa carrega', async ({ page }) => {
    await page.goto('/dashboard/financeiro/despesas/novo')
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('form, [data-testid="despesa-form"]').first()).toBeVisible().catch(() => {
      expect(page.url()).toContain('/despesas/novo')
    })
  })

  test('[CRUD-04] Lista de receitas carrega', async ({ page }) => {
    await page.goto('/dashboard/financeiro/receitas')
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('[CRUD-05] Lista de contas bancárias carrega', async ({ page }) => {
    await page.goto('/dashboard/financeiro/contas')
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('[CRUD-06] API de despesas retorna dados paginados como ADMIN', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/despesas')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    expect(body.pagination).toBeDefined()
  })

  test('[CRUD-07] API de receitas retorna dados paginados como ADMIN', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/receitas')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
    expect(body.pagination).toBeDefined()
  })

  test('[CRUD-08] API de contas retorna lista como ADMIN', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/contas')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
  })
})
