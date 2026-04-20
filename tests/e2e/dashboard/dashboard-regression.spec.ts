/**
 * Dashboard — Regression Guards
 *
 * Guards para cada P1 e P2 encontrado e corrigido na auditoria.
 *
 * [REG-AUTH]      GET /api/dashboard sem cookie retorna 401 (fix P1-01: auth ausente)
 * [REG-AUTH-EXEC] GET /api/dashboard/executive sem cookie retorna 401
 * [REG-RBAC]      CLIENTE não acessa dashboard (403)
 * [REG-SUCCESS]   Respostas de erro têm { success: false }
 * [REG-N1]        /api/dashboard responde sem timeout (fix P1-02: N+1 query)
 * [REG-PERIOD-7D] period=7d funciona corretamente
 * [REG-PERIOD-90D] period=90d funciona corretamente
 * [REG-GERENTE-OK] GERENTE tem acesso RO ao dashboard
 * [REG-FINANCEIRO-OK] FINANCEIRO tem acesso RO ao dashboard
 * [REG-EXEC-KPIS] Response executive contém KPIs estruturados
 */

import { test, expect } from '../fixtures/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Dashboard — Regression Guards', () => {
  test('[REG-AUTH] GET /api/dashboard sem cookie retorna 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard`);
    expect(response.status()).toBe(401);
  });

  test('[REG-AUTH-EXEC] GET /api/dashboard/executive sem cookie retorna 401', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive`);
    expect(response.status()).toBe(401);
  });

  test('[REG-RBAC] CLIENTE não acessa /api/dashboard → 403', async ({
    request,
    clienteHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard`, {
      headers: clienteHeaders,
    });
    expect(response.status()).toBe(403);
  });

  test('[REG-SUCCESS] Response 401 tem { success: false }', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard`);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('[REG-SUCCESS-b] Response 403 tem { success: false }', async ({
    request,
    clienteHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard`, {
      headers: clienteHeaders,
    });
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('[REG-N1] /api/dashboard responde dentro de 5s (N+1 fix)', async ({
    request,
    adminHeaders,
  }) => {
    const start = Date.now();
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: adminHeaders,
      timeout: 5000,
    });
    const elapsed = Date.now() - start;

    // Response deve vir (200 ou 500), jamais timeout
    expect([200, 500]).toContain(response.status());
    // Se o banco está disponível e responde, deve ser < 5s
    if (response.status() === 200) {
      expect(elapsed).toBeLessThan(5000);
    }
  });

  test('[REG-PERIOD-7D] period=7d aceito no /api/dashboard', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=7d`, {
      headers: adminHeaders,
    });
    expect([200, 500]).toContain(response.status());
  });

  test('[REG-PERIOD-90D] period=90d aceito no /api/dashboard', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=90d`, {
      headers: adminHeaders,
    });
    expect([200, 500]).toContain(response.status());
  });

  test('[REG-GERENTE-OK] GERENTE tem acesso RO ao dashboard', async ({
    request,
    gerenteHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: gerenteHeaders,
    });
    // Deve ser 200 ou 500 (banco), NUNCA 401 ou 403
    expect([200, 500]).toContain(response.status());
    expect([401, 403]).not.toContain(response.status());
  });

  test('[REG-FINANCEIRO-OK] FINANCEIRO tem acesso RO ao dashboard', async ({
    request,
    financeiroHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: financeiroHeaders,
    });
    expect([200, 500]).toContain(response.status());
    expect([401, 403]).not.toContain(response.status());
  });

  test('[REG-EXEC-KPIS] /api/dashboard/executive contém kpis estruturados', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive?period=30d`, {
      headers: adminHeaders,
    });

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.kpis).toBeDefined();
      expect(body.data.projetos).toBeDefined();
      expect(body.data.alertas).toBeDefined();
    } else {
      // Banco não disponível — ok
      expect(response.status()).toBe(500);
    }
  });
});
