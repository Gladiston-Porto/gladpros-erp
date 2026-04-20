/**
 * Dashboard — Security Tests
 *
 * [SEC-01] GET /api/dashboard sem cookie → 401
 * [SEC-02] GET /api/dashboard/executive sem cookie → 401
 * [SEC-03] Response nunca contém campos sensíveis
 * [SEC-04] Token inválido → 401
 * [SEC-05] empresaId não aceito via query param para bypass
 */

import { test, expect } from '../fixtures/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const SENSITIVE_FIELDS = ['senha', 'password', 'hash', 'pin', 'secret', 'privateKey', 'salt'];

test.describe('Dashboard — Segurança', () => {
  test('[SEC-01] GET /api/dashboard sem cookie → 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard`);
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  test('[SEC-02] GET /api/dashboard/executive sem cookie → 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive`);
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('[SEC-03] Response do /api/dashboard não expõe campos sensíveis', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: adminHeaders,
    });

    if (response.status() === 200) {
      const text = await response.text();
      const lowerText = text.toLowerCase();

      for (const field of SENSITIVE_FIELDS) {
        expect(lowerText).not.toContain(`"${field}":`);
      }
    }
  });

  test('[SEC-03b] Response do /api/dashboard/executive não expõe campos sensíveis', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive?period=30d`, {
      headers: adminHeaders,
    });

    if (response.status() === 200) {
      const text = await response.text();
      const lowerText = text.toLowerCase();

      for (const field of SENSITIVE_FIELDS) {
        expect(lowerText).not.toContain(`"${field}":`);
      }
    }
  });

  test('[SEC-04] Token inválido → 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard`, {
      headers: {
        Cookie: 'authToken=invalid-token-xyz',
        Authorization: 'Bearer invalid-token-xyz',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('[SEC-05] empresaId via query não bypassa auth', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/dashboard?period=30d&empresaId=1`
    );
    // Sem autenticação, deve retornar 401 independente do empresaId na query
    expect(response.status()).toBe(401);
  });

  test('[SEC-01c] Resposta de erro tem { success: false }', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard`);
    const body = await response.json();
    expect(body).toHaveProperty('success', false);
  });
});
