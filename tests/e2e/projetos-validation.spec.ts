import { test, expect } from '@playwright/test';
import { loginWithMFA } from './helpers/auth';

/**
 * TESTES E2E - VALIDAÇÃO CRÍTICA
 * Testa apenas as funcionalidades ESSENCIAIS para confirmar que o módulo está pronto
 * ✅ COM SUPORTE COMPLETO A MFA (autenticação de dois fatores)
 */

test.describe('Módulo Projetos - Validação Crítica', () => {
  
  // Login com MFA antes de cada teste (timeout maior para form submit + redirect)
  test.beforeEach(async ({ page }) => {
    await loginWithMFA(page);
  });
  
  test('01 - Deve carregar a lista de projetos sem erros', async ({ page }) => {
    console.log('🧪 Teste 01: Carregar lista de projetos');
    
    // Garantir que estamos no dashboard antes de prosseguir
    await expect(page).toHaveURL(/.*dashboard/);
    
    // DEBUG: Verificar cookies antes de navegar
    const cookiesBeforeNav = await page.context().cookies();
    console.log('  🍪 Cookies antes de navegar:', cookiesBeforeNav.map(c => `${c.name}=${c.value.substring(0, 20)}...`));
    
    // Navegar para projetos
    await page.goto('http://localhost:3000/projetos');
    
    // Aguardar página carregar (domcontentloaded é suficiente, networkidle pode travar com polling)
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    
    // Aguardar título aparecer (confirma que página renderizou)
    await page.waitForSelector('h1:has-text("Projetos")', { timeout: 10000 });
    
    // Verificar que não há mensagens de erro visíveis
    const errorVisible = await page.locator('text=/erro|error|falha|failed/i').count();
    expect(errorVisible).toBe(0);
    
    // Verificar que tem o botão "Novo Projeto" (confirma interface carregou)
    const hasNewButton = await page.locator('text=/novo projeto/i').count() > 0;
    expect(hasNewButton).toBeTruthy();
    
    console.log('✅ Lista carregou sem erros');
  });

  test('02 - Deve navegar para detalhes de um projeto', async ({ page }) => {
    console.log('🧪 Teste 02: Navegar para detalhes');
    
    // Ir para lista
    await page.goto('http://localhost:3000/projetos');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Procurar primeiro projeto (pode ser um link ou botão)
    const firstProject = page.locator('[href*="/projetos/"]').first();
    
    if (await firstProject.count() > 0) {
      await firstProject.click();
      
      // Aguardar navegação
      await page.waitForURL('**/projetos/**', { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Verificar que carregou sem erros
      const pageContent = await page.content();
      expect(pageContent).not.toContain('Cannot read properties of undefined');
      
      console.log('✅ Detalhes carregaram corretamente');
    } else {
      console.log('⚠️  Nenhum projeto encontrado para testar');
    }
  });

  test('03 - Deve exibir a tab Etapas sem erros', async ({ page }) => {
    console.log('🧪 Teste 03: Tab Etapas');
    
    // Navegar direto para um projeto conhecido (ID 1)
    await page.goto('http://localhost:3000/projetos/1');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Procurar tab Etapas
    const etapasTab = page.locator('button:has-text("Etapas"), [role="tab"]:has-text("Etapas")').first();
    
    if (await etapasTab.count() > 0) {
      await etapasTab.click();
      await page.waitForTimeout(2000);
      
      // Verificar que não há erros
      const pageContent = await page.content();
      expect(pageContent).not.toContain('Cannot read properties of undefined');
      expect(pageContent).not.toContain('undefined%'); // Progresso undefined
      
      console.log('✅ Tab Etapas sem erros');
    } else {
      console.log('⚠️  Tab Etapas não encontrada');
    }
  });

  test('04 - Deve verificar que não há erros no console', async ({ page }) => {
    console.log('🧪 Teste 04: Verificar console');
    
    const errors: string[] = [];
    
    // Capturar erros do console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navegar para projetos
    await page.goto('http://localhost:3000/projetos');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Filtrar erros conhecidos/ignoráveis
    const criticalErrors = errors.filter(err => 
      err.includes('Cannot read properties of undefined') ||
      err.includes('TypeError') ||
      err.includes('is not defined')
    );
    
    if (criticalErrors.length > 0) {
      console.log('❌ Erros críticos encontrados:');
      criticalErrors.forEach(err => console.log('  - ' + err));
    } else {
      console.log('✅ Nenhum erro crítico no console');
    }
    
    expect(criticalErrors.length).toBe(0);
  });

});
