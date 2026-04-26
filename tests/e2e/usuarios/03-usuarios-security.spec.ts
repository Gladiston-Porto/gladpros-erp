/**
 * 03 — Segurança expandida: escalação, self-edit, dead-man, email duplicado, strict mode.
 *
 * Superset da spec em api/usuarios-security.spec.ts (hotfix). Inclui cenários
 * adicionais que dependem de seed (BD populado).
 */

import { test, expect, mockUsers, getAuthHeaders } from '../fixtures/auth';
import { seedUsuarios, cleanupUsuarios, teardownUsuarios } from '../fixtures/usuarios-seed';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe.serial('03 — Segurança Expandida', () => {
  test.beforeAll(async () => { await seedUsuarios(); });
  test.afterAll(async () => { await cleanupUsuarios(); });

  // ── Escalação de privilégio ──
  test('USUARIO PATCH próprio role=ADMIN → role permanece USUARIO', async ({ request, usuarioHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/3`, {
      headers: usuarioHeaders,
      data: { role: 'ADMIN' },
    });
    expect([200, 403]).toContain(res.status());

    const detail = await request.get(`${BASE}/api/usuarios/3`, { headers: usuarioHeaders });
    const body = await detail.json();
    expect(body.role).toBe('USUARIO');
  });

  test('USUARIO PATCH próprio status=INATIVO → status permanece ATIVO', async ({ request, usuarioHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/3`, {
      headers: usuarioHeaders,
      data: { status: 'INATIVO' },
    });
    expect([200, 403]).toContain(res.status());

    const detail = await request.get(`${BASE}/api/usuarios/3`, { headers: usuarioHeaders });
    const body = await detail.json();
    expect(body.status).toBe('ATIVO');
  });

  // ── Self-edit permitido ──
  test('USUARIO PATCH próprio nomeCompleto → 200 (self-edit)', async ({ request, usuarioHeaders }) => {
    const newName = 'Meu Novo Nome Editado';
    const res = await request.patch(`${BASE}/api/usuarios/3`, {
      headers: usuarioHeaders,
      data: { nomeCompleto: newName },
    });
    expect(res.status()).toBe(200);

    // GET /[id] não usa cache (cache é só no GET list) — deve refletir imediatamente
    const detail = await request.get(`${BASE}/api/usuarios/3`, { headers: usuarioHeaders });
    const body = await detail.json();
    expect(body.nomeCompleto).toBe(newName);

    // Rollback
    const ah = await getAuthHeaders(mockUsers.admin);
    await request.patch(`${BASE}/api/usuarios/3`, { headers: ah, data: { nomeCompleto: 'Usuario Test' } });
  });

  // ── USUARIO tenta PATCH de outro id → 403 ──
  test('USUARIO PATCH outro user id=1 → 403', async ({ request, usuarioHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/1`, {
      headers: usuarioHeaders,
      data: { nomeCompleto: 'Hacked' },
    });
    expect(res.status()).toBe(403);
  });

  test('USUARIO PATCH outro user id=2 → 403', async ({ request, usuarioHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/2`, {
      headers: usuarioHeaders,
      data: { nomeCompleto: 'Hacked' },
    });
    expect(res.status()).toBe(403);
  });

  // ── Anônimo ──
  test('Anônimo DELETE /sessions → 401', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/usuarios/1/sessions`);
    expect(res.status()).toBe(401);
  });

  test('Anônimo GET /reports/users → redirect /login', async ({ request }) => {
    const res = await request.get(`${BASE}/reports/users`, { maxRedirects: 0 });
    expect([200, 302, 307, 308]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.text();
      expect(body).toMatch(/NEXT_REDIRECT[^"]*\/login|url=\/login/);
    }
  });

  // ── Hierarquia: GERENTE ──
  test('GERENTE PATCH ADMIN → 403', async ({ request, gerenteHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/1`, {
      headers: gerenteHeaders,
      data: { nomeCompleto: 'Nope' },
    });
    expect(res.status()).toBe(403);
  });

  test('GERENTE toggle-status ADMIN → 403', async ({ request, gerenteHeaders }) => {
    const res = await request.put(`${BASE}/api/usuarios/1/toggle-status`, { headers: gerenteHeaders });
    expect(res.status()).toBe(403);
  });

  test('GERENTE DELETE ADMIN → 403', async ({ request, gerenteHeaders }) => {
    const res = await request.delete(`${BASE}/api/usuarios/1`, { headers: gerenteHeaders });
    expect(res.status()).toBe(403);
  });

  test('GERENTE PATCH role=ADMIN em USUARIO → 403', async ({ request, gerenteHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/3`, {
      headers: gerenteHeaders,
      data: { role: 'ADMIN' },
    });
    expect(res.status()).toBe(403);
  });

  // ── Dead-man ADMIN ──
  test('Desativar último ADMIN ativo → 400 LAST_ADMIN', async ({ request, adminHeaders }) => {
    // Desativar admin2 (id=7) primeiro para que admin (id=1) seja o último
    await request.patch(`${BASE}/api/usuarios/7/status`, {
      headers: adminHeaders,
      data: { ativo: false },
    });

    // Agora tentar desativar admin (id=1) → deve falhar
    const res = await request.patch(`${BASE}/api/usuarios/1/status`, {
      headers: adminHeaders,
      data: { ativo: false },
    });
    expect(res.status()).toBe(400);

    // Reativar admin2
    await request.patch(`${BASE}/api/usuarios/7/status`, {
      headers: adminHeaders,
      data: { ativo: true },
    });
  });

  test('Auto-toggle bloqueado (ADMIN desativando a si mesmo → 400)', async ({ request, adminHeaders }) => {
    const res = await request.put(`${BASE}/api/usuarios/1/toggle-status`, { headers: adminHeaders });
    expect(res.status()).toBe(400);
  });

  test('Auto-delete bloqueado (ADMIN deletando a si mesmo → 400)', async ({ request, adminHeaders }) => {
    const res = await request.delete(`${BASE}/api/usuarios/1`, { headers: adminHeaders });
    expect(res.status()).toBe(400);
  });

  // ── Email duplicado ──
  test('POST com email já existente → 409 EMAIL_TAKEN', async ({ request, adminHeaders }) => {
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: { email: 'admin@test.com' },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('EMAIL_TAKEN');
  });

  // ── Strict mode (campo desconhecido) ──
  test('POST com campo nivel → 400 (strict)', async ({ request, adminHeaders }) => {
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: { email: `strict-${Date.now()}@e2e-test.com`, nivel: 'ADMIN' },
    });
    expect(res.status()).toBe(400);
  });

  // ── Payload sem email no create ──
  test('POST sem email → 400 VALIDATION_ERROR', async ({ request, adminHeaders }) => {
    const res = await request.post(`${BASE}/api/usuarios`, {
      headers: adminHeaders,
      data: { nomeCompleto: 'Missing Email' },
    });
    expect(res.status()).toBe(400);
  });

  // ── ADMIN atualiza role via campo `role` ──
  test('ADMIN PATCH campo role (não nivel) persiste', async ({ request, adminHeaders }) => {
    const res = await request.patch(`${BASE}/api/usuarios/3`, {
      headers: adminHeaders,
      data: { role: 'FINANCEIRO' },
    });
    expect(res.status()).toBe(200);

    const detail = await request.get(`${BASE}/api/usuarios/3`, { headers: adminHeaders });
    const body = await detail.json();
    expect(body.role).toBe('FINANCEIRO');

    // Rollback
    await request.patch(`${BASE}/api/usuarios/3`, {
      headers: adminHeaders,
      data: { role: 'USUARIO' },
    });
  });
});
