import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth';

const ADMIN_EMAIL = process.env.CLIENTES_ADMIN_EMAIL || process.env.SMOKE_EMAIL || 'admin@gladpros.com';
const ADMIN_PASSWORD = process.env.CLIENTES_ADMIN_PASSWORD || process.env.SMOKE_PASSWORD || 'Admin123!@#';
const CLIENTES_PAGE_TIMEOUT_MS = 120000;

test.describe('Clientes smoke', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test('deve abrir hub, lista e relatórios com MFA ativo', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Smoke real validado apenas no chromium.');

    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');

    await page.goto('/clientes', { timeout: CLIENTES_PAGE_TIMEOUT_MS, waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/clientes$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Clientes', exact: true })).toBeVisible();
    await expect(page.getByText('Gerenciar Clientes')).toBeVisible();

    await page.goto('/clientes/lista', { timeout: CLIENTES_PAGE_TIMEOUT_MS, waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/clientes\/lista$/);
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByTestId('clientes-search-input')).toBeVisible();
    await expect(page.getByTestId('clientes-export-button')).toBeVisible();

    await page.goto('/clientes/relatorios', { timeout: CLIENTES_PAGE_TIMEOUT_MS, waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/clientes\/relatorios$/);
    await expect(page.getByRole('heading', { name: 'Relatórios de Clientes' })).toBeVisible();
    await expect(page.getByText('Exportar Base de Clientes')).toBeVisible();
  });
});
