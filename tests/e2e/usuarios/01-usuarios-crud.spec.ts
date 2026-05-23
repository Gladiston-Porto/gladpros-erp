/**
 * 01 — Happy-path CRUD completo do módulo Usuários (ADMIN logado).
 *
 * Cobre: criar → listagem → GET detail → PATCH → toggle-status
 * → DELETE (soft) → filtros + paginação + cache invalidation.
 */

import { test, expect, mockUsers, getAuthHeaders, resetRateLimits } from '../fixtures/auth';
import { seedUsuarios, cleanupUsuarios, teardownUsuarios } from '../fixtures/usuarios-seed';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe.serial('01 — Usuários CRUD (ADMIN)', () => {
  let createdUserId: number | null = null;
  const testEmail = `crud-${Date.now()}@e2e-test.com`;

  test.beforeAll(async () => {
    await seedUsuarios();
  });
  test.afterAll(async () => {
    await teardownUsuarios();
  });
  test.beforeEach(async ({ request }) => {
    await resetRateLimits(request);
  });

  // ── POST: criar usuário ──
  test('POST /api/usuarios cria usuário com senha provisória', async ({
    request,
    adminHeaders,
  }) => {
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: {
        email: testEmail,
        nomeCompleto: 'CRUD Test User',
        role: 'USUARIO',
        telefone: '4693346918',
        cidade: 'Dallas',
        estado: 'TX',
        cep: '75287',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(testEmail);
    createdUserId = body.data.id;
    expect(createdUserId).toBeGreaterThan(0);
  });

  // ── GET list: novo usuário aparece ──
  test('GET /api/usuarios lista inclui o usuário recém-criado', async ({
    request,
    adminHeaders,
  }) => {
    const res = await request.get(`${BASE}/api/usuarios?q=${encodeURIComponent(testEmail)}`, {
      headers: adminHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const found = body.data.find((u: { email: string }) => u.email === testEmail);
    expect(found).toBeTruthy();
    expect(found.role).toBe('USUARIO');
  });

  // ── GET list: paginação ──
  test('GET /api/usuarios com pageSize=1 retorna 1 item', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?pageSize=1`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.pagination.total).toBeGreaterThan(1);
    expect(body.pagination.pageSize).toBe(1);
  });

  // ── GET list: filtros role + status ──
  test('GET /api/usuarios filtra por role=ADMIN', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?role=ADMIN`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const u of body.data) {
      expect(u.role).toBe('ADMIN');
    }
  });

  test('GET /api/usuarios filtra por status=ATIVO', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?status=ATIVO`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const u of body.data) {
      expect(u.status).toBe('ATIVO');
    }
  });

  // ── GET list: sort ──
  test('GET /api/usuarios sort por email ASC', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?sortKey=email&sortDir=asc`, {
      headers: adminHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const emails = body.data.map((u: { email: string }) => u.email);
    const collator = new Intl.Collator('en-US', {
      sensitivity: 'base',
      ignorePunctuation: true,
      numeric: true,
    });
    const sorted = [...emails].sort(collator.compare);
    expect(emails).toEqual(sorted);
  });

  // ── GET list: page inválida ──
  test('GET /api/usuarios page=-1 retorna 400', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?page=-1`, { headers: adminHeaders });
    expect(res.status()).toBe(400);
  });

  // ── GET detail ──
  test('GET /api/usuarios/:id retorna detalhes completos', async ({ request, adminHeaders }) => {
    expect(createdUserId).toBeTruthy();
    const res = await request.get(`${BASE}/api/usuarios/${createdUserId}`, {
      headers: adminHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe(testEmail);
    expect(body.data.nomeCompleto).toBe('CRUD Test User');
    expect(body.data.role).toBe('USUARIO');
    expect(body.data.cidade).toBe('Dallas');
  });

  test('GET /api/usuarios/999999999 retorna 404', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/999999999`, { headers: adminHeaders });
    expect(res.status()).toBe(404);
  });

  test('GET /api/usuarios/abc retorna 400', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/abc`, { headers: adminHeaders });
    expect(res.status()).toBe(400);
  });

  // ── PATCH: atualizar campos ──
  test('PATCH /api/usuarios/:id atualiza nomeCompleto e telefone', async ({
    request,
    adminHeaders,
  }) => {
    const res = await request.patch(`${BASE}/api/usuarios/${createdUserId}`, {
      headers: adminHeaders,
      data: { nomeCompleto: 'Updated CRUD User', telefone: '2145551234' },
    });
    expect(res.status()).toBe(200);

    const detail = await request.get(`${BASE}/api/usuarios/${createdUserId}`, {
      headers: adminHeaders,
    });
    const body = await detail.json();
    expect(body.data.nomeCompleto).toBe('Updated CRUD User');
    expect(body.data.telefone).toContain('214');
  });

  // ── PATCH: atualizar role ──
  test('PATCH /api/usuarios/:id altera role para FINANCEIRO', async ({ request, adminHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/${createdUserId}`, {
      headers: adminHeaders,
      data: { role: 'FINANCEIRO' },
    });
    expect(res.status()).toBe(200);

    const detail = await request.get(`${BASE}/api/usuarios/${createdUserId}`, {
      headers: adminHeaders,
    });
    const body = await detail.json();
    expect(body.data.role).toBe('FINANCEIRO');

    // rollback
    await request.patch(`${BASE}/api/usuarios/${createdUserId}`, {
      headers: adminHeaders,
      data: { role: 'USUARIO' },
    });
  });

  // ── PUT toggle-status: idempotência ──
  test('PUT toggle-status ciclo completo: ATIVO → INATIVO → ATIVO', async ({
    request,
    adminHeaders,
  }) => {
    // ATIVO → INATIVO
    const r1 = await request.put(`${BASE}/api/usuarios/${createdUserId}/toggle-status`, {
      headers: adminHeaders,
    });
    expect(r1.status()).toBe(200);
    const b1 = await r1.json();
    expect(b1.data.status).toBe('INATIVO');

    // INATIVO → ATIVO
    const r2 = await request.put(`${BASE}/api/usuarios/${createdUserId}/toggle-status`, {
      headers: adminHeaders,
    });
    expect(r2.status()).toBe(200);
    const b2 = await r2.json();
    expect(b2.data.status).toBe('ATIVO');
  });

  // ── DELETE: soft-delete ──
  test('DELETE /api/usuarios/:id soft-deletes (status INATIVO)', async ({
    request,
    adminHeaders,
  }) => {
    const res = await request.delete(`${BASE}/api/usuarios/${createdUserId}`, {
      headers: adminHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const detail = await request.get(`${BASE}/api/usuarios/${createdUserId}`, {
      headers: adminHeaders,
    });
    const user = await detail.json();
    expect(user.data.status).toBe('INATIVO');
  });

  // ── DELETE: idempotente ──
  test('DELETE /api/usuarios/:id idempotente se já inativo', async ({ request, adminHeaders }) => {
    const res = await request.delete(`${BASE}/api/usuarios/${createdUserId}`, {
      headers: adminHeaders,
    });
    expect(res.status()).toBe(200);
  });

  // ── POST: email duplicado → 409 ──
  test('POST /api/usuarios com email existente retorna 409', async ({ request, adminHeaders }) => {
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: { email: 'admin@test.com' },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('EMAIL_TAKEN');
  });
});
