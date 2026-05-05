import { test, expect, type Page } from '@playwright/test';
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth';
import {
  apiCreateCliente,
  apiDeleteCliente,
  buildPfPayload,
  buildPjPayload,
  findClienteIdByEmail,
  uniqueSuffix,
} from './helpers';

const ADMIN_EMAIL = process.env.CLIENTES_ADMIN_EMAIL || 'admin@gladpros.com';
const ADMIN_PASSWORD = process.env.CLIENTES_ADMIN_PASSWORD || 'Admin123!@#';
const CLIENTES_NAV_TIMEOUT_MS = 120000;

async function fillPfForm(page: Page, payload: ReturnType<typeof buildPfPayload>) {
  await page.getByRole('button', { name: 'Pessoa Física' }).click();
  await page.getByTestId('cliente-form-nome-completo').fill(payload.nomeCompleto);
  await page.getByRole('button', { name: 'SSN' }).click();
  await page.getByTestId('cliente-form-ssn').fill(payload.ssn);
  await page.getByTestId('cliente-form-email').fill(payload.email);
  await page.getByTestId('cliente-form-telefone').fill(payload.telefone);
  await page.getByTestId('cliente-form-address-street').fill(payload.addressStreet);
  await page.getByTestId('cliente-form-address-unit').fill(payload.addressUnit);
  await page.getByTestId('cliente-form-address-city').fill(payload.addressCity);
  await page.getByTestId('cliente-form-address-state').selectOption(payload.addressState);
  await page.getByTestId('cliente-form-address-zip').fill(payload.addressZip);
  await page.getByTestId('cliente-form-address-county').fill(payload.addressCounty);
  await page.getByTestId('cliente-form-observacoes').fill(payload.observacoes);
}

test.describe('Clientes CRUD', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test('deve validar campos obrigatórios do cadastro PF', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes/novo');

    await page.goto('/clientes/novo', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });
    await page.getByTestId('cliente-form-submit').click();

    await expect(page.getByText('Nome completo é obrigatório')).toBeVisible();
    await expect(page.getByText('E-mail é obrigatório')).toBeVisible();
    await expect(page.getByText('Telefone é obrigatório')).toBeVisible();
    await expect(page.getByText('Logradouro é obrigatório')).toBeVisible();
    await expect(page.getByText('Cidade é obrigatória')).toBeVisible();
    await expect(page.getByText('ZIP Code é obrigatório')).toBeVisible();
  });

  test('deve preencher automaticamente cidade e estado ao sair do campo ZIP', async ({ page }) => {
    await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes/novo');
    await page.goto('/clientes/novo', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });

    // Preenche ZIP sem preencher a cidade
    const zipInput = page.getByTestId('cliente-form-address-zip');
    const cityInput = page.getByTestId('cliente-form-address-city');

    await expect(cityInput).toHaveValue('');

    await zipInput.fill('75201');
    await zipInput.press('Tab'); // aciona onBlur

    // Aguarda auto-fill: zippopotam.us → 75201 = Dallas, TX
    await expect(cityInput).toHaveValue('Dallas', { timeout: 8000 });
    await expect(page.getByTestId('cliente-form-address-state')).toHaveValue('TX');
  });

  test('deve criar cliente PF via UI e encontrá-lo na lista', async ({ page }) => {
    const suffix = uniqueSuffix('pf');
    const payload = buildPfPayload(suffix);

    try {
      await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes/novo');

      await page.goto('/clientes/novo', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });
      await fillPfForm(page, payload);
      await page.getByTestId('cliente-form-submit').click();

      await expect(page.getByText('Cliente criado com sucesso')).toBeVisible();
      await expect(page).toHaveURL(/\/clientes$/);

      await page.goto('/clientes/lista', { waitUntil: 'domcontentloaded', timeout: CLIENTES_NAV_TIMEOUT_MS });
      await page.getByTestId('clientes-search-input').fill(payload.nomeCompleto);
      await expect(page.getByText(payload.nomeCompleto)).toBeVisible();

      const clienteId = await findClienteIdByEmail(payload.email);
      expect(clienteId).toBeTruthy();
    } finally {
      const clienteId = await findClienteIdByEmail(payload.email);
      if (clienteId) {
        const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');
        await apiDeleteCliente(page, auth.token, clienteId);
      }
    }
  });

  test('deve abrir detalhes, histórico e editar cliente PJ', async ({ page }) => {
    const suffix = uniqueSuffix('pj');
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

      await row.getByRole('button', { name: 'Ver' }).click();
      await expect(page.getByRole('dialog', { name: 'Detalhes do Cliente' })).toBeVisible();
      await expect(page.getByText(payload.nomeFantasia)).toBeVisible();
      await expect(page.getByText(payload.email)).toBeVisible();
      await page.getByRole('button', { name: 'Fechar' }).click();

      await row.getByRole('button', { name: 'Editar' }).click();
      await expect(page).toHaveURL(new RegExp(`/clientes/${clienteId}$`));

      await page.getByRole('button', { name: 'Histórico' }).click();
      await expect(page.getByText('Histórico do Cliente')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Financeiro' })).toBeVisible();

      await page.getByRole('button', { name: 'Dados Cadastrais' }).click();
      await page.getByTestId('cliente-form-nome-fantasia').fill(`${payload.nomeFantasia} Editado`);
      await page.getByTestId('cliente-form-address-city').fill('Plano');
      await page.getByTestId('cliente-form-submit').click();

      await expect(page.getByText('Cliente atualizado com sucesso')).toBeVisible();
      await expect(page).toHaveURL(/\/clientes$/);
    } finally {
      if (clienteId) {
        const auth = await seedAuthenticatedSessionWithMFA(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes');
        await apiDeleteCliente(page, auth.token, clienteId);
      }
    }
  });
});
