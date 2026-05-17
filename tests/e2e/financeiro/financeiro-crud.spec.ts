import { test, expect } from '@playwright/test'
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth'

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local'
const ADMIN_PASSWORD = 'Admin@123456'
const NAV_TIMEOUT = 15_000

test.describe('Financeiro CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/financeiro')
  })

  test('[CRUD-01] Dashboard financeiro carrega com dados', async ({ page }) => {
    await page.goto('/financeiro', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=undefined')).not.toBeVisible()
  })

  test('[CRUD-02] Lista de despesas carrega', async ({ page }) => {
    await page.goto('/financeiro/despesas', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('[CRUD-03] Página de nova despesa carrega', async ({ page }) => {
    await page.goto('/financeiro/despesas/nova', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('[data-testid="form-despesa"]')).toBeVisible({ timeout: 10_000 })
  })

  test('[CRUD-04] Lista de receitas carrega', async ({ page }) => {
    await page.goto('/financeiro/receitas', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('[CRUD-04b] Página de nova receita carrega', async ({ page }) => {
    await page.goto('/financeiro/receitas/nova', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('[data-testid="form-receita"]')).toBeVisible({ timeout: 10_000 })
  })

  test('[CRUD-05] Lista de contas bancárias carrega', async ({ page }) => {
    await page.goto('/financeiro/contas', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('[CRUD-05b] Página de nova conta carrega', async ({ page }) => {
    await page.goto('/financeiro/contas/nova', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    await expect(page).not.toHaveTitle(/Error|404/)
    await expect(page.locator('[data-testid="form-conta"]')).toBeVisible({ timeout: 10_000 })
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

  test('[CRUD-09] API de transferencias retorna dados como ADMIN', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/transferencias')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
  })
})

