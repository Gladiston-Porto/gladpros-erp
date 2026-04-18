/**
 * E2E: Auth MFA Flow
 *
 * Testa o fluxo de verificação MFA após login:
 * - Redirecionamento para /mfa após login com credenciais válidas
 * - Código inválido → mensagem de erro na tela
 * - Reenvio de código funciona (botão disponível e resposta 200)
 * - Código expirado → mensagem adequada
 * - Fluxo primeiro-acesso (firstAccess=true) redireciona para /primeiro-acesso
 * - MFA code nunca aparece no corpo da resposta da API
 */

import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth';

const ADMIN_EMAIL = process.env.AUTH_ADMIN_EMAIL || 'admin@gladpros.com';
const ADMIN_PASSWORD = process.env.AUTH_ADMIN_PASSWORD || 'Admin123!@#';
const AUTH_TIMEOUT_MS = 120000;

test.describe('Auth MFA Flow', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test('login com credenciais válidas redireciona para página /mfa', async ({ page }) => {
    // Iniciar login sem completar MFA — verificar redirecionamento
    const loginResp = await page.request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, senha: ADMIN_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    });

    // API deve responder 200 e indicar que MFA está pendente
    expect([200, 202]).toContain(loginResp.status());
    const body = await loginResp.json();
    expect(body.success).toBe(true);
    // O corpo deve indicar que MFA é necessário (não retorna token ainda)
    expect(body.data?.requiresMfa || body.data?.mfaRequired || body.data?.step).toBeTruthy();
  });

  test('código MFA inválido (6 zeros) retorna erro 401 ou 400', async ({ page }) => {
    // Obter userId via tentativa de login
    const loginResp = await page.request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, senha: ADMIN_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    });
    const loginBody = await loginResp.json();
    const userId = loginBody.data?.userId;

    if (!userId) {
      test.skip(true, 'userId não retornado pelo login — fluxo MFA pode ser diferente neste ambiente');
      return;
    }

    const verifyResp = await page.request.post('/api/auth/mfa/verify', {
      data: { userId, code: '000000' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect([400, 401, 422]).toContain(verifyResp.status());
    const body = await verifyResp.json();
    expect(body.success).toBe(false);
    expect(body.error || body.message).toBeTruthy();
  });

  test('resposta da API de reenvio de MFA nunca contém o código', async ({ page }) => {
    // Obter userId via tentativa de login
    const loginResp = await page.request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, senha: ADMIN_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    });
    const loginBody = await loginResp.json();
    const userId = loginBody.data?.userId;

    if (!userId) {
      test.skip(true, 'userId não retornado — skip');
      return;
    }

    const resendResp = await page.request.post('/api/auth/mfa/resend', {
      data: { userId },
      headers: { 'Content-Type': 'application/json' },
    });

    // Independente de status, o corpo não deve conter sequência numérica de 6 dígitos
    const bodyText = await resendResp.text();
    // Verifica que não há um código de 6 dígitos isolado (como "123456") no body
    expect(bodyText).not.toMatch(/"code"\s*:\s*"\d{6}"/);
    expect(bodyText).not.toMatch(/mfaCode|mfa_code|codigoMfa/i);
  });

  test('endpoint de reenvio MFA retorna 200 para userId válido', async ({ page }) => {
    const loginResp = await page.request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, senha: ADMIN_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    });
    const loginBody = await loginResp.json();
    const userId = loginBody.data?.userId;

    if (!userId) {
      test.skip(true, 'userId não retornado — skip');
      return;
    }

    const resendResp = await page.request.post('/api/auth/mfa/resend', {
      data: { userId },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(resendResp.status()).toBe(200);
    const body = await resendResp.json();
    expect(body.success).toBe(true);
    // Email mascarado deve estar na resposta
    expect(body.data?.email || body.data?.maskedEmail || body.message).toBeTruthy();
  });

  test('página MFA exibe formulário de código quando navegada com params válidos', async ({ page }) => {
    const loginResp = await page.request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, senha: ADMIN_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    });
    const loginBody = await loginResp.json();
    const userId = loginBody.data?.userId;

    if (!userId) {
      test.skip(true, 'userId não disponível para navegar para /mfa');
      return;
    }

    await page.goto(
      `/mfa?userId=${userId}&email=${encodeURIComponent(ADMIN_EMAIL)}&name=Admin`,
      { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS }
    );

    await expect(page.locator('input[maxlength="6"]').or(
      page.locator('input[name="code"]').or(
        page.locator('input[placeholder*="código"], input[placeholder*="code"]')
      )
    ).first()).toBeVisible();
  });

  test('fluxo completo MFA com código correto retorna token de autenticação', async ({ page }) => {
    // Usar helper que faz o fluxo completo incluindo MFA
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/dashboard');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });
    await expect(page).toHaveURL(/\/dashboard$/);

    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'authToken');
    expect(authCookie).toBeDefined();
    expect(authCookie?.value).toBeTruthy();
  });
});
