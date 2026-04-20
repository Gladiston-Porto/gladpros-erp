/**
 * E2E: Projetos — Smoke Tests
 *
 * Validates:
 * 1. /projetos page loads for authenticated users
 * 2. Unauthenticated users get redirected to login
 * 3. Page shows expected header and content structure
 * 4. Subpages load correctly (novo, relatorios)
 */

import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionFromDatabase } from '../helpers/auth';

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local';
const NAV_TIMEOUT = 120_000;

test.describe('Projetos — Smoke', () => {
  test.setTimeout(180_000);

  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/projetos', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await expect(page).toHaveURL(/\/(auth|login)/);
  });

  test('loads projetos page as ADMIN', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, ADMIN_EMAIL);
    await page.goto('/projetos', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });

    await expect(page).toHaveURL(/\/projetos/);
    await expect(page.locator('h1, h2, [data-testid="page-title"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('loads novo projeto page', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, ADMIN_EMAIL);
    await page.goto('/projetos/novo', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });

    await expect(page).toHaveURL(/\/projetos\/novo/);
  });

  test('loads relatórios page', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, ADMIN_EMAIL);
    await page.goto('/projetos/relatorios', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });

    await expect(page).toHaveURL(/\/projetos\/relatorios/);
  });
});
