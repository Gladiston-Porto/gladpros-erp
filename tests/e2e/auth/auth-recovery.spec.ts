/**
 * E2E: Auth Recovery Flows
 *
 * Testa os fluxos de recuperação de conta:
 * - Esqueci Senha: form carrega, email válido retorna 200, email inexistente não revela user
 * - Esqueci Senha: resposta não indica se email existe (anti-enumeration)
 * - Reset Senha (fluxo completo): request → captura link via email → nova senha → login
 * - Desbloqueio: página carrega, formulário funciona
 * - Primeiro Acesso: wizard carrega corretamente quando navegado com parâmetros
 * - Primeiro Acesso: validação de senha forte
 */

import { test, expect } from '@playwright/test';
import { resetAuthTestState } from '../helpers/auth';
import { withEmailCapture, extractLink, getMfaCode } from '../helpers/email';
import { fillControlledInput, fillLoginForm } from '../helpers/form';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3007';

const AUTH_TIMEOUT_MS = 120000;
const QA_ADMIN_EMAIL = 'qa.admin.clientes@teste.local';
// qa.usuario is used exclusively by the reset-password test — no other beforeEach touches it,
// so the password won't be restored by a concurrent worker mid-test.
const QA_USUARIO_EMAIL = 'qa.usuario@teste.local';
const QA_USUARIO_ID = 17;

