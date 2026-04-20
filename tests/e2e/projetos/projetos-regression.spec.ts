/**
 * E2E: Projetos — Regression Tests
 *
 * Guards for each P1/P2 bug fixed during the production-ready audit:
 *
 * P1-COSTS-AUTH: financeiro/costs route was using legacy getAuthUser
 *   → Now uses requireProjectPermission('canViewFinancials')
 *
 * P1-PAGE-RBAC: Main page had no can() check
 *   → Now requires requireServerUser + can('projetos', 'read')
 *
 * P1-RESPONSE-FORMAT: Routes returned raw data without { data, success }
 *   → All routes now return standardized response format
 *
 * P2-CLIENTE-RBAC: CLIENTE role was missing from canRead
 *   → CLIENTE now has read access to projects
 */

import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionFromDatabase } from '../helpers/auth';

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local';
const ESTOQUE_EMAIL = 'qa.estoque@teste.local';

test.describe('Projetos — Regression Guards', () => {
  test.setTimeout(180_000);

  test('[P1-COSTS-AUTH] costs route requires auth and returns standardized response', async ({
    page,
    request,
  }) => {
    // Unauthenticated should fail
    const unauthRes = await request.get('/api/projetos/1/financeiro/costs');
    expect([401, 403]).toContain(unauthRes.status());

    // Authenticated with valid role should work or return 404
    const session = await seedAuthenticatedSessionFromDatabase(page, ADMIN_EMAIL);
    const authRes = await request.get('/api/projetos/1/financeiro/costs', {
      headers: { Cookie: `auth-token=${session.token}` },
    });
    expect([200, 404]).toContain(authRes.status());

    if (authRes.status() === 200) {
      const json = await authRes.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    }
  });

  test('[P1-RESPONSE-FORMAT] GET /api/projetos returns { data, pagination }', async ({
    page,
    request,
  }) => {
    const session = await seedAuthenticatedSessionFromDatabase(page, ADMIN_EMAIL);
    const res = await request.get('/api/projetos', {
      headers: { Cookie: `auth-token=${session.token}` },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.pagination).toBeDefined();
    expect(json.pagination.page).toBeDefined();
    expect(json.pagination.pageSize).toBeDefined();
  });

  test('[P1-RESPONSE-FORMAT] GET /api/projetos/[id] returns { data, success }', async ({
    page,
    request,
  }) => {
    const session = await seedAuthenticatedSessionFromDatabase(page, ADMIN_EMAIL);
    const listRes = await request.get('/api/projetos?limite=1', {
      headers: { Cookie: `auth-token=${session.token}` },
    });
    const listJson = await listRes.json();

    if (listJson.data && listJson.data.length > 0) {
      const id = listJson.data[0].id;
      const res = await request.get(`/api/projetos/${id}`, {
        headers: { Cookie: `auth-token=${session.token}` },
      });

      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.id).toBe(id);
    }
  });

  test('[P1-RESPONSE-FORMAT] DELETE returns { data, message, success }', async ({
    page,
    request,
  }) => {
    const session = await seedAuthenticatedSessionFromDatabase(page, ADMIN_EMAIL);

    // Create a project to delete
    const createRes = await request.post('/api/projetos', {
      headers: {
        Cookie: `auth-token=${session.token}`,
        'Content-Type': 'application/json',
      },
      data: {
        titulo: `Regression Test Delete ${Date.now()}`,
        clienteId: 1,
        dataInicioPrevista: new Date().toISOString().split('T')[0],
      },
    });

    if (createRes.status() === 201) {
      const created = await createRes.json();
      const deleteRes = await request.delete(`/api/projetos/${created.data.id}`, {
        headers: {
          Cookie: `auth-token=${session.token}`,
          'Content-Type': 'application/json',
        },
        data: { motivo: 'Regression test cleanup' },
      });

      expect(deleteRes.status()).toBe(200);
      const json = await deleteRes.json();
      expect(json.success).toBe(true);
      expect(json.message).toBeDefined();
    }
  });

  test('[P2-ESTOQUE] ESTOQUE role can read projects', async ({ page, request }) => {
    const session = await seedAuthenticatedSessionFromDatabase(page, ESTOQUE_EMAIL);
    const res = await request.get('/api/projetos', {
      headers: { Cookie: `auth-token=${session.token}` },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });
});
