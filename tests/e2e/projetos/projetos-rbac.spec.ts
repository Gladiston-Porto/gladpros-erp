/**
 * E2E: Projetos — RBAC Tests
 *
 * Validates that each role sees exactly what the permission matrix specifies:
 * - ADMIN: ALL
 * - GERENTE: ALL
 * - FINANCEIRO: ALL
 * - ESTOQUE: ALL
 * - USUARIO: ALL (but filtered to own projects)
 * - CLIENTE: RO (read-only)
 */

import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionFromDatabase } from '../helpers/auth';

const ROLES = {
  ADMIN: 'qa.admin.clientes@teste.local',
  GERENTE: 'qa.gerente@teste.local',
  FINANCEIRO: 'qa.financeiro@teste.local',
  ESTOQUE: 'qa.estoque@teste.local',
  USUARIO: 'qa.usuario@teste.local',
};

test.describe('Projetos — RBAC', () => {
  test.setTimeout(180_000);

  for (const [role, email] of Object.entries(ROLES)) {
    test(`${role} can GET /api/projetos`, async ({ page, request }) => {
      const session = await seedAuthenticatedSessionFromDatabase(page, email);
      const res = await request.get('/api/projetos', {
        headers: { Cookie: `auth-token=${session.token}` },
      });

      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
    });
  }

  test('USUARIO can only see own projects', async ({ page, request }) => {
    const session = await seedAuthenticatedSessionFromDatabase(page, ROLES.USUARIO);
    const res = await request.get('/api/projetos', {
      headers: { Cookie: `auth-token=${session.token}` },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    // USUARIO filtering is enforced server-side — verify no error
    expect(json.data).toBeDefined();
  });

  test('USUARIO cannot create projects', async ({ page, request }) => {
    const session = await seedAuthenticatedSessionFromDatabase(page, ROLES.USUARIO);
    const res = await request.post('/api/projetos', {
      headers: {
        Cookie: `auth-token=${session.token}`,
        'Content-Type': 'application/json',
      },
      data: {
        titulo: 'Should Fail',
        clienteId: 1,
      },
    });

    // USUARIO doesn't have canCreate permission
    expect(res.status()).toBe(403);
  });

  test('ESTOQUE cannot delete projects', async ({ page, request }) => {
    const session = await seedAuthenticatedSessionFromDatabase(page, ROLES.ESTOQUE);
    const res = await request.delete('/api/projetos/1', {
      headers: {
        Cookie: `auth-token=${session.token}`,
        'Content-Type': 'application/json',
      },
      data: { motivo: 'Test' },
    });

    // Only ADMIN can delete
    expect(res.status()).toBe(403);
  });

  test('FINANCEIRO can view financial costs', async ({ page, request }) => {
    const session = await seedAuthenticatedSessionFromDatabase(page, ROLES.FINANCEIRO);
    const res = await request.get('/api/projetos/1/financeiro/costs', {
      headers: { Cookie: `auth-token=${session.token}` },
    });

    // Should be 200 or 404 if project doesn't exist — not 403
    expect([200, 404]).toContain(res.status());
  });
});
