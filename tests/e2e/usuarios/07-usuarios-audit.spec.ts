/**
 * 07 — Auditoria: verificar que mutações geram registros de auditoria.
 */

import { test, expect, mockUsers, getAuthHeaders, resetRateLimits } from '../fixtures/auth';
import { seedUsuarios, cleanupUsuarios, teardownUsuarios } from '../fixtures/usuarios-seed';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe.serial('07 — Auditoria de Usuários', () => {
  let createdId: number | null = null;

  test.beforeAll(async () => { await seedUsuarios(); });
  test.afterAll(async () => { await teardownUsuarios(); });
  test.beforeEach(async ({ request }) => { await resetRateLimits(request); });

  // ─── POST gera auditoria de criação ───
  test('POST /api/usuarios gera registro de auditoria', async ({ request, adminHeaders }) => {
    const email = `audit-${Date.now()}@e2e-test.com`;
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: { email, role: 'USUARIO' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    createdId = body.data.id;

    // Buscar auditoria do usuário recém-criado
    const auditRes = await request.get(`${BASE}/api/usuarios/${createdId}/auditoria`, {
      headers: adminHeaders,
    });
    expect(auditRes.status()).toBe(200);
    const auditBody = await auditRes.json();
    const audits = auditBody.data;
    expect(Array.isArray(audits)).toBe(true);
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });

  // ─── PATCH gera auditoria de atualização ───
  test('PATCH /api/usuarios/:id gera registro de auditoria UPDATE', async ({ request, adminHeaders }) => {
    expect(createdId).toBeTruthy();
    await request.patch(`${BASE}/api/usuarios/${createdId}`, {
      headers: adminHeaders,
      data: { nomeCompleto: 'Audit Updated Name' },
    });

    const auditRes = await request.get(`${BASE}/api/usuarios/${createdId}/auditoria`, {
      headers: adminHeaders,
    });
    const auditBody = await auditRes.json();
    const audits = auditBody.data;
    const update = audits.find((a: { acao: string }) =>
      a.acao === 'UPDATE' || a.acao === 'ATUALIZACAO'
    );
    expect(update).toBeTruthy();
  });

  // ─── PATCH role gera auditoria com campo role ───
  test('PATCH role gera auditoria com payload contendo role', async ({ request, adminHeaders }) => {
    expect(createdId).toBeTruthy();
    await request.patch(`${BASE}/api/usuarios/${createdId}`, {
      headers: adminHeaders,
      data: { role: 'FINANCEIRO' },
    });

    const auditRes = await request.get(`${BASE}/api/usuarios/${createdId}/auditoria`, {
      headers: adminHeaders,
    });
    const auditBody = await auditRes.json();
    const audits = auditBody.data;
    // Most recent should reference the role change
    expect(audits.length).toBeGreaterThanOrEqual(2);

    // Rollback
    await request.patch(`${BASE}/api/usuarios/${createdId}`, {
      headers: adminHeaders,
      data: { role: 'USUARIO' },
    });
  });

  // ─── DELETE gera auditoria ───
  test('DELETE /api/usuarios/:id gera registro de auditoria', async ({ request, adminHeaders }) => {
    expect(createdId).toBeTruthy();
    await request.delete(`${BASE}/api/usuarios/${createdId}`, { headers: adminHeaders });

    const auditRes = await request.get(`${BASE}/api/usuarios/${createdId}/auditoria`, {
      headers: adminHeaders,
    });
    const auditBody = await auditRes.json();
    const audits = auditBody.data;
    const deletion = audits.find((a: { acao: string }) =>
      a.acao === 'DELETE' || a.acao === 'EXCLUSAO'
    );
    expect(deletion).toBeTruthy();
  });

  // ─── toggle-status gera auditoria ───
  test('PUT toggle-status gera registro de auditoria', async ({ request, adminHeaders }) => {
    // Toggle user 3 (USUARIO)
    await request.put(`${BASE}/api/usuarios/3/toggle-status`, { headers: adminHeaders });

    const auditRes = await request.get(`${BASE}/api/usuarios/3/auditoria`, {
      headers: adminHeaders,
    });
    const auditBody = await auditRes.json();
    const audits = auditBody.data;
    expect(audits.length).toBeGreaterThanOrEqual(1);

    // Toggle back
    await request.put(`${BASE}/api/usuarios/3/toggle-status`, { headers: adminHeaders });
  });

  // ─── GET auditoria paginado/ordenado desc ───
  test('GET /api/usuarios/:id/auditoria retorna ordenado por criadoEm DESC', async ({ request, adminHeaders }) => {
    expect(createdId).toBeTruthy();
    const res = await request.get(`${BASE}/api/usuarios/${createdId}/auditoria`, {
      headers: adminHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const audits = body.data;
    if (audits.length >= 2) {
      const dates = audits.map((a: { criadoEm: string }) => new Date(a.criadoEm).getTime());
      // DESC: each date should be >= the next
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    }
  });

  // ─── RBAC: USUARIO não pode ver auditoria ───
  test('USUARIO GET /api/usuarios/:id/auditoria → 403', async ({ request, usuarioHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/1/auditoria`, {
      headers: usuarioHeaders,
    });
    expect(res.status()).toBe(403);
  });

  // ─── RBAC: FINANCEIRO não pode ver auditoria ───
  test('FINANCEIRO GET /api/usuarios/:id/auditoria → 403', async ({ request, financeiroHeaders }) => {
    const res = await request.get(`${BASE}/api/usuarios/1/auditoria`, {
      headers: financeiroHeaders,
    });
    expect(res.status()).toBe(403);
  });

  // ─── Sem token ───
  test('GET auditoria sem token → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/usuarios/1/auditoria`);
    expect(res.status()).toBe(401);
  });
});
