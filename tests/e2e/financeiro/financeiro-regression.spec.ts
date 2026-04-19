import { test, expect } from '@playwright/test'
import { seedAuthenticatedSessionWithMFA, seedAuthenticatedSessionFromDatabase } from '../helpers/auth'

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local'
const ADMIN_PASSWORD = 'Admin@123456'

test.describe('Financeiro Regression Guards', () => {
  test('[REG-AUTH-001] GET /api/financeiro/despesas sem cookie retorna 401', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/despesas')
    expect(resp.status()).toBe(401)
    const body = await resp.json()
    expect(body.success).toBe(false)
  })

  test('[REG-AUTH-002] POST /api/financeiro/despesas sem cookie retorna 401', async ({ page }) => {
    const resp = await page.request.post('/api/financeiro/despesas', { data: { descricao: 'test' } })
    expect(resp.status()).toBe(401)
  })

  test('[REG-AUTH-003] GET /api/financeiro/contas sem cookie retorna 401', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/contas')
    expect(resp.status()).toBe(401)
  })

  test('[REG-AUTH-004] GET /api/financeiro/dashboard sem cookie retorna 401', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/dashboard')
    expect(resp.status()).toBe(401)
  })

  test('[REG-AUTH-005] POST /api/financeiro/despesas/1/aprovar sem cookie retorna 401', async ({ page }) => {
    const resp = await page.request.post('/api/financeiro/despesas/1/aprovar', { data: {} })
    expect(resp.status()).toBe(401)
  })

  test('[REG-AUTH-006] GET /api/financeiro/fluxo-caixa sem cookie retorna 401', async ({ page }) => {
    const resp = await page.request.get('/api/financeiro/fluxo-caixa')
    expect(resp.status()).toBe(401)
  })

  test('[REG-RBAC-001] USUARIO não acessa GET /api/financeiro/despesas', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.usuario@teste.local')
    const resp = await page.request.get('/api/financeiro/despesas')
    expect(resp.status()).toBe(403)
    const body = await resp.json()
    expect(body.success).toBe(false)
  })

  test('[REG-RBAC-002] ESTOQUE não acessa GET /api/financeiro/contas', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.estoque@teste.local')
    const resp = await page.request.get('/api/financeiro/contas')
    expect(resp.status()).toBe(403)
  })

  test('[REG-PAGINATE-001] GET /api/financeiro/despesas retorna pagination no response', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/dashboard/financeiro')
    const resp = await page.request.get('/api/financeiro/despesas')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.pagination).toBeDefined()
    expect(body.pagination.page).toBeDefined()
    expect(body.pagination.total).toBeDefined()
    expect(body.pagination.totalPages).toBeDefined()
  })

  test('[REG-SENSITIVE-001] Response de GET /api/financeiro/despesas não vaza campos sensíveis', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/dashboard/financeiro')
    const resp = await page.request.get('/api/financeiro/despesas')
    const body = await resp.json()
    const str = JSON.stringify(body)
    expect(str).not.toMatch(/"senha"|"hash"|"pin"|"secret"/)
  })

  test('[REG-SUCCESS-001] Erros de validação retornam { success: false }', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/dashboard/financeiro')
    const resp = await page.request.post('/api/financeiro/despesas', { data: {} })
    const body = await resp.json()
    expect(body.success).toBe(false)
  })

  test('[REG-AUDIT-001] POST /api/financeiro/despesas/[id]/aprovar requer autenticação', async ({ page }) => {
    const resp = await page.request.post('/api/financeiro/despesas/1/aprovar', { data: {} })
    expect([401, 404]).toContain(resp.status())
  })

  test('[REG-AUDIT-002] PUT /api/financeiro/tax/regime requer autenticação', async ({ page }) => {
    const resp = await page.request.put('/api/financeiro/tax/regime', { data: {} })
    expect(resp.status()).toBe(401)
  })
})
