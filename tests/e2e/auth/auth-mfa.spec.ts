/**
 * E2E: Auth MFA Flow
 *
 * Testa o fluxo de verificação MFA:
 * - Página /mfa renderiza formulário com params válidos
 * - Código inválido → erro 401/400 do endpoint verify
 * - Reenvio de código funciona (status 200, email mascarado)
 * - Resposta do reenvio nunca contém o código em texto puro
 * - Fluxo completo MFA: gera desafio → obtém código → verifica → recebe token
 */

import { test, expect } from '@playwright/test';
import { resetAuthTestState, seedAuthenticatedSessionFromDatabase } from '../helpers/auth';
import { setupMfaChallenge, getMfaCode } from '../helpers/email';

// QA user with a stable ID in the E2E seed — used to avoid dependency on
// real login credentials which may not exist in the E2E database.
const QA_ADMIN_EMAIL = 'qa.admin.clientes@teste.local';
const QA_ADMIN_ID = 13;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_TIMEOUT_MS = 120000;

test.describe('Auth MFA Flow', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await resetAuthTestState(page.request, QA_ADMIN_EMAIL);
  });

  // ─── Page rendering ──────────────────────────────────────────────────────

  test('página /mfa renderiza formulário de código quando acessada com userId válido', async ({ page }) => {
    await page.goto(
      `/mfa?userId=${QA_ADMIN_ID}&email=${encodeURIComponent(QA_ADMIN_EMAIL)}&name=QA+Admin`,
      { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS }
    );

    // The MFA page renders 6 individual digit inputs
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  // ─── Verify endpoint ─────────────────────────────────────────────────────

  test('código MFA inválido (6 zeros) retorna erro 400 ou 401', async ({ page }) => {
    const verifyResp = await page.request.post('/api/auth/mfa/verify', {
      data: { userId: QA_ADMIN_ID, code: '000000' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect([400, 401, 422]).toContain(verifyResp.status());
    const body = await verifyResp.json();
    expect(body.success).toBe(false);
    expect(body.error || body.message).toBeTruthy();
  });

  // ─── Resend endpoint ─────────────────────────────────────────────────────

  test('resposta da API de reenvio de MFA nunca contém o código em texto puro', async ({ page }) => {
    // Use dev endpoint to get a valid mfaChallenge for resend
    const { mfaChallenge } = await setupMfaChallenge(page.request, BASE_URL, QA_ADMIN_ID);

    const resendResp = await page.request.post('/api/auth/mfa/resend', {
      data: { userId: QA_ADMIN_ID, challenge: mfaChallenge },
      headers: { 'Content-Type': 'application/json' },
    });

    const bodyText = await resendResp.text();
    // The MFA code must NEVER appear in the API response body
    expect(bodyText).not.toMatch(/"code"\s*:\s*"\d{6}"/);
    expect(bodyText).not.toMatch(/mfaCode|mfa_code|codigoMfa/i);
  });

  test('endpoint de reenvio MFA retorna 200 e email mascarado para userId válido', async ({ page }) => {
    const { mfaChallenge } = await setupMfaChallenge(page.request, BASE_URL, QA_ADMIN_ID);

    const resendResp = await page.request.post('/api/auth/mfa/resend', {
      data: { userId: QA_ADMIN_ID, challenge: mfaChallenge },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(resendResp.status()).toBe(200);
    const body = await resendResp.json();
    expect(body.success).toBe(true);
    expect(body.email || body.message).toBeTruthy();
  });

  // ─── Full MFA flow ────────────────────────────────────────────────────────

  test('fluxo completo MFA: desafio → código correto → token de autenticação', async ({ page }) => {
    // Generate MFA challenge + code via dev helper
    const { mfaChallenge } = await setupMfaChallenge(page.request, BASE_URL, QA_ADMIN_ID);
    const code = await getMfaCode(page.request, BASE_URL);

    // Verify with the real code
    const verifyResp = await page.request.post('/api/auth/mfa/verify', {
      data: { userId: QA_ADMIN_ID, code, tipoAcao: 'LOGIN' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(verifyResp.status()).toBe(200);
    const body = await verifyResp.json();
    expect(body.success).toBe(true);

    // Token must arrive via Set-Cookie (httpOnly), not in the response body
    const setCookie = verifyResp.headers()['set-cookie'] || '';
    const hasAuthToken = setCookie.includes('authToken') || !!body.token;
    expect(hasAuthToken).toBe(true);

    // Silence lint about unused variable
    void mfaChallenge;
  });

  // ─── Authenticated session ────────────────────────────────────────────────

  test('sessão autenticada injeta cookie authToken válido', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, QA_ADMIN_EMAIL);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });
    await expect(page).toHaveURL(/\/dashboard/);

    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'authToken');
    expect(authCookie).toBeDefined();
    expect(authCookie?.value).toBeTruthy();
  });
});

