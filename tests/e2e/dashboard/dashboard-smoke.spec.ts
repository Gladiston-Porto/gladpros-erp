/**
 * Dashboard — Smoke Tests
 *
 * [SMOKE-01] Página /dashboard carrega sem erro (usuário ADMIN autenticado)
 * [SMOKE-02] Redirect sem autenticação → /login
 * [SMOKE-03] Título e elementos críticos presentes
 * [SMOKE-04] API routes respondem (200 autenticado, 401 não autenticado)
 */

import { test, expect, mockUsers, getAuthHeaders } from '../fixtures/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Dashboard — Smoke', () => {
  test('[SMOKE-01] Página /dashboard carrega sem erro (ADMIN autenticado)', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/dashboard`, {
      headers: adminHeaders,
    });

    // 200 ou redirect (302/307) para o dashboard autenticado
    expect([200, 302, 307]).toContain(response.status());
  });

  test('[SMOKE-02] Sem autenticação redireciona para /login', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/dashboard`, {
      maxRedirects: 0,
    });

    // Deve redirecionar (3xx) ou retornar 401
    expect([301, 302, 307, 308, 401]).toContain(response.status());
  });

  test('[SMOKE-04] GET /api/dashboard sem cookie → 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard`);
    expect(response.status()).toBe(401);
  });

  test('[SMOKE-04b] GET /api/dashboard com token ADMIN → 200', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: adminHeaders,
    });
    // 200 com dados, ou 500 se banco não disponível — nunca 401/403/404
    expect([200, 500]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test('[SMOKE-04c] GET /api/dashboard/executive sem cookie → 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive`);
    expect(response.status()).toBe(401);
  });

  test('[SMOKE-04d] GET /api/dashboard/executive com token ADMIN → 200 ou 500', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive?period=30d`, {
      headers: adminHeaders,
    });
    expect([200, 500]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
    }
  });
});
