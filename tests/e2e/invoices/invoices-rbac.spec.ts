/**
 * E2E RBAC Tests — Invoices Module
 *
 * Tests role-based access control for invoice endpoints.
 * RBAC Matrix: ADMIN/GERENTE/FINANCEIRO=ALL, USUARIO=RO, ESTOQUE=none, CLIENTE=RO(portal)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Invoices RBAC — unauthenticated blocks', () => {
  test('GET /api/invoices — blocked without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices`);
    expect([401, 302]).toContain(res.status());
  });

  test('POST /api/invoices — blocked without auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/invoices`, { data: {} });
    expect([401, 302]).toContain(res.status());
  });

  test('POST /api/invoices/1/send — blocked without auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/invoices/1/send`);
    expect([401, 302]).toContain(res.status());
  });

  test('POST /api/invoices/overdue — blocked without auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/invoices/overdue`);
    expect([401, 302]).toContain(res.status());
  });

  test('DELETE /api/invoices/1/payments/1 — blocked without auth', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/api/invoices/1/payments/1`);
    expect([401, 302]).toContain(res.status());
  });

  test('GET /api/invoices/1/pdf — blocked without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices/1/pdf`);
    expect([401, 302]).toContain(res.status());
  });
});

test.describe('Invoices RBAC — portal access', () => {
  test('portal invoices page — valid token format accepted', async ({ request }) => {
    // A fake token should not cause a 500 — it should return 401/404
    const res = await request.get(`${BASE_URL}/portal/fake-token-abc123/invoices`);
    expect([200, 401, 404, 302]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });
});
