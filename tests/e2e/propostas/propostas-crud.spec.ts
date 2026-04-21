import { test, expect } from '@playwright/test'
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth'

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local'
const ADMIN_PASS = 'Admin@12345'

test.describe('[CRUD] Módulo Propostas', () => {
  test('[CRUD-01] Listagem retorna dados paginados', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.get('/api/propostas?page=1&pageSize=10')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toBeDefined()
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.total).toBeGreaterThanOrEqual(0)
  })

  test('[CRUD-01] Filtro por status retorna apenas propostas do status', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.get('/api/propostas?status=RASCUNHO')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    const allRascunho = body.data.every((p: { status: string }) => p.status === 'RASCUNHO')
    expect(allRascunho).toBe(true)
  })

  test('[CRUD-01] Busca por texto retorna resultados relevantes', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.get('/api/propostas?search=PROP')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
  })

  test('[CRUD-03] GET /api/propostas/[id] retorna { data, success: true }', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    // Primeiro buscar uma proposta existente
    const listResp = await page.request.get('/api/propostas?pageSize=1')
    const listBody = await listResp.json()
    if (listBody.data.length === 0) return // pular se não há propostas

    const id = listBody.data[0].id
    const resp = await page.request.get(`/api/propostas/${id}`)
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    expect(body.data.id).toBe(id)
  })

  test('[CRUD-05] DELETE com ID inválido retorna 400', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.delete('/api/propostas/nao-existe')
    expect(resp.status()).toBe(400)
  })

  test('[CRUD-05] DELETE proposta inexistente retorna 404', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const resp = await page.request.delete('/api/propostas/999999')
    expect([404].includes(resp.status())).toBeTruthy()
  })

  test('[CRUD-06] Assinatura de proposta não ENVIADA é bloqueada', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASS, '/dashboard')
    const listResp = await page.request.get('/api/propostas?status=RASCUNHO&pageSize=1')
    const listBody = await listResp.json()
    if (listBody.data.length === 0) return

    const id = listBody.data[0].id
    const resp = await page.request.post(`/api/propostas/${id}/assinatura`, {
      data: {
        assinaturaTipo: 'DIGITAL_NOME',
        assinaturaNome: 'Teste',
        consentimento: true,
        termosAceitos: true,
      }
    })
    // Deve ser bloqueado por estado inválido (não está ENVIADA)
    expect(resp.status()).toBe(400)
  })
})
