/**
 * 05 — Sessões: listar e revogar sessões ativas.
 */

import { test, expect, mockUsers, getAuthHeaders } from '../fixtures/auth';
import { seedUsuarios, teardownUsuarios } from '../fixtures/usuarios-seed';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe.serial('05 — Sessões de Usuário', () => {
  test.beforeAll(async () => { await seedUsuarios(); });
  test.afterAll(async () => { await teardownUsuarios(); });

  // ─── GET own sessions ───
  test('ADMIN GET /api/usuarios/1/sessions → 200 com array', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/1/sessions`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.sessions).toBeDefined();
    expect(Array.isArray(body.sessions)).toBe(true);
  });

  // ─── ADMIN vê sessões de outro ───
  test('ADMIN GET sessões de outro user → 200', async ({ request, adminHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/3/sessions`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
  });

  // ─── USUARIO vê próprias sessões ───
  test('USUARIO GET próprias sessões → 200', async ({ request, usuarioHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/3/sessions`, { headers: usuarioHeaders });
    expect(res.status()).toBe(200);
  });

  // ─── USUARIO tenta ver sessões de outro → 403 ───
  test('USUARIO GET sessões de outro → 403', async ({ request, usuarioHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/1/sessions`, { headers: usuarioHeaders });
    expect(res.status()).toBe(403);
  });

  // ─── FINANCEIRO tenta ver sessões de outro → 403 ───
  test('FINANCEIRO GET sessões de outro → 403', async ({ request, financeiroHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/1/sessions`, { headers: financeiroHeaders });
    expect(res.status()).toBe(403);
  });

  // ─── DELETE all sessions (own) ───
  test('USUARIO DELETE próprias sessões → 200', async ({ request, usuarioHeaders }) => {
    const res = await request.delete(`${BASE}/api/usuarios/3/sessions`, { headers: usuarioHeaders });
    expect(res.status()).toBe(200);
  });

  // ─── ADMIN DELETE sessões de outro ───
  test('ADMIN DELETE sessões de outro → 200', async ({ request, adminHeaders }) => {
    const res = await request.delete(`${BASE}/api/usuarios/3/sessions`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
  });

  // ─── USUARIO tenta DELETE sessões de outro → 403 ───
  test('USUARIO DELETE sessões de outro → 403', async ({ request, usuarioHeaders }) => {
    const res = await request.delete(`${BASE}/api/usuarios/1/sessions`, { headers: usuarioHeaders });
    expect(res.status()).toBe(403);
  });

  // ─── DELETE session específica: ADMIN only ───
  test('ADMIN DELETE /api/usuarios/sessions/99999 → 200 (idempotente ou not found)', async ({ request, adminHeaders }) => {
    const res = await request.delete(`${BASE}/api/usuarios/sessions/99999`, { headers: adminHeaders });
    expect([200, 404]).toContain(res.status());
  });

  test('USUARIO DELETE sessão específica → 403', async ({ request, usuarioHeaders }) => {
    const res = await request.delete(`${BASE}/api/usuarios/sessions/1`, { headers: usuarioHeaders });
    expect(res.status()).toBe(403);
  });

  // ─── Sem token ───
  test('GET /sessions sem token → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/usuarios/1/sessions`);
    expect(res.status()).toBe(401);
  });

  test('DELETE /sessions sem token → 401', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/usuarios/1/sessions`);
    expect(res.status()).toBe(401);
  });

  test('DELETE sessão específica sem token → 401', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/usuarios/sessions/1`);
    expect(res.status()).toBe(401);
  });
});
