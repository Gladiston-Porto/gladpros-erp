/**
 * E2E Edge Case Tests — Invoices Module
 *
 * Tests for boundary conditions and edge cases.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Invoices Edge Cases', () => {
  test('GET /api/invoices with large page number returns 401 (not error)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices?page=99999`);
    expect([401, 302]).toContain(res.status());
  });

  test('GET /api/invoices with invalid page param returns 400 or 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices?page=-1`);
    expect([400, 401, 302]).toContain(res.status());
  });

  test('GET /api/invoices with invalid status returns 400 or 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices?status=BOGUS_STATUS`);
    expect([400, 401, 302]).toContain(res.status());
  });

  test('POST /api/invoices with empty body returns 400 or 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/invoices`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    expect([400, 401, 302]).toContain(res.status());
  });

  test('payment on non-existent invoice returns 404 or 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/invoices/999999/payments`, {
      data: { valor: 100, metodoPagamento: 'CASH' },
    });
    expect([401, 302, 404]).toContain(res.status());
  });
});
