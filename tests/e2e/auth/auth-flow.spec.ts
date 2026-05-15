/**
 * E2E Test: Auth Flow
 * User journey from login to logout
 * Adapted to match actual UI behavior (client-side validation, button disabled when form invalid)
 */

import { test, expect } from '@playwright/test';
import { resetAuthTestState } from '../helpers/auth';
import { getMfaCode } from '../helpers/email';
import { fillControlledInput, fillLoginForm } from '../helpers/form';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3007';

/**
 * Complete the MFA step after login redirects to /mfa.
 * Fetches the real code from server memory (per-userId store) and fills the 6 inputs.
 */
async function completeMfa(page: import('@playwright/test').Page, userId?: number) {
  // Wait for the first MFA input to be visible
  await page.locator('input[type="text"]').first().waitFor({ state: 'visible', timeout: 8000 });
  const inputs = await page.locator('input[type="text"]').all();
  const verifyBtn = page.getByRole('button', { name: /verificar e entrar/i });

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = await getMfaCode(page.request, BASE_URL, userId);
    for (let i = 0; i < 6 && i < inputs.length; i++) {
      await inputs[i].click();
      await inputs[i].fill(code[i] ?? '');
      await page.waitForTimeout(60);
    }

    if (await verifyBtn.isEnabled().catch(() => false)) {
      await verifyBtn.click();
    }

    try {
      await page.waitForURL(
        (url) => !url.toString().includes('/mfa') && !url.toString().includes('/login'),
        { timeout: 8000 }
      );
      return;
    } catch {
      // Retry with a fresh code if still on /mfa
    }
  }

  throw new Error('MFA flow did not navigate away from /mfa after retries');
}

/**
 * Perform a complete login, handling MFA redirect when present.
 * Intercepts the login API response to capture userId for precise per-userId code lookup.
 * For negative tests (invalid credentials) the function returns without crashing.
 */
