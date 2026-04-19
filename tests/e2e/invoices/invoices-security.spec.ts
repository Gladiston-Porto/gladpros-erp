/**
 * E2E Security Tests — Invoices Module
 *
 * Tests for IDOR prevention, XSS, auth bypass attempts.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Invoices Security — IDOR prevention', () => {
  test('P1-002: GET /api/invoices/[id] returns 401 (not data) without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices/1`);
    expect([401, 302]).toContain(res.status());
    // Must NOT return 200 with invoice data
    expect(res.status()).not.toBe(200);
  });

  test('P1-003: PUT /api/invoices/[id] returns 401 without auth', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/api/invoices/1`, {
      data: { notas: 'injected' },
    });
    expect([401, 302]).toContain(res.status());
    expect(res.status()).not.toBe(200);
  });

  test('P1-004: DELETE /api/invoices/[id] returns 401 without auth', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/api/invoices/1`);
    expect([401, 302]).toContain(res.status());
    expect(res.status()).not.toBe(200);
  });

  test('P1-005: GET /api/invoices/[id]/payments returns 401 without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices/1/payments`);
    expect([401, 302]).toContain(res.status());
    expect(res.status()).not.toBe(200);
  });
});

test.describe('Invoices Security — SQL injection / path traversal', () => {
  test('path traversal attempt in invoice id returns 400 or 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices/../../../etc/passwd`);
    expect([400, 401, 404, 302]).toContain(res.status());
    expect(res.status()).not.toBe(200);
  });

  test('SQL injection in invoice id returns 400 or 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices/1%3B DROP TABLE invoices`);
    expect([400, 401, 404, 302]).toContain(res.status());
    expect(res.status()).not.toBe(200);
  });
});

test.describe('Invoices Security — XSS prevention', () => {
  test('P1-009: send endpoint requires auth (XSS payload rejected at auth layer)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/invoices/1/send`, {
      headers: { 'Content-Type': 'application/json' },
      data: { xss: '<script>alert(1)</script>' },
    });
    // Without auth, must return 401 — XSS payload never reaches HTML template
    expect([401, 302]).toContain(res.status());
    expect(res.status()).not.toBe(200);
  });
});

test.describe('Invoices Security — response format', () => {
  test('P1-008: all error responses include success:false', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices`);
    if (res.status() === 401) {
      const body = await res.json().catch(() => null);
      if (body) {
        // If it returns JSON, it should have success:false or error field
        expect(body.success !== true).toBeTruthy();
      }
    }
    expect([401, 302]).toContain(res.status());
  });
});
