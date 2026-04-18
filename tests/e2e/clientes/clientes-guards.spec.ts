import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth';
import {
  apiCreateCliente,
  apiDeleteCliente,
  buildPjPayload,
  cleanupProjeto,
  createProjetoDependency,
  uniqueSuffix,
} from './helpers';

const ADMIN_EMAIL = process.env.CLIENTES_ADMIN_EMAIL || 'admin@gladpros.com';
const ADMIN_PASSWORD = process.env.CLIENTES_ADMIN_PASSWORD || 'Admin123!@#';
const CLIENTES_NAV_TIMEOUT_MS = 120000;

test.describe('Clientes guards e exportação', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test('deve exportar CSV e PDF de cliente selecionado', async ({ page }) => {
    const suffix = uniqueSuffix('export');
    const payload = buildPjPayload(suffix);
    let clienteId: number | null = null;

    try {
      const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes/lista');
      const created = await apiCreateCliente(page, auth.token, payload);
      clienteId = created.data.id;

      await page.goto('/clientes/lista', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });
      await page.getByTestId('clientes-search-input').fill(payload.nomeFantasia);

      const row = page.getByTestId(`cliente-row-${clienteId}`);
      await expect(row).toBeVisible();
      await row.getByLabel(`Selecionar ${payload.nomeFantasia}`).check();

      const csvDownload = page.waitForEvent('download');
      await page.getByTestId('clientes-export-button').click();
      await page.getByRole('button', { name: 'Exportar CSV' }).click();
      const csv = await csvDownload;
      expect(csv.suggestedFilename()).toContain('clientes-selecionados');
      expect(csv.suggestedFilename()).toContain('.csv');

      const pdfDownload = page.waitForEvent('download');
      await page.getByTestId('clientes-export-button').click();
      await page.getByRole('button', { name: 'Exportar PDF' }).click();
      const pdf = await pdfDownload;
      expect(pdf.suggestedFilename()).toContain('clientes-selecionados');
      expect(pdf.suggestedFilename()).toContain('.pdf');
    } finally {
      if (clienteId) {
        const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');
        await apiDeleteCliente(page, auth.token, clienteId);
      }
    }
  });

  test('deve bloquear inativação quando o cliente tiver projeto ativo vinculado', async ({ page }) => {
    const suffix = uniqueSuffix('guard');
    const payload = buildPjPayload(suffix);
    let clienteId: number | null = null;
    let projectId: number | null = null;

    try {
      const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes/lista');
      const created = await apiCreateCliente(page, auth.token, payload);
      clienteId = created.data.id;
      projectId = await createProjetoDependency(clienteId, auth.userId);

      await page.goto('/clientes/lista', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });
      await page.getByTestId('clientes-search-input').fill(payload.nomeFantasia);

      const row = page.getByTestId(`cliente-row-${clienteId}`);
      await expect(row).toBeVisible();
      await row.getByRole('button', { name: 'Desativar' }).click();
      await page.getByRole('button', { name: 'Desativar' }).last().click();

      await expect(page.getByText('Cliente possui dependências ativas e não pode ser inativado')).toBeVisible();
      await expect(row.getByText('Ativo')).toBeVisible();
    } finally {
      await cleanupProjeto(projectId);
      if (clienteId) {
        const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');
        await apiDeleteCliente(page, auth.token, clienteId);
      }
    }
  });
});
