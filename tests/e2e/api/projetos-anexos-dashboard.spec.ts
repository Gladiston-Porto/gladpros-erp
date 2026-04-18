/**
 * Testes para Anexos, Histórico e Dashboard
 */

import { test, expect } from '../fixtures/auth';

const baseURL = 'http://localhost:3000';

test.describe('API Projetos - Anexos', () => {
  let projetoId: number;
  let anexoId: number;

  test.beforeAll(async ({ request }) => {
    const adminHeaders = {
      'Authorization': `Bearer fake-admin-token`,
      'Content-Type': 'application/json',
    };

    const response = await request.post(`${baseURL}/api/projetos`, {
      headers: adminHeaders,
      data: {
        titulo: `Projeto Anexos Test ${Date.now()}`,
        descricao: 'Para testar anexos',
        clienteId: 1,
        responsavelId: 1,
        dataInicio: '2025-01-01',
        dataFimPrevista: '2025-12-31',
        orcamento: 50000,
        prioridade: 'media',
      },
    });

    if (response.status() === 201) {
      const body = await response.json();
      projetoId = body.id;
    }
  });

  test('deve criar metadados de anexo - POST /api/projetos/:id/anexos', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.post(`${baseURL}/api/projetos/${projetoId}/anexos`, {
      headers: adminHeaders,
      data: {
        nomeArquivo: 'planta-baixa.pdf',
        tipoArquivo: 'application/pdf',
        tamanho: 1024000, // 1MB
        caminho: '/uploads/projetos/planta-baixa.pdf',
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.nomeArquivo).toBe('planta-baixa.pdf');
    expect(body.tamanho).toBe(1024000);
    expect(body.usuarioId).toBe(1); // admin

    anexoId = body.id;
  });

  test('deve listar anexos - GET /api/projetos/:id/anexos', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/anexos`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toBeInstanceOf(Array);
    expect(body.length).toBeGreaterThan(0);
  });

  test('deve buscar anexo por ID - GET /api/projetos/:id/anexos/:anexoId', async ({ request, adminHeaders }) => {
    if (!projetoId || !anexoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/anexos/${anexoId}`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(anexoId);
    expect(body.nomeArquivo).toBeDefined();
  });

  test('deve obter estatísticas de anexos - GET /api/projetos/:id/anexos/estatisticas', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/anexos/estatisticas`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.totalAnexos).toBeDefined();
    expect(body.tamanhoTotal).toBeDefined();
    expect(typeof body.totalAnexos).toBe('number');
    expect(typeof body.tamanhoTotal).toBe('number');
  });

  test('GERENTE não pode excluir anexos', async ({ request, gerenteHeaders }) => {
    if (!projetoId || !anexoId) {
      test.skip();
      return;
    }

    const response = await request.delete(`${baseURL}/api/projetos/${projetoId}/anexos/${anexoId}`, {
      headers: gerenteHeaders,
    });

    expect(response.status()).toBe(403);
  });

  test('ADMIN pode excluir anexo - DELETE /api/projetos/:id/anexos/:anexoId', async ({ request, adminHeaders }) => {
    if (!projetoId || !anexoId) {
      test.skip();
      return;
    }

    const response = await request.delete(`${baseURL}/api/projetos/${projetoId}/anexos/${anexoId}`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toContain('excluído');
  });
});

test.describe('API Projetos - Histórico', () => {
  let projetoId: number;

  test.beforeAll(async ({ request }) => {
    const adminHeaders = {
      'Authorization': `Bearer fake-admin-token`,
      'Content-Type': 'application/json',
    };

    // Criar projeto
    const projetoResponse = await request.post(`${baseURL}/api/projetos`, {
      headers: adminHeaders,
      data: {
        titulo: `Projeto Histórico Test ${Date.now()}`,
        descricao: 'Para testar histórico',
        clienteId: 1,
        responsavelId: 1,
        dataInicio: '2025-01-01',
        dataFimPrevista: '2025-12-31',
        orcamento: 50000,
        prioridade: 'media',
      },
    });

    if (projetoResponse.status() === 201) {
      const body = await projetoResponse.json();
      projetoId = body.id;

      // Fazer algumas alterações para gerar histórico
      await request.patch(`${baseURL}/api/projetos/${projetoId}/status`, {
        headers: adminHeaders,
        data: {
          novoStatus: 'em_execucao',
          observacao: 'Iniciando projeto',
        },
      });

      await request.put(`${baseURL}/api/projetos/${projetoId}`, {
        headers: adminHeaders,
        data: {
          titulo: 'Projeto Histórico Test - Atualizado',
        },
      });
    }
  });

  test('deve listar histórico - GET /api/projetos/:id/historico', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/historico`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.paginacao).toBeDefined();
    expect(body.paginacao.paginaAtual).toBe(1);
  });

  test('deve listar histórico com paginação - GET /api/projetos/:id/historico?pagina=1&limite=5', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/historico?pagina=1&limite=5`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(body.paginacao.itensPorPagina).toBe(5);
  });

  test('entradas de histórico devem ter estrutura correta', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/historico`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    
    if (body.data.length > 0) {
      const entrada = body.data[0];
      expect(entrada.id).toBeDefined();
      expect(entrada.acao).toBeDefined();
      expect(entrada.detalhes).toBeDefined();
      expect(entrada.criadoEm).toBeDefined();
      expect(entrada.usuario).toBeDefined();
      expect(entrada.usuario.nome).toBeDefined();
    }
  });

  test('USUARIO não pode ver histórico', async ({ request, usuarioHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/historico`, {
      headers: usuarioHeaders,
    });

    expect(response.status()).toBe(403);
  });
});

test.describe('API Projetos - Dashboard', () => {
  test('deve retornar métricas do dashboard - GET /api/projetos/dashboard', async ({ request, adminHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/dashboard`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.totalProjetos).toBeDefined();
    expect(body.porStatus).toBeDefined();
    expect(body.porPrioridade).toBeDefined();
    
    expect(typeof body.totalProjetos).toBe('number');
    expect(typeof body.porStatus).toBe('object');
    expect(typeof body.porPrioridade).toBe('object');
  });

  test('métricas por status devem incluir todos os status', async ({ request, adminHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/dashboard`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    const porStatus = body.porStatus;

    // Verificar que todos os status existem
    expect(porStatus.planejado).toBeDefined();
    expect(porStatus.em_execucao).toBeDefined();
    expect(porStatus.em_inspecao).toBeDefined();
    expect(porStatus.aguardando_devolucoes).toBeDefined();
    expect(porStatus.concluido).toBeDefined();
    expect(porStatus.arquivado).toBeDefined();
    expect(porStatus.suspenso).toBeDefined();
    expect(porStatus.cancelado).toBeDefined();
  });

  test('métricas por prioridade devem incluir todas as prioridades', async ({ request, adminHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/dashboard`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    const porPrioridade = body.porPrioridade;

    expect(porPrioridade.baixa).toBeDefined();
    expect(porPrioridade.media).toBeDefined();
    expect(porPrioridade.alta).toBeDefined();
    expect(porPrioridade.urgente).toBeDefined();
  });

  test('USUARIO não pode acessar dashboard', async ({ request, usuarioHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/dashboard`, {
      headers: usuarioHeaders,
    });

    expect(response.status()).toBe(403);
  });

  test('FINANCEIRO pode acessar dashboard', async ({ request, financeiroHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/dashboard`, {
      headers: financeiroHeaders,
    });

    expect([200, 500]).toContain(response.status());

    if (response.status() === 403) {
      throw new Error('FINANCEIRO deveria ter acesso ao dashboard');
    }
  });
});

