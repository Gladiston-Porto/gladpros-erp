/**
 * Testes de Integração E2E: Movimentações de Estoque
 * Fase 5: Ponte Estoque
 * 
 * Testa os endpoints:
 * - POST /api/projetos/[id]/materiais/[materialId]/liberar
 * - POST /api/projetos/[id]/materiais/[materialId]/devolver
 * - GET /api/projetos/[id]/movimentacoes
 * - GET /api/projetos/[id]/movimentacoes/[movId]
 */

import { test, expect } from '@playwright/test';
import { generateAuthToken, mockUsers } from './fixtures/auth';

test.describe('API de Movimentações de Estoque', () => {
  let adminToken: string;
  let gerenteToken: string;
  let usuarioToken: string;
  let projetoId: number;
  let materialId: number;
  let movimentacaoId: number;

  test.beforeAll(async ({ request }) => {
    // Autentica usuários
    adminToken = await generateAuthToken(mockUsers.admin);
    gerenteToken = await generateAuthToken(mockUsers.gerente);
    usuarioToken = await generateAuthToken(mockUsers.usuario);

    // Cria projeto de teste
    const projetoResponse = await request.post('/api/projetos', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        nome: 'Projeto Teste Estoque',
        clienteId: 1,
        tipoServico: 'INSTALACAO',
        prioridade: 'MEDIA',
        dataInicio: new Date().toISOString(),
      },
    });
    const projeto = await projetoResponse.json();
    projetoId = projeto.id;

    // Adiciona material ao projeto
    const materialResponse = await request.post(`/api/projetos/${projetoId}/materiais`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        nome: 'Material Teste Estoque',
        codigo: 'MAT-EST-001',
        quantidadeAlocada: 100,
        unidade: 'UN',
        custoUnitario: 50.00,
      },
    });
    const material = await materialResponse.json();
    materialId = material.id;
  });

  test.describe('POST /api/projetos/[id]/materiais/[materialId]/liberar', () => {
    test('deve liberar material com sucesso (Admin)', async ({ request }) => {
      const response = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/liberar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            quantidade: 30,
            observacao: 'Liberação para teste E2E',
          },
        }
      );

      expect(response.status()).toBe(201);
      const movimentacao = await response.json();
      expect(movimentacao).toMatchObject({
        tipo: 'LIBERACAO',
        quantidade: 30,
        projetoId,
        materialId,
        statusIntegracao: expect.stringMatching(/PENDENTE|PROCESSANDO|CONCLUIDA/),
      });
      expect(movimentacao.id).toBeDefined();
      movimentacaoId = movimentacao.id;
    });

    test('deve liberar material com sucesso (Gerente)', async ({ request }) => {
      const response = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/liberar`,
        {
          headers: { Authorization: `Bearer ${gerenteToken}` },
          data: {
            quantidade: 20,
            observacao: 'Liberação adicional',
          },
        }
      );

      expect(response.status()).toBe(201);
      const movimentacao = await response.json();
      expect(movimentacao.quantidade).toBe(20);
    });

    test('deve falhar sem autenticação', async ({ request }) => {
      const response = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/liberar`,
        {
          data: { quantidade: 10 },
        }
      );

      expect(response.status()).toBe(401);
    });

    test('deve falhar para usuário (sem permissão)', async ({ request }) => {
      const response = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/liberar`,
        {
          headers: { Authorization: `Bearer ${usuarioToken}` },
          data: { quantidade: 10 },
        }
      );

      expect(response.status()).toBe(403);
    });

    test('deve falhar com quantidade inválida', async ({ request }) => {
      const response = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/liberar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { quantidade: -10 },
        }
      );

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.error).toBe('Dados inválidos');
    });

    test('deve falhar com quantidade insuficiente', async ({ request }) => {
      const response = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/liberar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { quantidade: 999999 },
        }
      );

      expect(response.status()).toBe(422);
      const error = await response.json();
      expect(error.error).toContain('insuficiente');
    });

    test('deve falhar com material inexistente', async ({ request }) => {
      const response = await request.post(
        `/api/projetos/${projetoId}/materiais/999999/liberar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { quantidade: 10 },
        }
      );

      expect(response.status()).toBe(404);
    });
  });

  test.describe('POST /api/projetos/[id]/materiais/[materialId]/devolver', () => {
    test('deve devolver material com sucesso (Admin)', async ({ request }) => {
      const response = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/devolver`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            quantidade: 15,
            observacao: 'Devolução parcial',
          },
        }
      );

      expect(response.status()).toBe(201);
      const movimentacao = await response.json();
      expect(movimentacao).toMatchObject({
        tipo: 'DEVOLUCAO',
        quantidade: 15,
        projetoId,
        materialId,
      });
    });

    test('deve falhar ao devolver mais que o usado', async ({ request }) => {
      const response = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/devolver`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { quantidade: 999999 },
        }
      );

      expect(response.status()).toBe(422);
      const error = await response.json();
      expect(error.error).toContain('maior que quantidade usada');
    });

    test('deve falhar sem permissão (Usuário)', async ({ request }) => {
      const response = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/devolver`,
        {
          headers: { Authorization: `Bearer ${usuarioToken}` },
          data: { quantidade: 5 },
        }
      );

      expect(response.status()).toBe(403);
    });
  });

  test.describe('GET /api/projetos/[id]/movimentacoes', () => {
    test('deve listar todas as movimentações do projeto (Admin)', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.status()).toBe(200);
      const resultado = await response.json();
      expect(resultado).toHaveProperty('data');
      expect(resultado).toHaveProperty('paginacao');
      expect(Array.isArray(resultado.data)).toBe(true);
      expect(resultado.data.length).toBeGreaterThan(0);
      expect(resultado.paginacao).toMatchObject({
        paginaAtual: 1,
        totalPaginas: expect.any(Number),
        totalItens: expect.any(Number),
        itensPorPagina: expect.any(Number),
      });
    });

    test('deve filtrar por material específico', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes?materialId=${materialId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.status()).toBe(200);
      const resultado = await response.json();
      resultado.data.forEach((mov: any) => {
        expect(mov.materialId).toBe(materialId);
      });
    });

    test('deve filtrar por tipo de movimentação', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes?tipo=LIBERACAO`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.status()).toBe(200);
      const resultado = await response.json();
      resultado.data.forEach((mov: any) => {
        expect(mov.tipo).toBe('LIBERACAO');
      });
    });

    test('deve filtrar por status de integração', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes?status=CONCLUIDA`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.status()).toBe(200);
      const resultado = await response.json();
      resultado.data.forEach((mov: any) => {
        expect(mov.statusIntegracao).toBe('CONCLUIDA');
      });
    });

    test('deve aplicar paginação corretamente', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes?pagina=1&limite=2`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.status()).toBe(200);
      const resultado = await response.json();
      expect(resultado.data.length).toBeLessThanOrEqual(2);
      expect(resultado.paginacao.itensPorPagina).toBe(2);
    });

    test('deve respeitar limite máximo de 100 itens', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes?limite=200`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.status()).toBe(200);
      const resultado = await response.json();
      expect(resultado.paginacao.itensPorPagina).toBeLessThanOrEqual(100);
    });

    test('deve falhar sem autenticação', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes`
      );

      expect(response.status()).toBe(401);
    });

    test('deve permitir leitura para usuário', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes`,
        {
          headers: { Authorization: `Bearer ${usuarioToken}` },
        }
      );

      expect(response.status()).toBe(200);
    });
  });

  test.describe('GET /api/projetos/[id]/movimentacoes/[movId]', () => {
    test('deve buscar movimentação específica (Admin)', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes/${movimentacaoId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.status()).toBe(200);
      const movimentacao = await response.json();
      expect(movimentacao.id).toBe(movimentacaoId);
      expect(movimentacao).toHaveProperty('tipo');
      expect(movimentacao).toHaveProperty('quantidade');
      expect(movimentacao).toHaveProperty('statusIntegracao');
      expect(movimentacao).toHaveProperty('material');
      expect(movimentacao).toHaveProperty('usuario');
    });

    test('deve permitir leitura para usuário', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes/${movimentacaoId}`,
        {
          headers: { Authorization: `Bearer ${usuarioToken}` },
        }
      );

      expect(response.status()).toBe(200);
    });

    test('deve falhar para movimentação inexistente', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes/999999`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.status()).toBe(404);
    });

    test('deve falhar sem autenticação', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes/${movimentacaoId}`
      );

      expect(response.status()).toBe(401);
    });

    test('deve falhar com ID inválido', async ({ request }) => {
      const response = await request.get(
        `/api/projetos/${projetoId}/movimentacoes/abc`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Fluxo Completo de Movimentações', () => {
    test('deve executar fluxo completo: liberar → consultar → devolver', async ({ request }) => {
      // 1. Liberar material
      const liberarResponse = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/liberar`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            quantidade: 25,
            observacao: 'Teste de fluxo completo',
          },
        }
      );
      expect(liberarResponse.status()).toBe(201);
      const liberacao = await liberarResponse.json();

      // 2. Consultar movimentação criada
      const consultarResponse = await request.get(
        `/api/projetos/${projetoId}/movimentacoes/${liberacao.id}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      expect(consultarResponse.status()).toBe(200);
      const movimentacao = await consultarResponse.json();
      expect(movimentacao.tipo).toBe('LIBERACAO');
      expect(movimentacao.quantidade).toBe(25);

      // 3. Devolver parte do material
      const devolverResponse = await request.post(
        `/api/projetos/${projetoId}/materiais/${materialId}/devolver`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            quantidade: 10,
            observacao: 'Devolução parcial - teste',
          },
        }
      );
      expect(devolverResponse.status()).toBe(201);
      const devolucao = await devolverResponse.json();
      expect(devolucao.tipo).toBe('DEVOLUCAO');

      // 4. Verificar que ambas as movimentações aparecem na listagem
      const listarResponse = await request.get(
        `/api/projetos/${projetoId}/movimentacoes?materialId=${materialId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      expect(listarResponse.status()).toBe(200);
      const lista = await listarResponse.json();
      const ids = lista.data.map((m: any) => m.id);
      expect(ids).toContain(liberacao.id);
      expect(ids).toContain(devolucao.id);
    });
  });
});
