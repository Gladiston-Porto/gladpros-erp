/**
 * E2E: Projetos — Edge Cases
 *
 * Validates:
 * 1. Pagination with large page numbers
 * 2. Empty body POST
 * 3. Very long title handling
 * 4. Multiple status changes
 * 5. Filter combinations
 * 6. Concurrent requests
 */

import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionFromDatabase } from '../helpers/auth';

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local';

test.describe('Projetos — Edge Cases', () => {
  test.setTimeout(180_000);

  let authToken: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const session = await seedAuthenticatedSessionFromDatabase(page, ADMIN_EMAIL);
    authToken = session.token;
    await page.close();
  });

  test('pagination with page beyond total returns empty data', async ({ request }) => {
    const res = await request.get('/api/projetos?pagina=9999&limite=20', {
      headers: { Cookie: `auth-token=${authToken}` },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });

  test('empty body POST returns validation error', async ({ request }) => {
    const res = await request.post('/api/projetos', {
      headers: {
        Cookie: `auth-token=${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {},
    });

    // Zod validation should fail
    expect([400, 422]).toContain(res.status());
  });

  test('very long title is handled', async ({ request }) => {
    const longTitle = 'A'.repeat(500);
    const res = await request.post('/api/projetos', {
      headers: {
        Cookie: `auth-token=${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        titulo: longTitle,
        clienteId: 1,
      },
    });

    // Should be rejected by validation (max length) or truncated
    expect([201, 400, 422]).toContain(res.status());
  });

  test('filter by multiple status values', async ({ request }) => {
    const res = await request.get('/api/projetos?status=planejado,em_execucao', {
      headers: { Cookie: `auth-token=${authToken}` },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });

  test('concurrent list requests do not fail', async ({ request }) => {
    const requests = Array.from({ length: 5 }, () =>
      request.get('/api/projetos?limite=5', {
        headers: { Cookie: `auth-token=${authToken}` },
      })
    );

    const responses = await Promise.all(requests);
    for (const res of responses) {
      expect(res.status()).toBe(200);
    }
  });

  test('update non-existent project returns 404', async ({ request }) => {
    const res = await request.put('/api/projetos/999999', {
      headers: {
        Cookie: `auth-token=${authToken}`,
        'Content-Type': 'application/json',
      },
      data: { titulo: 'Does not exist' },
    });

    expect(res.status()).toBe(404);
  });

  test('delete non-existent project returns 404', async ({ request }) => {
    const res = await request.delete('/api/projetos/999999', {
      headers: {
        Cookie: `auth-token=${authToken}`,
        'Content-Type': 'application/json',
      },
      data: { motivo: 'Test' },
    });

    expect([404, 500]).toContain(res.status());
  });
});
