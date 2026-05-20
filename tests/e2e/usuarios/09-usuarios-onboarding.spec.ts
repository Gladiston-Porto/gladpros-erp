/**
 * 09 — Onboarding: resend-welcome, magic link, filtro primeiroAcesso
 *
 * Cobre:
 *  - POST /api/usuarios/[id]/resend-welcome (auth, RBAC, estados)
 *  - GET  /api/auth/first-access/magic?token=X (token ausente, inválido)
 *  - GET  /api/usuarios?primeiroAcesso=true (filtro de listagem)
 */

import { test, expect, mockUsers, resetRateLimits } from '../fixtures/auth';
import { seedUsuarios, cleanupUsuarios, teardownUsuarios } from '../fixtures/usuarios-seed';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3007';

test.describe.serial('09 — Onboarding & Primeiro Acesso', () => {
  test.beforeAll(async () => { await seedUsuarios(); });
  test.afterAll(async () => { await teardownUsuarios(); });
  test.beforeEach(async ({ request }) => { await resetRateLimits(request); });

  // ─── POST /api/usuarios/[id]/resend-welcome ───
  test.describe('Reenvio de email de boas-vindas', () => {
    test('sem autenticação → 401', async ({ request }) => {
      const res = await request.post(`${BASE}/api/usuarios/1/resend-welcome`);
      expect(res.status()).toBe(401);
    });

    test('GERENTE → 403 (módulo usuários é ADMIN-only)', async ({ request, gerenteHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/1/resend-welcome`, {
        headers: gerenteHeaders,
      });
      expect(res.status()).toBe(403);
    });

    test('USUARIO → 403', async ({ request, usuarioHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/1/resend-welcome`, {
        headers: usuarioHeaders,
      });
      expect(res.status()).toBe(403);
    });

    test('ADMIN: ID inexistente → 404', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/999999/resend-welcome`, {
        headers: adminHeaders,
      });
      expect(res.status()).toBe(404);
    });

    test('ADMIN: usuário já configurou acesso → 409', async ({ request, adminHeaders }) => {
      // ID 1 = ADMIN seed — primeiroAcesso = false (já configurado)
      const res = await request.post(`${BASE}/api/usuarios/1/resend-welcome`, {
        headers: adminHeaders,
      });
      // 409 Conflict (já configurou) ou 400 (inativo) — depends on seed state
      expect([400, 409]).toContain(res.status());
    });

    test('ADMIN: ID inválido (string) → 400 ou 404', async ({ request, adminHeaders }) => {
      const res = await request.post(`${BASE}/api/usuarios/abc/resend-welcome`, {
        headers: adminHeaders,
      });
      expect([400, 404]).toContain(res.status());
    });
  });

  // ─── GET /api/auth/first-access/magic ───
  test.describe('Magic Link de primeiro acesso', () => {
    test('token ausente → redirect para /login com erro', async ({ request }) => {
      const res = await request.get(`${BASE}/api/auth/first-access/magic`, {
        maxRedirects: 0,
      });
      // Deve redirecionar (302/307) ou retornar 400
      expect([302, 307, 400]).toContain(res.status());
      if ([302, 307].includes(res.status())) {
        const location = res.headers()['location'] ?? '';
        expect(location).toContain('login');
      }
    });

    test('token inválido (string aleatória) → redirect com erro', async ({ request }) => {
      const res = await request.get(`${BASE}/api/auth/first-access/magic?token=invalid.token.here`, {
        maxRedirects: 0,
      });
      expect([302, 307, 400, 401]).toContain(res.status());
      if ([302, 307].includes(res.status())) {
        const location = res.headers()['location'] ?? '';
        expect(location).toContain('login');
      }
    });

    test('token JWT genérico (não magic-link) → redirect com erro', async ({ request }) => {
      // JWT normal (audience errado) não deve funcionar como magic link
      const { signAuthJWT } = await import('../../../src/shared/lib/jwt');
      const fakeToken = await signAuthJWT({
        id: 1,
        email: 'admin@test.com',
        role: 'ADMIN',
        empresaId: 1,
        ativo: true,
        tokenVersion: 1,
      });
      const res = await request.get(`${BASE}/api/auth/first-access/magic?token=${fakeToken}`, {
        maxRedirects: 0,
      });
      expect([302, 307, 400, 401]).toContain(res.status());
    });
  });

  // ─── GET /api/usuarios?primeiroAcesso=true ───
  test.describe('Filtro primeiroAcesso na listagem', () => {
    test('ADMIN: ?primeiroAcesso=true → retorna apenas usuários aguardando', async ({ request, adminHeaders }) => {
      const res = await request.get(`${BASE}/api/usuarios?primeiroAcesso=true&pageSize=50`, {
        headers: adminHeaders,
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      // Todos os retornados devem ter primeiroAcesso = true
      for (const user of body.data) {
        expect(Boolean(user.primeiroAcesso)).toBe(true);
      }
    });

    test('ADMIN: ?primeiroAcesso=false → retorna apenas usuários que já configuraram', async ({ request, adminHeaders }) => {
      const res = await request.get(`${BASE}/api/usuarios?primeiroAcesso=false&pageSize=50`, {
        headers: adminHeaders,
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      for (const user of body.data) {
        expect(Boolean(user.primeiroAcesso)).toBe(false);
      }
    });

    test('ADMIN: sem filtro primeiroAcesso → retorna todos', async ({ request, adminHeaders }) => {
      const [withFilter, withoutFilter] = await Promise.all([
        request.get(`${BASE}/api/usuarios?primeiroAcesso=true`, { headers: adminHeaders }),
        request.get(`${BASE}/api/usuarios`, { headers: adminHeaders }),
      ]);
      expect(withFilter.status()).toBe(200);
      expect(withoutFilter.status()).toBe(200);
      const filteredBody = await withFilter.json();
      const allBody = await withoutFilter.json();
      // Total sem filtro >= total com filtro
      expect(allBody.pagination.total).toBeGreaterThanOrEqual(filteredBody.pagination.total);
    });

    test('ADMIN: filtro inválido → 400', async ({ request, adminHeaders }) => {
      const res = await request.get(`${BASE}/api/usuarios?primeiroAcesso=maybe`, {
        headers: adminHeaders,
      });
      expect(res.status()).toBe(400);
    });

    test('USUARIO → 403 (sem acesso ao módulo usuários)', async ({ request, usuarioHeaders }) => {
      const res = await request.get(`${BASE}/api/usuarios?primeiroAcesso=true`, {
        headers: usuarioHeaders,
      });
      expect(res.status()).toBe(403);
    });
  });
});
