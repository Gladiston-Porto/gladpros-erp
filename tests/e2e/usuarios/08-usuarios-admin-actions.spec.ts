/**
 * 08 — Ações administrativas: security info, self-edit, status toggle edge cases.
 *
 * Nota: endpoints de unlock/reset-password/reset-MFA ainda não existem como rotas
 * dedicadas. Testa o que está disponível: GET /security, self-edit whitelist,
 * PATCH /status com body explícito, dead-man edge cases.
 */

import { test, expect, mockUsers, getAuthHeaders, resetRateLimits } from '../fixtures/auth';
import { seedUsuarios, cleanupUsuarios, teardownUsuarios } from '../fixtures/usuarios-seed';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe('08 — Ações Admin & Edge Cases', () => {
  test.beforeAll(async () => {
    await seedUsuarios();
  });
  test.afterAll(async () => {
    await teardownUsuarios();
  });
  test.beforeEach(async ({ request }) => {
    await resetRateLimits(request);
  });

  // ─── GET /security ───
  test.describe('Security Info', () => {
    test('ADMIN GET /api/usuarios/1/security → 200 com dados de bloqueio', async ({
      request,
      adminHeaders,
    }) => {
      const res = await request.get(`${BASE}/api/usuarios/1/security`, { headers: adminHeaders });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(typeof body.data.blocked).toBe('boolean');
      expect(body.data.id).toBe(1);
    });

    test('USUARIO GET próprio /security → 200', async ({ request, usuarioHeaders }) => {
      const res = await request.get(`${BASE}/api/usuarios/3/security`, { headers: usuarioHeaders });
      expect(res.status()).toBe(200);
    });

    test('USUARIO GET /security de outro → 403', async ({ request, usuarioHeaders }) => {
      const res = await request.get(`${BASE}/api/usuarios/1/security`, { headers: usuarioHeaders });
      expect(res.status()).toBe(403);
    });

    test('GET /security user inexistente → 404', async ({ request, adminHeaders }) => {
      const res = await request.get(`${BASE}/api/usuarios/999999/security`, {
        headers: adminHeaders,
      });
      expect(res.status()).toBe(404);
    });

    test('GET /security sem token → 401', async ({ request }) => {
      const res = await request.get(`${BASE}/api/usuarios/1/security`);
      expect(res.status()).toBe(401);
    });
  });

  // ─── Self-edit whitelist ───
  test.describe('Self-edit', () => {
    test('USUARIO edita próprio nomeCompleto → 200', async ({ request, usuarioHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: usuarioHeaders,
        data: { nomeCompleto: 'Self Updated Name' },
      });
      expect(res.status()).toBe(200);

      // Verify change
      const detail = await request.get(`${BASE}/api/usuarios/3`, { headers: usuarioHeaders });
      const body = await detail.json();
      expect(body.data.nomeCompleto).toBe('Self Updated Name');

      // Rollback
      const ah = await getAuthHeaders(mockUsers.admin);
      await request.patch(`${BASE}/api/usuarios/3`, {
        headers: ah,
        data: { nomeCompleto: 'Usuario Test' },
      });
    });

    test('USUARIO edita próprio telefone → 200', async ({ request, usuarioHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: usuarioHeaders,
        data: { telefone: '9725551234' },
      });
      expect(res.status()).toBe(200);
    });

    test('USUARIO edita próprio endereço → 200', async ({ request, usuarioHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: usuarioHeaders,
        data: { cidade: 'Plano', estado: 'TX' },
      });
      expect(res.status()).toBe(200);
    });

    test('USUARIO tenta mudar próprio role → silenciosamente ignorado (200 sem mudança)', async ({
      request,
      usuarioHeaders,
    }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: usuarioHeaders,
        data: { role: 'ADMIN', nomeCompleto: 'Teste Self Role' },
      });
      // Self-edit strips role field → processes only nomeCompleto → 200
      expect([200, 403]).toContain(res.status());

      // Confirm role unchanged
      const detail = await request.get(`${BASE}/api/usuarios/3`, { headers: usuarioHeaders });
      const body = await detail.json();
      expect(body.data.role).toBe('USUARIO');
    });

    test('USUARIO tenta mudar próprio status → silenciosamente ignorado', async ({
      request,
      usuarioHeaders,
    }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3`, {
        headers: usuarioHeaders,
        data: { status: 'INATIVO' },
      });
      expect([200, 403]).toContain(res.status());

      const detail = await request.get(`${BASE}/api/usuarios/3`, { headers: usuarioHeaders });
      const body = await detail.json();
      expect(body.data.status).toBe('ATIVO');
    });
  });

  // ─── PATCH /status (explicit) ───
  test.describe('PATCH /status (explicit toggle)', () => {
    test('ADMIN PATCH /status {ativo:false} → desativa user 3', async ({
      request,
      adminHeaders,
    }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3/status`, {
        headers: adminHeaders,
        data: { ativo: false },
      });
      expect(res.status()).toBe(200);

      // Reactivate
      await request.patch(`${BASE}/api/usuarios/3/status`, {
        headers: adminHeaders,
        data: { ativo: true },
      });
    });

    test('PATCH /status com body inválido → 400', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3/status`, {
        headers: adminHeaders,
        data: { ativo: 'yes' },
      });
      expect(res.status()).toBe(400);
    });

    test('PATCH /status sem body → 400', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3/status`, {
        headers: adminHeaders,
        data: {},
      });
      expect(res.status()).toBe(400);
    });

    test('PATCH /status com campo extra (strict) → 400', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/3/status`, {
        headers: adminHeaders,
        data: { ativo: true, force: true },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ─── Dead-man ADMIN (edge cases) ───
  test.describe('Dead-man ADMIN', () => {
    test('ADMIN não pode desativar a si mesmo via PATCH /status', async ({
      request,
      adminHeaders,
    }) => {
      const res = await request.patch(`${BASE}/api/usuarios/1/status`, {
        headers: adminHeaders,
        data: { ativo: false },
      });
      expect(res.status()).toBe(400);
    });

    test('ADMIN não pode se auto-deletar', async ({ request, adminHeaders }) => {
      const res = await request.delete(`${BASE}/api/usuarios/1`, { headers: adminHeaders });
      expect(res.status()).toBe(400);
    });

    test('ADMIN não pode rebaixar a si mesmo via PATCH', async ({ request, adminHeaders }) => {
      const res = await request.patch(`${BASE}/api/usuarios/1`, {
        headers: adminHeaders,
        data: { role: 'USUARIO' },
      });
      // Self-edit strips role field → no change, 200 with NO_CHANGES
      // Or if not self-edit path, dead-man check blocks it
      expect([200, 400]).toContain(res.status());

      // Confirm still ADMIN
      const detail = await request.get(`${BASE}/api/usuarios/1`, { headers: adminHeaders });
      const body = await detail.json();
      expect(body.data.role).toBe('ADMIN');
    });
  });

  // ─── Sem autenticação ───
  test('Todas as ações sem token → 401', async ({ request }) => {
    const endpoints = [
      { method: 'get', url: `${BASE}/api/usuarios/1/security` },
      { method: 'patch', url: `${BASE}/api/usuarios/1/status` },
      { method: 'put', url: `${BASE}/api/usuarios/1/toggle-status` },
      { method: 'delete', url: `${BASE}/api/usuarios/1` },
      { method: 'patch', url: `${BASE}/api/usuarios/1` },
    ];

    for (const ep of endpoints) {
      const res =
        ep.method === 'get'
          ? await request.get(ep.url)
          : ep.method === 'delete'
            ? await request.delete(ep.url)
            : ep.method === 'put'
              ? await request.put(ep.url)
              : await request.patch(ep.url);
      expect(res.status(), `${ep.method.toUpperCase()} ${ep.url}`).toBe(401);
    }
  });
});
