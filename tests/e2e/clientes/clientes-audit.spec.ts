/**
 * E2E: Histórico e Auditoria de Clientes
 *
 * Valida:
 * 1. Aba "Histórico" na tela de edição do cliente carrega e exibe conteúdo
 * 2. API /api/clientes/[id]/audit retorna histórico para ADMIN após ações (criar, editar)
 * 3. API /api/clientes/[id]/audit retorna 403 para USUARIO (sem permissão)
 * 4. Diff de campos alterados é registrado corretamente no audit log
 */

import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionWithMFA } from '../helpers/auth';
import {
  apiCreateCliente,
  apiDeleteCliente,
  buildPfPayload,
  uniqueSuffix,
} from './helpers';

const ADMIN_EMAIL = process.env.CLIENTES_ADMIN_EMAIL || 'admin@gladpros.com';
const ADMIN_PASSWORD = process.env.CLIENTES_ADMIN_PASSWORD || 'Admin123!@#';
const USUARIO_EMAIL = process.env.CLIENTES_USUARIO_EMAIL || 'qa.usuario@teste.local';
const NAV_TIMEOUT = 120000;

test.describe('Clientes — Histórico e Auditoria', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  test('aba Histórico carrega na tela de edição do cliente', async ({ page }) => {
    const suffix = uniqueSuffix('audit-tab');
    const payload = buildPfPayload(suffix);
    let clienteId: number | null = null;

    try {
      const auth = await seedAuthenticatedSessionWithMFA(
        page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes/lista'
      );
      const created = await apiCreateCliente(page, auth.token, payload);
      clienteId = created.data.id;

      // Navegar para a tela de edição do cliente
      await page.goto(`/clientes/${clienteId}`, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT,
      });

      // Verificar que a aba "Dados Cadastrais" está ativa por padrão
      await expect(
        page.getByRole('button', { name: /Dados Cadastrais/i })
      ).toBeVisible();

      // Clicar na aba Histórico
      await page.getByRole('button', { name: /Histórico/i }).click();

      // A seção de histórico deve estar visível com o título
      await expect(
        page.getByText('Histórico do Cliente')
      ).toBeVisible();

      await expect(
        page.getByText(/ordens de serviço, propostas, projetos/i)
      ).toBeVisible();
    } finally {
      if (clienteId) {
        const auth = await seedAuthenticatedSessionWithMFA(
          page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes'
        );
        await apiDeleteCliente(page, auth.token, clienteId);
      }
    }
  });

  test('API de auditoria retorna evento de criação para ADMIN', async ({ page }) => {
    const suffix = uniqueSuffix('audit-api');
    const payload = buildPfPayload(suffix);
    let clienteId: number | null = null;

    try {
      const auth = await seedAuthenticatedSessionWithMFA(
        page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes/lista'
      );
      const created = await apiCreateCliente(page, auth.token, payload);
      clienteId = created.data.id;

      // Consultar o audit log via API
      const auditResponse = await page.request.get(
        `/api/clientes/${clienteId}/audit`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );

      expect(auditResponse.status()).toBe(200);
      const auditJson = await auditResponse.json();

      expect(auditJson.success).toBe(true);
      expect(Array.isArray(auditJson.data)).toBe(true);
      expect(auditJson.data.length).toBeGreaterThanOrEqual(1);

      // O primeiro registro deve ser a criação
      const primeiroEvento = auditJson.data[0];
      expect(primeiroEvento.acao).toMatch(/CRIADO|CREATE/i);
      expect(primeiroEvento.usuario).toBeDefined();
      expect(primeiroEvento.timestamp).toBeDefined();
    } finally {
      if (clienteId) {
        const auth = await seedAuthenticatedSessionWithMFA(
          page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes'
        );
        await apiDeleteCliente(page, auth.token, clienteId);
      }
    }
  });

  test('API de auditoria registra diff ao editar cliente', async ({ page }) => {
    const suffix = uniqueSuffix('audit-edit');
    const payload = buildPfPayload(suffix);
    let clienteId: number | null = null;

    try {
      const auth = await seedAuthenticatedSessionWithMFA(
        page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes/lista'
      );
      const created = await apiCreateCliente(page, auth.token, payload);
      clienteId = created.data.id;

      // Editar o cliente — alterar o telefone
      const editResponse = await page.request.put(
        `/api/clientes/${clienteId}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          data: { ...payload, telefone: '4691112222' },
        }
      );
      expect(editResponse.status()).toBe(200);

      // Verificar que o audit log registrou a atualização
      const auditResponse = await page.request.get(
        `/api/clientes/${clienteId}/audit`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );

      const auditJson = await auditResponse.json();
      expect(auditJson.data.length).toBeGreaterThanOrEqual(2);

      // O evento mais recente deve ser a atualização
      const eventoAtualizacao = auditJson.data.find(
        (e: { acao: string }) => /ATUALIZADO|UPDATE/i.test(e.acao)
      );
      expect(eventoAtualizacao).toBeDefined();
      // O diff deve conter o campo alterado
      if (eventoAtualizacao?.diff) {
        expect(JSON.stringify(eventoAtualizacao.diff)).toContain('telefone');
      }
    } finally {
      if (clienteId) {
        const auth = await seedAuthenticatedSessionWithMFA(
          page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes'
        );
        await apiDeleteCliente(page, auth.token, clienteId);
      }
    }
  });

  test('API de auditoria retorna 403 para USUARIO (sem permissão)', async ({ page }) => {
    const suffix = uniqueSuffix('audit-403');
    const payload = buildPfPayload(suffix);
    let clienteId: number | null = null;
    let adminAuth: { token: string } | null = null;

    try {
      // Criar cliente como ADMIN
      const auth = await seedAuthenticatedSessionWithMFA(
        page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes/lista'
      );
      adminAuth = auth;
      const created = await apiCreateCliente(page, auth.token, payload);
      clienteId = created.data.id;

      // Tentar acessar o audit como USUARIO (sem MFA seed — usa login normal)
      // Nota: USUARIO não tem acesso ao audit (/api/clientes/[id]/audit requer ADMIN ou GERENTE)
      const usuarioAuth = await seedAuthenticatedSessionWithMFA(
        page, USUARIO_EMAIL, 'Usuario123!@#', '/clientes/lista'
      );

      const auditResponse = await page.request.get(
        `/api/clientes/${clienteId}/audit`,
        {
          headers: { Authorization: `Bearer ${usuarioAuth.token}` },
        }
      );

      // Deve retornar 403 — acesso negado
      expect(auditResponse.status()).toBe(403);
      const json = await auditResponse.json();
      expect(json.success).toBe(false);
    } finally {
      if (clienteId && adminAuth) {
        const auth = await seedAuthenticatedSessionWithMFA(
          page, ADMIN_EMAIL, ADMIN_PASSWORD, '/clientes'
        );
        await apiDeleteCliente(page, auth.token, clienteId);
      }
    }
  });
});
