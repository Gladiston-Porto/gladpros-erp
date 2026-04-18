/**
 * Testes E2E - Fase 7: Integração Financeira
 * 
 * Testa geração de invoices, resumo financeiro e RBAC
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

test.describe('Fase 7: Integração Financeira', () => {
  let adminToken: string;
  let financialToken: string;
  let userToken: string;
  let projetoId: number;

  test.beforeAll(async ({ request }) => {
    // Login como ADMIN
    const adminLogin = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: 'admin@test.com', password: 'Admin123!' },
    });
    const adminData = await adminLogin.json();
    adminToken = adminData.token;

    // Login como FINANCEIRO
    const finLogin = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: 'financeiro@test.com', password: 'Fin123!' },
    });
    const finData = await finLogin.json();
    financialToken = finData.token;

    // Login como USUARIO
    const userLogin = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: 'user@test.com', password: 'User123!' },
    });
    const userData = await userLogin.json();
    userToken = userData.token;

    // Cria um projeto de teste
    const projeto = await request.post(`${BASE_URL}/api/projetos`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        nome: 'Projeto para Invoice',
        descricao: 'Teste financeiro',
        clienteId: 1,
        prioridade: 'MEDIA',
      },
    });
    const projetoData = await projeto.json();
    projetoId = projetoData.projeto.id;

    // Cria proposta para o projeto
    await request.post(`${BASE_URL}/api/projetos/${projetoId}/proposta`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        valor: 10000,
        descricao: 'Proposta de teste',
        prazo: 30,
      },
    });
  });

  test.describe('POST /projetos/[id]/invoices/gerar', () => {
    test('deve gerar invoice com sucesso (ADMIN)', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            descricao: 'Invoice de teste',
            dataVencimento: '2025-02-28',
            incluirProposta: true,
            incluirMateriais: true,
            formaPagamento: 'PIX',
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.sucesso).toBe(true);
      expect(data.mensagem).toContain('gerado com sucesso');
      expect(data.invoice).toBeDefined();
      expect(data.invoice.numeroInvoice).toMatch(/^INV-\d{4}-\d{6}$/);
      expect(data.invoice.valorTotal).toBeGreaterThan(0);
      expect(data.invoice.clienteDocumento).toContain('***'); // Mascarado
      expect(data.invoice.urlPagamento).toContain('mock-payment.com');
    });

    test('deve gerar invoice com sucesso (FINANCEIRO)', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${financialToken}` },
          data: {
            descricao: 'Invoice por financeiro',
            dataVencimento: '2025-03-15',
            incluirProposta: true,
            incluirMateriais: false,
            formaPagamento: 'BOLETO',
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.sucesso).toBe(true);
      expect(data.invoice.numeroInvoice).toBeDefined();
    });

    test('deve falhar sem permissão (USUARIO)', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
          data: {
            descricao: 'Invoice não autorizado',
            dataVencimento: '2025-02-28',
            incluirProposta: true,
            incluirMateriais: false,
            formaPagamento: 'PIX',
          },
        }
      );

      expect(response.status()).toBe(403);
    });

    test('deve validar campos obrigatórios', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            // Faltando descricao
            dataVencimento: '2025-02-28',
            formaPagamento: 'PIX',
          },
        }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.erro).toContain('Descrição é obrigatória');
    });

    test('deve validar data de vencimento', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            descricao: 'Invoice teste',
            dataVencimento: 'DATA_INVALIDA',
            formaPagamento: 'PIX',
          },
        }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.erro).toContain('Data de vencimento inválida');
    });

    test('deve validar desconto percentual', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            descricao: 'Invoice teste',
            dataVencimento: '2025-02-28',
            desconto: 150, // Inválido (> 100)
            formaPagamento: 'PIX',
          },
        }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.erro).toContain('Desconto deve estar entre 0 e 100%');
    });

    test('deve aplicar desconto percentual corretamente', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            descricao: 'Invoice com desconto',
            dataVencimento: '2025-02-28',
            incluirProposta: true,
            incluirMateriais: true,
            desconto: 10,
            formaPagamento: 'PIX',
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.invoice.subtotal).toBe(6500); // 5000 + 1500
      expect(data.invoice.desconto).toBe(650); // 10% de 6500
      expect(data.invoice.valorTotal).toBe(5850); // 6500 - 650
    });

    test('deve aplicar desconto fixo corretamente', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            descricao: 'Invoice com desconto fixo',
            dataVencimento: '2025-02-28',
            incluirProposta: true,
            incluirMateriais: true,
            descontoFixo: 500,
            formaPagamento: 'PIX',
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.invoice.desconto).toBe(500);
      expect(data.invoice.valorTotal).toBe(6000); // 6500 - 500
    });

    test('deve falhar para projeto inexistente', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/projetos/999999/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            descricao: 'Invoice teste',
            dataVencimento: '2025-02-28',
            formaPagamento: 'PIX',
          },
        }
      );

      expect(response.status()).toBe(404);
    });
  });

  test.describe('GET /projetos/[id]/financeiro/resumo', () => {
    test('deve obter resumo financeiro completo (ADMIN)', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/projetos/${projetoId}/financeiro/resumo`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.sucesso).toBe(true);
      expect(data.resumo).toBeDefined();
      expect(data.resumo.projetoId).toBe(projetoId);
      expect(data.resumo.valorOrcado).toBeDefined();
      expect(data.resumo.valorFaturado).toBeDefined();
      expect(data.resumo.valorPago).toBeDefined();
      expect(data.resumo.valorPendente).toBeDefined();
      expect(data.resumo.totalInvoices).toBeDefined();
      expect(data.resumo.margem).toBeDefined();
      expect(data.resumo.percentualMargem).toBeDefined();
    });

    test('deve obter resumo financeiro completo (FINANCEIRO)', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/projetos/${projetoId}/financeiro/resumo`,
        {
          headers: { Authorization: `Bearer ${financialToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.resumo.valorOrcado).toBeDefined();
      expect(data.resumo.margem).toBeDefined();
    });

    test('deve obter resumo mascarado (USUARIO)', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/projetos/${projetoId}/financeiro/resumo`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status()).toBe(403); // Sem permissão de finanças
    });

    test('deve falhar para projeto inexistente', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/projetos/999999/financeiro/resumo`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.status()).toBe(404);
    });
  });

  test.describe('RBAC - Controle de Acesso', () => {
    test('ADMIN deve ter acesso total às finanças', async ({ request }) => {
      // Gerar invoice
      const gerar = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            descricao: 'Teste RBAC ADMIN',
            dataVencimento: '2025-02-28',
            incluirProposta: true,
            formaPagamento: 'PIX',
          },
        }
      );
      expect(gerar.ok()).toBeTruthy();

      // Ver resumo
      const resumo = await request.get(
        `${BASE_URL}/api/projetos/${projetoId}/financeiro/resumo`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      expect(resumo.ok()).toBeTruthy();
    });

    test('FINANCEIRO deve ter acesso a invoices e resumos', async ({ request }) => {
      // Gerar invoice
      const gerar = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${financialToken}` },
          data: {
            descricao: 'Teste RBAC FINANCEIRO',
            dataVencimento: '2025-02-28',
            incluirProposta: true,
            formaPagamento: 'PIX',
          },
        }
      );
      expect(gerar.ok()).toBeTruthy();

      // Ver resumo
      const resumo = await request.get(
        `${BASE_URL}/api/projetos/${projetoId}/financeiro/resumo`,
        {
          headers: { Authorization: `Bearer ${financialToken}` },
        }
      );
      expect(resumo.ok()).toBeTruthy();
    });

    test('USUARIO não deve ter acesso a invoices', async ({ request }) => {
      const gerar = await request.post(
        `${BASE_URL}/api/projetos/${projetoId}/invoices/gerar`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
          data: {
            descricao: 'Teste RBAC USUARIO',
            dataVencimento: '2025-02-28',
            incluirProposta: true,
            formaPagamento: 'PIX',
          },
        }
      );
      expect(gerar.status()).toBe(403);
    });
  });
});
