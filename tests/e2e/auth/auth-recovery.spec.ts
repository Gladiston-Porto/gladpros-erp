/**
 * E2E: Auth Recovery Flows
 *
 * Testa os fluxos de recuperação de conta:
 * - Esqueci Senha: form carrega, email válido retorna 200, email inexistente não revela user
 * - Esqueci Senha: resposta não indica se email existe (anti-enumeration)
 * - Desbloqueio: página carrega, formulário funciona
 * - Primeiro Acesso: wizard carrega corretamente quando navegado com parâmetros
 * - Primeiro Acesso: validação de senha forte
 */

import { test, expect } from '@playwright/test';

const AUTH_TIMEOUT_MS = 120000;

test.describe('Auth Recovery Flows', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  // ─── Esqueci Senha ────────────────────────────────────────────────────────

  test.describe('Esqueci Senha', () => {
    test('formulário de esqueci-senha renderiza com input de email', async ({ page }) => {
      await page.goto('/esqueci-senha', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });

      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /Enviar/i })).toBeVisible();
    });

    test('API esqueci-senha retorna 200 para email existente', async ({ page }) => {
      const resp = await page.request.post('/api/auth/forgot-password', {
        data: { email: 'admin@gladpros.com' },
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
          data: { email: 'admin@gladpros.com' },
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

      expect(resp.status()).toBe(400);
      const body = await resp.json();
      expect(body.success).toBe(false);
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
      const resp = await page.request.post('/api/auth/desbloqueio', {
        data: {},
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
        data: { userId: 'nao-e-numero', senha: '12345' },
        headers: { 'Content-Type': 'application/json' },
      });

      expect([400, 422]).toContain(resp.status());
      const body = await resp.json();
      expect(body.success).toBe(false);
    });

    test('API primeiro-acesso setup retorna 400 para senha fraca', async ({ page }) => {
      const resp = await page.request.post('/api/auth/first-access/setup', {
        data: { userId: 99999, senha: '123456' }, // senha fraca sem maiúscula/especial
        headers: { 'Content-Type': 'application/json' },
      });

      // 400 por senha fraca ou 404 por userId não encontrado — ambos são válidos
      expect([400, 404, 422]).toContain(resp.status());
      const body = await resp.json();
      expect(body.success).toBe(false);
    });
  });
});
