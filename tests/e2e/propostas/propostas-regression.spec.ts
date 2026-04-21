import { test, expect } from '@playwright/test'
import { seedAuthenticatedSessionFromDatabase, seedAuthenticatedSessionWithMFA } from '../helpers/auth'

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local'
const ADMIN_PASS = 'Admin@12345'

test.describe('[REGRESSION] Módulo Propostas — Guards de Regressão', () => {
  // [P1-001] POST /api/propostas sem auth → deve ser 401, não 200
  test('[P1-001] POST /api/propostas sem auth retorna 401', async ({ page }) => {
    const resp = await page.request.post('/api/propostas', { data: { titulo: 'Teste' } })
    expect(resp.status()).toBe(401)
  })

  // [P1-002] GET /api/propostas/[id] sem auth → deve ser 401, não 200
  test('[P1-002] GET /api/propostas/1 sem auth retorna 401', async ({ page }) => {
    const resp = await page.request.get('/api/propostas/1')
    expect(resp.status()).toBe(401)
  })

  // [P1-003] Export PDF sem auth → deve ser 401, não 200
  test('[P1-003] POST /api/propostas/export/pdf sem auth retorna 401', async ({ page }) => {
    const resp = await page.request.post('/api/propostas/export/pdf', { data: {} })
    expect(resp.status()).toBe(401)
  })

  // [P1-004] Export CSV sem auth → deve ser 401, não 200
  test('[P1-004] POST /api/propostas/export/csv sem auth retorna 401', async ({ page }) => {
    const resp = await page.request.post('/api/propostas/export/csv', { data: {} })
    expect(resp.status()).toBe(401)
  })

  // [P1-005] Simple route sem auth → deve ser 401
  test('[P1-005] GET /api/propostas/simple sem auth retorna 401', async ({ page }) => {
    const resp = await page.request.get('/api/propostas/simple')
    expect(resp.status()).toBe(401)
  })

  // [P1-006] ESTOQUE não cria proposta → 403
  test('[P1-006] ESTOQUE tenta POST /api/propostas → 403', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.estoque@teste.local')
    const resp = await page.request.post('/api/propostas', { data: { titulo: 'Hack' } })
    expect(resp.status()).toBe(403)
    const body = await resp.json()
    expect(body.success).toBe(false)
  })

  // [P1-006] USUARIO não lê propostas → 403
  test('[P1-006] USUARIO tenta GET /api/propostas → 403', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, 'qa.usuario@teste.local')
    const resp = await page.request.get('/api/propostas')
    expect(resp.status()).toBe(403)
  })

  // [P2-004] Assinatura de proposta RASCUNHO é bloqueada
  test('[P2-004] Assinatura de proposta RASCUNHO retorna 400', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const listResp = await page.request.get('/api/propostas?status=RASCUNHO&pageSize=1')
    const listBody = await listResp.json()
    if (listBody.data.length === 0) return

    const id = listBody.data[0].id
    const resp = await page.request.post(`/api/propostas/${id}/assinatura`, {
      data: {
        assinaturaTipo: 'DIGITAL_NOME',
        assinaturaNome: 'Teste Regression',
        consentimento: true,
        termosAceitos: true,
      }
    })
    expect(resp.status()).toBe(400)
    const body = await resp.json()
    expect(body.success).toBe(false)
  })

  // [P1-009] XSS sanitizado no export PDF
  test('[P1-009] Export PDF sanitiza filtros maliciosos', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.post('/api/propostas/export/pdf', {
      data: { filters: { q: '<img src=x onerror=alert(1)>' } }
    })
    expect(resp.status()).not.toBe(500)
    if (resp.status() === 200) {
      const text = await resp.text()
      expect(text).not.toContain('<img src=x')
      expect(text).toContain('&lt;img')
    }
  })

  // [P2-005] Responses têm success field
  test('[P2-005] GET /api/propostas retorna { success: true }', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.get('/api/propostas')
    const body = await resp.json()
    expect(body.success).toBe(true)
  })

  // Deletar proposta ENVIADA → 400
  test('[REG-STATE] DELETE de proposta ENVIADA retorna 400', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const listResp = await page.request.get('/api/propostas?status=ENVIADA&pageSize=1')
    const listBody = await listResp.json()
    if (listBody.data.length === 0) return

    const id = listBody.data[0].id
    const resp = await page.request.delete(`/api/propostas/${id}`)
    expect(resp.status()).toBe(400)
  })
})
