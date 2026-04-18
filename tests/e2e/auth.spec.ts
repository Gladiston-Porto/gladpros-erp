import { test, expect } from '@playwright/test';

// TODO: Este teste depende de /api/test-helpers/get-last-mfa que não existe
// Reativar quando a API helper for implementada
test.describe.skip('Fluxo de Autenticação Seguro', () => {
  test('Deve realizar login completo com MFA e acessar dashboard', async ({ page }) => {
    // 1. Acessar página de login
    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    // 2. Preencher credenciais
    await page.fill('input[type="email"]', 'admin@gladpros.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // 3. Verificar redirecionamento para MFA
    await expect(page).toHaveURL(/\/mfa/);
    
    // 4. Obter código MFA (Simulado via API de teste)
    // Nota: Em um ambiente real de CI, usaríamos um seed ou mock de email
    const mfaResponse = await page.request.get('/api/test-helpers/get-last-mfa');
    const mfaData = await mfaResponse.json();
    const code = mfaData.mfa?.code;
    expect(code).toBeDefined();

    // 5. Preencher código MFA
    // Assumindo que o input de MFA é um campo único ou 6 campos separados
    // Ajuste o seletor conforme a implementação real do componente de OTP
    // Se for um input único:
    // await page.fill('input[name="code"]', code);
    
    // Se forem inputs separados (InputOTP do shadcn/ui costuma ser assim), 
    // geralmente digitamos no primeiro e ele distribui, ou digitamos a string inteira
    await page.keyboard.type(code);
    
    // Clicar em verificar se necessário (muitos componentes submetem auto)
    const verifyButton = page.getByRole('button', { name: /verificar/i });
    if (await verifyButton.isVisible()) {
      await verifyButton.click();
    }

    // 6. Verificar acesso ao Dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // 7. Verificar cookies de segurança
    const cookies = await page.context().cookies();
    const authToken = cookies.find(c => c.name === 'authToken');
    const refreshToken = cookies.find(c => c.name === 'refreshToken');
    
    expect(authToken).toBeDefined();
    expect(refreshToken).toBeDefined();
    expect(authToken?.secure).toBe(true); // Deve ser Secure (exceto localhost se não configurado)
    expect(authToken?.httpOnly).toBe(true);
  });

  test('Deve bloquear acesso não autorizado a rotas protegidas', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    
    await page.goto('/financeiro');
    await expect(page).toHaveURL(/\/login/);
  });
});