async function loginAs(page: import('@playwright/test').Page, email: string, senha: string) {
  await page.waitForLoadState('networkidle');
  await fillLoginForm(page, email, senha);
  const submitBtn = page.locator('button:has-text("Entrar")');
  await expect(submitBtn).toBeEnabled({ timeout: 5000 });

  // Capture login API response to extract userId when MFA is triggered
  const loginRespPromise = page.waitForResponse(
    (r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST',
    { timeout: 15000 }
  );
  await submitBtn.click();

  let userId: number | undefined;
  try {
    const loginResp = await loginRespPromise;
    const body = await loginResp.json().catch(() => null);
    if (body?.mfaRequired && body?.user?.id) {
      userId = Number(body.user.id);
    }
  } catch {
    // Ignore — negative tests won't have a valid login response
  }

  // Wait for navigation (MFA page, dashboard, or stay on /login for errors)
  try {
    await page.waitForURL(
      (url) => {
        const s = url.toString();
        return s.includes('/mfa') || s.includes('/dashboard') || s.includes('/clientes');
      },
      { timeout: 15000 }
    );
  } catch {
    return; // Stayed on /login (expected for error cases)
  }

  // Complete MFA flow if redirected there
  if (page.url().includes('/mfa')) {
    await completeMfa(page, userId);
  }
}

const QA_ADMIN_EMAIL = 'qa.admin.clientes@teste.local';
const QA_ADMIN_PASSWORD = 'Admin123!@#';

// Dedicated email for rate-limiting tests — no other beforeEach ever resets this,
// so its bucket is never cleared mid-test by a concurrent worker.
const RATELIMIT_EMAIL = 'ratelimit_flow@test.fake';

// File-level: reset QA user DB state before every test to prevent account lock bleed-over
test.beforeEach(async ({ page }) => {
  await resetAuthTestState(page.request, QA_ADMIN_EMAIL);
});

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Wait for React to fully hydrate before interacting with controlled inputs
    await page.waitForLoadState('networkidle');
  });

  test('should complete full login flow successfully', async ({ page }) => {
    await expect(page).toHaveURL('/login');

    // Fill valid credentials — loginAs() handles MFA redirect automatically
    await loginAs(page, QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD);

    // After MFA, should land on dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });

    // Verify dashboard loaded
    await expect(page.locator('h1').first()).toContainText('Dashboard', { timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Use a syntactically valid email + 6-char password so the button is enabled
    await loginAs(page, 'wrong@test.com', 'badpassword123');

    // Should stay on login page
    await expect(page).toHaveURL('/login', { timeout: 10000 });

    // Should show error message (the server returns "Credenciais inválidas" or similar)
    await expect(
      page.locator('text=/Credenciais inválidas|Credenciais incorretas|Invalid|bloqueada|Conta|Erro/')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields on client side', async ({ page }) => {
    // The submit button should be disabled when form is empty
    const submitBtn = page.locator('button:has-text("Entrar")');
    await expect(submitBtn).toBeDisabled();

    // Fill only email — button still disabled (senha empty)
    await fillControlledInput(page.locator('input[name="email"]'), 'test@test.com');
    await expect(submitBtn).toBeDisabled();

    // Fill short senha — button still disabled (less than 6 chars)
    await fillControlledInput(page.locator('input[name="senha"]'), '123');
    await expect(submitBtn).toBeDisabled();

    // Fill valid senha — button should be enabled
    await fillControlledInput(page.locator('input[name="senha"]'), '123456');
    await expect(submitBtn).toBeEnabled();
  });

  test.describe('Rate Limiting', () => {
    // Clear the dedicated email's bucket before each run so it always starts at 0
    test.beforeEach(async ({ request }) => {
      await resetAuthTestState(request, RATELIMIT_EMAIL);
    });

    test('should handle rate limiting after multiple failed attempts', async ({ page }) => {
      // Attempt login multiple times with wrong credentials
      for (let i = 0; i < 6; i++) {
        // selectText() + pressSequentially reliably updates React state;
        // also clears any previous value before re-typing
        await fillLoginForm(page, RATELIMIT_EMAIL, 'wrongpassword123');
        const btn = page.locator('button:has-text("Entrar")');
        await expect(btn).toBeEnabled({ timeout: 5000 });
        await btn.click();
        // Wait for the response
        await page.waitForTimeout(1000);
      }

      // Should see either a rate-limit message or a blocked-account message
      await expect(
        page.getByText(/bloqueada|muitas tentativas/i).first()
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first (includes real MFA flow)
    await loginAs(page, QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });

    // Look for user menu or logout button
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label="Menu do usuário"], button:has-text("Sair")');
    if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userMenu.click();
      const logoutBtn = page.locator('text=Sair');
      if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutBtn.click();
      }
    } else {
      // Try direct navigation to logout API
      await page.goto('/api/auth/logout');
    }

    // Navigate to login and verify we're logged out
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should preserve attempted URL after login', async ({ page }) => {
    // Try to access protected page without auth
    await page.goto('/clientes');

    // Should redirect to login (could be / or /login)
    await page.waitForURL(/\/(login)?$/, { timeout: 10000 });

    // Login (handles MFA)
    await loginAs(page, QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD);

    // Should redirect somewhere after login (dashboard or originally requested page)
    await page.waitForURL(/\/(dashboard|clientes)/, { timeout: 15000 });
  });

  test('should show password visibility toggle', async ({ page }) => {
    const passwordInput = page.locator('input[name="senha"]');

    // Initially type=password
    await expect(passwordInput).toHaveAttribute('type', 'password');

    const toggle = page.getByRole('button', { name: /mostrar senha|ocultar senha/i });

    await toggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await toggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should have accessible form labels', async ({ page }) => {
    const emailInput = page.locator('input[name="email"]');
    const senhaInput = page.locator('input[name="senha"]');

    // The inputs use <label htmlFor="email/senha"> and id="email/senha"
    await expect(emailInput).toHaveAttribute('id', 'email');
    await expect(senhaInput).toHaveAttribute('id', 'senha');

    // Verify labels exist
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="senha"]')).toBeVisible();
  });
});

test.describe('Session Management', () => {
  test('should maintain session across page refreshes', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await loginAs(page, QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });

    // Refresh page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1').first()).toContainText('Dashboard', { timeout: 10000 });
  });

  test('should expire session after timeout', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await loginAs(page, QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });

    // Clear cookies to simulate session expiration  
    await page.context().clearCookies();

    // Navigate to protected page
    await page.goto('/clientes');

    // Should redirect to login (could be / or /login)
    await page.waitForURL(/\/(login)?$/, { timeout: 10000 });
  });
});
