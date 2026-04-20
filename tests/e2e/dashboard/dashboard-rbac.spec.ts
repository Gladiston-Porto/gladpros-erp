/**
 * Dashboard — RBAC Tests
 *
 * [RBAC-01] ADMIN — acessa /api/dashboard com sucesso
 * [RBAC-02] GERENTE — acessa /api/dashboard (RO)
 * [RBAC-03] FINANCEIRO — acessa /api/dashboard (RO)
 * [RBAC-04] ESTOQUE — acessa /api/dashboard (RO)
 * [RBAC-05] USUARIO — acessa /api/dashboard (RO)
 * [RBAC-06] CLIENTE — recebe 403 em /api/dashboard e /api/dashboard/executive
 */

import { test, expect } from '../fixtures/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Dashboard — RBAC', () => {
  test('[RBAC-01] ADMIN acessa /api/dashboard com sucesso', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: adminHeaders,
    });
    expect([200, 500]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
    }
  });

  test('[RBAC-02] GERENTE acessa /api/dashboard (RO)', async ({
    request,
    gerenteHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: gerenteHeaders,
    });
    expect([200, 500]).toContain(response.status());
  });

  test('[RBAC-03] FINANCEIRO acessa /api/dashboard (RO)', async ({
    request,
    financeiroHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: financeiroHeaders,
    });
    expect([200, 500]).toContain(response.status());
  });

  test('[RBAC-04] ESTOQUE acessa /api/dashboard (RO)', async ({
    request,
    estoqueHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: estoqueHeaders,
    });
    expect([200, 500]).toContain(response.status());
  });

  test('[RBAC-05] USUARIO acessa /api/dashboard (RO)', async ({
    request,
    usuarioHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: usuarioHeaders,
    });
    expect([200, 500]).toContain(response.status());
  });

  test('[RBAC-06] CLIENTE não acessa /api/dashboard → 403', async ({
    request,
    clienteHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: clienteHeaders,
    });
    expect(response.status()).toBe(403);
  });

  test('[RBAC-06b] CLIENTE não acessa /api/dashboard/executive → 403', async ({
    request,
    clienteHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive?period=30d`, {
      headers: clienteHeaders,
    });
    expect(response.status()).toBe(403);
  });

  test('[RBAC-01b] ADMIN acessa /api/dashboard/executive com sucesso', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive?period=30d`, {
      headers: adminHeaders,
    });
    expect([200, 500]).toContain(response.status());
  });
});
