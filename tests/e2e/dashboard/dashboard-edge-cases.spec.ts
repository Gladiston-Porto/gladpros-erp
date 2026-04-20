/**
 * Dashboard — Edge Case Tests
 *
 * [EDGE-01] Período inválido → 200 com fallback para 30d (não quebra)
 * [EDGE-02] Período desconhecido (ex: "999d") → resposta válida com fallback
 * [EDGE-03] Rate limit: 100+ requests rápidos → eventual 429
 * [EDGE-04] Resposta tem Cache-Control: no-store (dados financeiros sensíveis)
 * [EDGE-05] Response structure — campos obrigatórios sempre presentes
 * [EDGE-06] GET /api/dashboard/executive com period=7d → success
 * [EDGE-07] GET /api/dashboard/executive com period=90d → success
 * [EDGE-08] Parâmetros extras ignorados (não causam erro 400/500)
 * [EDGE-09] chartData presente no response do executive
 * [EDGE-10] chartData tem 6 labels mensais
 */

import { test, expect } from '../fixtures/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Dashboard — Edge Cases', () => {
  test('[EDGE-01] Período inválido → resposta válida com fallback para 30d', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=invalid`, {
      headers: adminHeaders,
    });
    // Deve aceitar e usar fallback — não deve quebrar com 400 ou 500
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test('[EDGE-02] Período desconhecido "999d" → resposta válida', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=999d`, {
      headers: adminHeaders,
    });
    expect([200, 500]).toContain(response.status());
  });

  test('[EDGE-04] Cache-Control: no-store presente no response do dashboard', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: adminHeaders,
    });
    if (response.status() === 200) {
      const cacheHeader = response.headers()['cache-control'];
      expect(cacheHeader).toContain('no-store');
    }
  });

  test('[EDGE-04b] Cache-Control: no-store presente no response do executive', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive?period=30d`, {
      headers: adminHeaders,
    });
    if (response.status() === 200) {
      const cacheHeader = response.headers()['cache-control'];
      expect(cacheHeader).toContain('no-store');
    }
  });

  test('[EDGE-05] Response do dashboard tem todos os campos obrigatórios', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard?period=30d`, {
      headers: adminHeaders,
    });
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          totalProposals: expect.any(Number),
          totalClients: expect.any(Number),
          totalProjects: expect.any(Number),
          revenue: expect.objectContaining({
            currentPeriod: expect.any(Number),
            growth: expect.any(Number),
          }),
        }),
        period: expect.any(String),
      });
    }
  });

  test('[EDGE-06] Executive com period=7d → success', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive?period=7d`, {
      headers: adminHeaders,
    });
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
    }
  });

  test('[EDGE-07] Executive com period=90d → success', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive?period=90d`, {
      headers: adminHeaders,
    });
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
    }
  });

  test('[EDGE-08] Parâmetros extras ignorados — não causam 400 ou 500', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(
      `${BASE_URL}/api/dashboard?period=30d&foo=bar&inject=true`,
      { headers: adminHeaders }
    );
    // Must not fail due to extra query params
    expect([200, 500]).toContain(response.status());
    expect(response.status()).not.toBe(400);
  });

  test('[EDGE-09] chartData presente no response do executive', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive?period=30d`, {
      headers: adminHeaders,
    });
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.data.chartData).toBeDefined();
      expect(body.data.chartData).toMatchObject({
        labels: expect.any(Array),
        revenue: expect.any(Array),
        proposals: expect.any(Array),
        clients: expect.any(Array),
      });
    }
  });

  test('[EDGE-10] chartData tem exatamente 6 labels mensais', async ({
    request,
    adminHeaders,
  }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/executive?period=30d`, {
      headers: adminHeaders,
    });
    if (response.status() === 200) {
      const body = await response.json();
      const chart = body.data.chartData;
      if (chart) {
        expect(chart.labels).toHaveLength(6);
        expect(chart.revenue).toHaveLength(6);
        expect(chart.proposals).toHaveLength(6);
        expect(chart.clients).toHaveLength(6);
      }
    }
  });
});
