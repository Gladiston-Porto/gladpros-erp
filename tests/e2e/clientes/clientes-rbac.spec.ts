import { test, expect, type Page } from '@playwright/test';
import { seedAuthenticatedSessionFromDatabase } from '../helpers/auth';

type RoleScenario = {
  role: 'GERENTE' | 'FINANCEIRO' | 'ESTOQUE' | 'USUARIO';
  email: string;
  canCreate: boolean;
  canUpdate: boolean;
};

const CLIENTES_NAV_TIMEOUT_MS = 20000;

const scenarios: RoleScenario[] = [
  { role: 'GERENTE', email: 'qa.gerente@teste.local', canCreate: true, canUpdate: true },
  { role: 'FINANCEIRO', email: 'qa.financeiro@teste.local', canCreate: false, canUpdate: false },
  { role: 'ESTOQUE', email: 'qa.estoque@teste.local', canCreate: false, canUpdate: false },
  { role: 'USUARIO', email: 'qa.usuario@teste.local', canCreate: true, canUpdate: true },
];

async function expectForbidden(page: Page) {
  await expect(page).toHaveURL(/\/403$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Acesso Negado' })).toBeVisible();
}

test.describe('Clientes RBAC', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  for (const scenario of scenarios) {
    test(`${scenario.role} deve respeitar visibilidade e rotas do módulo clientes`, async ({ page }) => {
      // Usar criação direta de JWT via DB — bypassa MFA para testes de RBAC
      // (testes RBAC validam permissões, não o fluxo de login)
      await seedAuthenticatedSessionFromDatabase(page, scenario.email);

      await page.goto('/clientes', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });
      await expect(page).toHaveURL(/\/clientes$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Clientes', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: /Gerenciar Clientes/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Relatórios Análise do perfil/i })).toBeVisible();

      if (scenario.canCreate) {
        await expect(page.getByRole('button', { name: 'Novo Cliente' })).toBeVisible();
        await expect(page.getByRole('link', { name: /Configurações Preferências/i })).toBeVisible();
      } else {
        await expect(page.getByRole('button', { name: 'Novo Cliente' })).toHaveCount(0);
      }

      await page.goto('/clientes/lista', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });
      await expect(page).toHaveURL(/\/clientes\/lista$/);
      await expect(page.getByTestId('clientes-search-input')).toBeVisible();

      if (scenario.canCreate) {
        await expect(page.getByRole('link', { name: /Novo Cliente/i })).toBeVisible();
      } else {
        await expect(page.getByRole('link', { name: /Novo Cliente/i })).toHaveCount(0);
      }

      await page.goto('/clientes/relatorios', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });
      await expect(page).toHaveURL(/\/clientes\/relatorios$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Relatórios de Clientes', exact: true })).toBeVisible();

      await page.goto('/clientes/novo', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });
      if (scenario.canCreate) {
        await expect(page).toHaveURL(/\/clientes\/novo$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Novo Cliente', exact: true })).toBeVisible();
      } else {
        await expectForbidden(page);
      }

      await page.goto('/clientes/config', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });
      if (scenario.canUpdate) {
        await expect(page).toHaveURL(/\/clientes\/config$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Configurações de Clientes', exact: true })).toBeVisible();
      } else {
        await expectForbidden(page);
      }
    });
  }
});
