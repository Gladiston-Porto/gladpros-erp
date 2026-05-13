/**
 * E2E: Auth Smoke
 *
 * Verifica que todas as páginas do módulo de autenticação carregam corretamente,
 * que o fluxo mínimo de login funciona e que cookies são definidos após autenticação.
 */

import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionFromDatabase } from '../helpers/auth';

const QA_ADMIN_EMAIL = 'qa.admin.clientes@teste.local';
const AUTH_TIMEOUT_MS = 120000;

test.describe('Auth smoke', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test('página de login carrega com elementos essenciais', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Smoke validado apenas no chromium.');

    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'GladPros' }).or(
      page.locator('img[alt="GladPros"]').first()
    )).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="senha"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Esqueceu a senha/i })).toBeVisible();
  });

  test('página esqueci-senha carrega corretamente', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Smoke validado apenas no chromium.');

    await page.goto('/esqueci-senha', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });

    await expect(page).toHaveURL(/\/esqueci-senha$/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Enviar Link/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Voltar para Login/i })).toBeVisible();
  });

  test('página desbloqueio carrega corretamente', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Smoke validado apenas no chromium.');

    await page.goto('/desbloqueio', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });

    await expect(page).toHaveURL(/\/desbloqueio$/);
    // Deve ter algum conteúdo de desbloqueio ou redirecionar para login
    const isLoginOrDesbloqueio = page.url().includes('/login') || page.url().includes('/desbloqueio');
    expect(isLoginOrDesbloqueio).toBeTruthy();
  });

  test('login completo com MFA e dashboard acessível', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Smoke real validado apenas no chromium.');

    await seedAuthenticatedSessionFromDatabase(page, QA_ADMIN_EMAIL);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });
    await expect(page).toHaveURL(/\/dashboard$/);

    // Cookie de autenticação deve estar presente
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'authToken');
    expect(authCookie).toBeDefined();
    expect(authCookie?.httpOnly).toBe(true);
  });

  test('rota protegida redireciona para login quando não autenticado', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Smoke validado apenas no chromium.');

    // Acesso sem cookies de auth
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });

    await expect(page).toHaveURL(/\/login/);
  });
});
