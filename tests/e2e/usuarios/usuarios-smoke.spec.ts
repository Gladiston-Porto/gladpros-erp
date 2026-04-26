/**
 * usuarios-smoke.spec.ts
 *
 * Testes de fumaça (smoke) do módulo Usuários.
 * Valida que endpoints essenciais estão vivos, que auth funciona e que
 * redirecionamentos de proteção de rota operam corretamente.
 * Cada teste deve ser rápido e independente.
 */

import { test, expect, mockUsers, getAuthHeaders } from '../fixtures/auth';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe('Smoke — Módulo Usuários', () => {
  // ── Autenticação: rotas protegidas retornam 401 sem token ──

  test('GET /api/usuarios sem auth → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/usuarios`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/usuarios/:id sem auth → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/usuarios/1`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/usuarios sem auth → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/usuarios`, {
      data: { email: 'smoke@test.com', nomeCompleto: 'Smoke', role: 'USUARIO' },
    });
    expect(res.status()).toBe(401);
  });

  test('PATCH /api/usuarios/:id sem auth → 401', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/usuarios/1`, {
      data: { nomeCompleto: 'Hack' },
    });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/usuarios/:id sem auth → 401', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/usuarios/1`);
    expect(res.status()).toBe(401);
  });

  test('PUT /api/usuarios/:id/toggle-status sem auth → 401', async ({ request }) => {
    const res = await request.put(`${BASE}/api/usuarios/2/toggle-status`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/usuarios/:id/auditoria sem auth → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/usuarios/1/auditoria`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/usuarios/export/csv sem auth → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/usuarios/export/csv`, {
      data: { filters: {} },
    });
    expect(res.status()).toBe(401);
  });

  // ── API responde com token válido ──

  test('GET /api/usuarios com ADMIN → 200 e shape mínima', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.items)).toBe(true);
  });

  test('GET /api/usuarios?pageSize=1 com ADMIN → 200 e 1 item', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios?pageSize=1`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBeLessThanOrEqual(1);
  });

  // ── Content-Type ──

  test('GET /api/usuarios retorna application/json', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios`, { headers: adminHeaders });
    expect(res.headers()['content-type']).toContain('application/json');
  });

  // ── Campos sensíveis nunca expostos na listagem ──

  test('GET /api/usuarios não expõe senhaHash', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios`, { headers: adminHeaders });
    const body = await res.json();
    for (const user of body.items) {
      expect(user).not.toHaveProperty('senhaHash');
      expect(user).not.toHaveProperty('senha');
    }
  });

  // ── RBAC básico: CLIENTE não acessa ──

  test('GET /api/usuarios com CLIENTE → 403', async ({ request }) => {
    const headers = await getAuthHeaders(mockUsers.cliente);
    const res = await request.get(`${BASE}/api/usuarios`, { headers });
    expect(res.status()).toBe(403);
  });
});
