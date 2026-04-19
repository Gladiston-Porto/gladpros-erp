/**
 * E2E Smoke Tests — Invoices Module
 *
 * Verifies basic navigation, visibility and page loading for the invoices module.
 */

import { test, expect } from '@playwright/test';

test.describe('Invoices smoke', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Assume authenticated session via storage state or skip if not configured
    test.skip(!process.env.AUTH_ADMIN_EMAIL, 'Requires AUTH_ADMIN_EMAIL env var');
  });

  test('invoices list page loads with essential elements', async ({ page }) => {
    await page.goto('/invoices', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.getByText('Invoices')).toBeVisible();
  });

  test('nova invoice button is visible on list page', async ({ page }) => {
    await page.goto('/invoices', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Nova Invoice/i }).or(
      page.getByText('Nova Invoice')
    )).toBeVisible();
  });

  test('/invoices/new page loads', async ({ page }) => {
    await page.goto('/invoices/new', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/invoices\/new/);
  });

  test('/invoices/relatorios page loads', async ({ page }) => {
    await page.goto('/invoices/relatorios', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/invoices\/relatorios/);
  });
});

test.describe('Invoices API smoke', () => {
  test('GET /api/invoices returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/invoices');
    expect([401, 302]).toContain(response.status());
  });

  test('GET /api/invoices/stats returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/invoices/stats');
    expect([401, 302]).toContain(response.status());
  });

  test('POST /api/invoices returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/invoices', {
      data: { clienteId: 1, itens: [] },
    });
    expect([401, 302]).toContain(response.status());
  });
});