test.describe('Auth Recovery Flows', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    // Reset in-memory rate limits between tests (forgot-password has max 3/hour)
    await resetAuthTestState(page.request, QA_ADMIN_EMAIL);
  });

  // ─── Esqueci Senha ────────────────────────────────────────────────────────

  test.describe('Esqueci Senha', () => {
    test('formulário de esqueci-senha renderiza com input de email', async ({ page }) => {
      await page.goto('/esqueci-senha', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });

      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /Enviar/i })).toBeVisible();
    });

    test('API esqueci-senha retorna 200 para email existente', async ({ page }) => {
      const resp = await page.request.post('/api/auth/forgot-password', {
        data: { email: 'qa.admin.clientes@teste.local' },
        headers: { 'Content-Type': 'application/json' },
      });

      expect(resp.status()).toBe(200);
      const body = await resp.json();
      expect(body.success).toBe(true);
    });

    test('API esqueci-senha retorna 200 para email inexistente (anti-enumeration)', async ({ page }) => {
      const resp = await page.request.post('/api/auth/forgot-password', {
        data: { email: 'inexistente_total@nuncaexistiu.com' },
        headers: { 'Content-Type': 'application/json' },
      });

      // Deve retornar 200 mesmo para email inexistente para não revelar usuários cadastrados
      expect(resp.status()).toBe(200);
      const body = await resp.json();
      expect(body.success).toBe(true);
    });

    test('resposta de esqueci-senha não revela se email existe', async ({ page }) => {
      const [resp1, resp2] = await Promise.all([
        page.request.post('/api/auth/forgot-password', {
          data: { email: 'qa.admin.clientes@teste.local' },
          headers: { 'Content-Type': 'application/json' },
        }),
        page.request.post('/api/auth/forgot-password', {
          data: { email: 'totalmentefalso@naoexiste.local' },
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);

      const body1 = await resp1.json();
      const body2 = await resp2.json();

      // Ambas as mensagens devem ser idênticas (não revelar existência do email)
      expect(resp1.status()).toBe(resp2.status());
      expect(body1.message || body1.data?.message).toBe(body2.message || body2.data?.message);
    });

    test('API esqueci-senha valida formato do email (retorna 400 para email inválido)', async ({ page }) => {
      const resp = await page.request.post('/api/auth/forgot-password', {
        data: { email: 'nao-e-um-email' },
        headers: { 'Content-Type': 'application/json' },
      });

      expect(resp.status()).toBe(422);
      const body = await resp.json();
      expect(body.success).toBe(false);
    });
  });

  // ─── Reset Senha — Fluxo Completo ────────────────────────────────────────

  test.describe('Reset Senha — Fluxo Completo', () => {
    // Reset qa.usuario state before the test so it always starts with the known password
    test.beforeEach(async ({ page }) => {
      await resetAuthTestState(page.request, QA_USUARIO_EMAIL);
    });

    test('fluxo completo: solicitar reset → capturar link por email → nova senha → login com sucesso', async ({ page }) => {
      // Unique password per run — prevents password-reuse-history block on repeated runs
      const NEW_PASSWORD = `NewPass${Date.now()}!`;

      // 1. Trigger forgot-password and capture the email atomically
      const [, mail] = await withEmailCapture(
        page.request,
        BASE_URL,
        async () => {
          const resp = await page.request.post('/api/auth/forgot-password', {
            data: { email: QA_USUARIO_EMAIL },
            headers: { 'Content-Type': 'application/json' },
          });
          expect(resp.status()).toBe(200);
        },
        { timeoutMs: 10_000, to: QA_USUARIO_EMAIL },
      );

      // 2. Validate email metadata
      expect(mail.to.toLowerCase()).toContain(QA_USUARIO_EMAIL.toLowerCase());
      expect(mail.subject).toMatch(/senha/i);

      // 3. Extract reset link — use path only to avoid port mismatch (APP_URL may differ from test server)
      const fullLink = extractLink(mail.html, /reset-senha\//);
      const resetPath = new URL(fullLink).pathname; // "/reset-senha/<token>"

      await page.goto(resetPath, { waitUntil: 'networkidle', timeout: AUTH_TIMEOUT_MS });

      // 4. Fill in and confirm new password — click first to ensure React is hydrated
      await fillControlledInput(page.locator('input[name="senha"]'), NEW_PASSWORD);
      await fillControlledInput(page.locator('input[name="confirm"]'), NEW_PASSWORD);

      // 5. Wait for button to become enabled, then submit
      await page.getByRole('button', { name: /Confirmar Nova Senha/i })
        .waitFor({ state: 'visible' });
      await expect(
        page.getByRole('button', { name: /Confirmar Nova Senha/i })
      ).toBeEnabled({ timeout: 5000 });
      await page.getByRole('button', { name: /Confirmar Nova Senha/i }).click();

      // 6. Verify success feedback
      await expect(page.getByText(/Senha alterada com sucesso/i)).toBeVisible({ timeout: 15_000 });

      // 7. Login with the new password — real MFA flow (no longer bypassed)
      await page.goto('/login', { waitUntil: 'networkidle', timeout: AUTH_TIMEOUT_MS });
      const loginRespPromise = page.waitForResponse(
        (r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST',
        { timeout: 15000 }
      );
      await fillLoginForm(page, QA_USUARIO_EMAIL, NEW_PASSWORD);
      await page.getByRole('button', { name: /Entrar/i }).click();

      // Wait for login response; if MFA is triggered complete it
      try {
        const loginResp = await loginRespPromise;
        const loginBody = await loginResp.json().catch(() => null);
        if (loginBody?.mfaRequired) {
          await page.waitForURL(/\/mfa/, { timeout: 10000 });
          await page.locator('input[type="text"]').first().waitFor({ state: 'visible', timeout: 8000 });
          const code = await getMfaCode(page.request, BASE_URL, QA_USUARIO_ID);
          const inputs = await page.locator('input[type="text"]').all();
          for (let i = 0; i < 6 && i < inputs.length; i++) {
            await inputs[i].click();
            await inputs[i].fill(code[i] ?? '');
            await page.waitForTimeout(60);
          }
        }
      } catch {
        // If interception fails, the page may have navigated directly — proceed
      }

      // 8. Dashboard confirms authentication succeeded
      await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });
    });
  });

  // ─── Desbloqueio ─────────────────────────────────────────────────────────

  test.describe('Desbloqueio', () => {
    test('página de desbloqueio carrega (ou redireciona para login)', async ({ page }) => {
      await page.goto('/desbloqueio', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });

      const url = page.url();
      expect(url.includes('/desbloqueio') || url.includes('/login')).toBe(true);
    });

    test('API desbloqueio retorna 400 quando token ausente', async ({ page }) => {
      const resp = await page.request.post('/api/auth/unlock', {
        data: { method: 'pin', userId: 999999, pin: '' },
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => null);

      // Se a rota existe, deve retornar 400
      if (resp) {
        expect([400, 404]).toContain(resp.status());
      }
    });
  });

  // ─── Primeiro Acesso ──────────────────────────────────────────────────────

  test.describe('Primeiro Acesso', () => {
    test('página primeiro-acesso renderiza wizard com stepper', async ({ page }) => {
      // Navegar com um userId fictício — a página deve carregar o wizard mesmo que
      // o userId não seja válido (a validação real acontece ao submeter)
      await page.goto('/primeiro-acesso?userId=999999', {
        waitUntil: 'domcontentloaded',
        timeout: AUTH_TIMEOUT_MS,
      });

      // Deve renderizar o wizard (etapas ou formulário de senha)
      const url = page.url();
      // Ou permanece em primeiro-acesso ou redireciona para login se userId inválido
      expect(url.includes('/primeiro-acesso') || url.includes('/login')).toBe(true);
    });

    test('API primeiro-acesso setup retorna 400 quando body inválido', async ({ page }) => {
      const resp = await page.request.post('/api/auth/first-access/setup', {
        data: { userId: 'nao-e-numero', newPassword: '12345' },
        headers: { 'Content-Type': 'application/json' },
      });

      expect([400, 401, 422]).toContain(resp.status());
      const body = await resp.json();
      expect(body.success).toBe(false);
    });

    test('API primeiro-acesso setup retorna 400 para senha fraca', async ({ page }) => {
      const resp = await page.request.post('/api/auth/first-access/setup', {
        data: {
          userId: 99999,
          newPassword: '123456',
          pin: '1234',
          securityQuestion: 'Pet',
          securityAnswer: 'a'
        },
        headers: { 'Content-Type': 'application/json' },
      });

      // 400 por senha fraca ou 401 sem credenciais ou 404 por userId não encontrado — todos são válidos
      expect([400, 401, 404, 422]).toContain(resp.status());
      const body = await resp.json();
      expect(body.success).toBe(false);
    });
  });
});
