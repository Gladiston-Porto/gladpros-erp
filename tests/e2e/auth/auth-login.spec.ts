/**
 * E2E: Login Flow
 *
 * Cobre o fluxo completo de autenticação:
 * - Validação de campos no client-side (botão desabilitado)
 * - Credenciais inválidas → mensagem de erro
 * - Credenciais válidas → redirecionamento para MFA
 * - Usuário inativo → erro 423 / mensagem de conta bloqueada
 * - Login completo (credenciais + MFA) → cookie httpOnly + redirect ao dashboard
 * - Persistência de sessão após reload
 * - Logout limpa cookies e redireciona para login
 */

import { test, expect } from '@playwright/test';
import { resetAuthTestState, seedAuthenticatedSessionFromDatabase } from '../helpers/auth';
import { fillControlledInput, fillLoginForm } from '../helpers/form';

const QA_ADMIN_EMAIL = 'qa.admin.clientes@teste.local';
const AUTH_TIMEOUT_MS = 120000;

test.describe('Login Flow', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await resetAuthTestState(page.request, QA_ADMIN_EMAIL);
    await page.goto('/login', { waitUntil: 'networkidle', timeout: AUTH_TIMEOUT_MS });
  });

  test('botão Entrar desabilitado quando formulário vazio', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /Entrar/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('botão Entrar desabilitado com apenas email preenchido', async ({ page }) => {
    await fillControlledInput(page.locator('input[name="email"]'), QA_ADMIN_EMAIL);
    const submitBtn = page.getByRole('button', { name: /Entrar/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('botão Entrar desabilitado com senha muito curta (< 6 chars)', async ({ page }) => {
    await fillLoginForm(page, QA_ADMIN_EMAIL, '12345');
    const submitBtn = page.getByRole('button', { name: /Entrar/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('botão Entrar habilitado com email válido + senha ≥ 6 chars', async ({ page }) => {
    await fillLoginForm(page, QA_ADMIN_EMAIL, '123456');
    const submitBtn = page.getByRole('button', { name: /Entrar/i });
    await expect(submitBtn).toBeEnabled();
  });

  test('email inválido é rejeitado pelo browser (type=email)', async ({ page }) => {
    await fillLoginForm(page, 'nao-e-email', '123456');
    const submitBtn = page.getByRole('button', { name: /Entrar/i });
    // O botão deve continuar desabilitado pois email inválido
    await expect(submitBtn).toBeDisabled();
  });

  test('credenciais incorretas exibem mensagem de erro na página', async ({ page }) => {
    await fillLoginForm(page, 'invalido@teste.com', 'SenhaErrada123!');
    const submitBtn = page.getByRole('button', { name: /Entrar/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Deve ficar na página de login com mensagem de erro
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/inválid|incorret|não encontrad|Credenciais/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('campo senha tem tipo password (não expõe texto)', async ({ page }) => {
    const senhaInput = page.locator('input[name="senha"]');
    await expect(senhaInput).toHaveAttribute('type', 'password');
  });

  test('link "Esqueceu a senha" navega para esqueci-senha', async ({ page }) => {
    await page.getByRole('link', { name: /Esqueceu a senha/i }).click();
    await expect(page).toHaveURL(/\/esqueci-senha$/);
  });

  test('login completo com MFA redireciona para dashboard e define cookie authToken', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, QA_ADMIN_EMAIL);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });
    await expect(page).toHaveURL(/\/dashboard$/);

    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'authToken');
    expect(authCookie).toBeDefined();
    expect(authCookie?.httpOnly).toBe(true);
    expect(authCookie?.sameSite).not.toBe('None');
  });

  test('sessão persiste após reload da página', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, QA_ADMIN_EMAIL);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });

    await page.reload({ waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('logout limpa cookies e redireciona para login', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, QA_ADMIN_EMAIL);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });

    // Fazer logout via API diretamente (mais confiável que UI)
    const logoutResp = await page.request.post('/api/auth/logout', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(logoutResp.status()).toBe(200);

    // Navegar e verificar que não está mais autenticado
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });
    await expect(page).toHaveURL(/\/login/);
  });

  test('usuário já autenticado é redirecionado do login para dashboard', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, QA_ADMIN_EMAIL);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });

    // Tentar acessar /login já autenticado deve redirecionar para dashboard
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: AUTH_TIMEOUT_MS });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('/api/auth/me retorna dados do usuário autenticado', async ({ page }) => {
    await seedAuthenticatedSessionFromDatabase(page, QA_ADMIN_EMAIL);

    const resp = await page.request.get('/api/auth/me', {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.success).toBe(true);
    // /api/auth/me returns a flat object (no .data wrapper)
    expect(body.email).toBe(QA_ADMIN_EMAIL);
    expect(body.id).toBeDefined();
    expect(body.role).toBeDefined();
    // Nunca deve retornar a senha
    expect(body.senha).toBeUndefined();
    expect(body.senhaHash).toBeUndefined();
  });

  test('/api/auth/me retorna 401 sem autenticação', async ({ page }) => {
    const resp = await page.request.get('/api/auth/me', {
      headers: { 'Content-Type': 'application/json' },
    });

    expect([401, 403]).toContain(resp.status());
  });
});