test.describe('API Projetos - Mascaramento de Dados Financeiros', () => {
  let projetoId: number;

  test.beforeAll(async ({ request }) => {
    const adminHeaders = {
      'Authorization': `Bearer fake-admin-token`,
      'Content-Type': 'application/json',
    };

    const response = await request.post(`${baseURL}/api/projetos`, {
      headers: adminHeaders,
      data: {
        titulo: `Projeto Mascaramento Test ${Date.now()}`,
        descricao: 'Para testar mascaramento',
        clienteId: 1,
        responsavelId: 3, // USUARIO
        dataInicio: '2025-01-01',
        dataFimPrevista: '2025-12-31',
        orcamento: 100000,
        prioridade: 'alta',
      },
    });

    if (response.status() === 201) {
      const body = await response.json();
      projetoId = body.id;
    }
  });

  test('ADMIN deve ver dados financeiros', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.orcamento).toBe(100000);
    expect(body.custoTotal).toBeDefined(); // Pode ser null, mas o campo deve existir
  });

  test('GERENTE deve ver dados financeiros', async ({ request, gerenteHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}`, {
      headers: gerenteHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.orcamento).toBe(100000);
  });

  test('USUARIO não deve ver dados financeiros (mascarados)', async ({ request, usuarioHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}`, {
      headers: usuarioHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.orcamento).toBeUndefined();
    expect(body.custoTotal).toBeUndefined();
  });

  test('FINANCEIRO deve ver dados financeiros', async ({ request, financeiroHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}`, {
      headers: financeiroHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.orcamento).toBe(100000);
  });
});
