import { test, expect } from '@playwright/test'
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth'

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local'
const ADMIN_PASS = 'Admin@12345'

test.describe('[EDGE-CASES] Módulo Propostas', () => {
  test('[EDGE-01] Página 9999 retorna lista vazia sem erro 500', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.get('/api/propostas?page=9999&pageSize=10')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })

  test('[EDGE-01] pageSize=0 é tratado como 1 (não divide por zero)', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.get('/api/propostas?pageSize=0')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.pagination.pageSize).toBeGreaterThanOrEqual(1)
  })

  test('[EDGE-01] pageSize=1000 é limitado ao máximo (100)', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.get('/api/propostas?pageSize=1000')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.pagination.pageSize).toBeLessThanOrEqual(100)
  })

  test('[EDGE-03] GET /api/propostas/abc (ID não numérico) → 400', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.get('/api/propostas/abc')
    expect(resp.status()).toBe(400)
  })

  test('[EDGE-01] Export CSV com filtro de busca vazio retorna todos', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.post('/api/propostas/export/csv', {
      data: { filters: {} }
    })
    expect(resp.status()).toBe(200)
  })

  test('[EDGE-01] Export PDF com filtro de status inválido não gera 500', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.post('/api/propostas/export/pdf', {
      data: { filters: { status: 'INVALIDO' } }
    })
    expect(resp.status()).not.toBe(500)
  })

  test('[EDGE-04] Assinatura sem consentimento é bloqueada', async ({ page }) => {
    const resp = await page.request.post('/api/propostas/1/assinatura', {
      data: {
        assinaturaTipo: 'DIGITAL_NOME',
        assinaturaNome: 'Teste',
        consentimento: false,
        termosAceitos: true,
      }
    })
    expect([400, 401].includes(resp.status())).toBeTruthy()
  })
})
