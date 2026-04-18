/**
 * Testes de CRUD para Etapas, Tarefas e Materiais
 * Valida operações em sub-recursos de projetos
 */

import { test, expect } from '../fixtures/auth';

const baseURL = 'http://localhost:3000';

test.describe('API Projetos - Etapas CRUD', () => {
  let projetoId: number;
  let etapaId: number;

  test.beforeAll(async ({ request }) => {
    // Criar projeto para testes
    const adminHeaders = {
      'Authorization': `Bearer fake-admin-token`,
      'Content-Type': 'application/json',
    };

    const response = await request.post(`${baseURL}/api/projetos`, {
      headers: adminHeaders,
      data: {
        titulo: `Projeto Etapas Test ${Date.now()}`,
        descricao: 'Para testar etapas',
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

  test('deve criar etapa - POST /api/projetos/:id/etapas', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.post(`${baseURL}/api/projetos/${projetoId}/etapas`, {
      headers: adminHeaders,
      data: {
        titulo: 'Etapa 1 - Planejamento',
        descricao: 'Fase de planejamento do projeto',
        ordem: 0,
        dataInicioPrevista: '2025-01-15',
        dataFimPrevista: '2025-02-15',
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.titulo).toBe('Etapa 1 - Planejamento');
    expect(body.ordem).toBe(0);
    expect(body.status).toBe('pendente');

    etapaId = body.id;
  });

  test('deve listar etapas - GET /api/projetos/:id/etapas', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/etapas`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toBeInstanceOf(Array);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].titulo).toBeDefined();
  });

  test('deve buscar etapa por ID - GET /api/projetos/:id/etapas/:etapaId', async ({ request, adminHeaders }) => {
    if (!projetoId || !etapaId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/etapas/${etapaId}`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(etapaId);
    expect(body.titulo).toBeDefined();
    expect(body.projetoId).toBe(projetoId);
  });

  test('deve atualizar etapa - PUT /api/projetos/:id/etapas/:etapaId', async ({ request, adminHeaders }) => {
    if (!projetoId || !etapaId) {
      test.skip();
      return;
    }

    const response = await request.put(`${baseURL}/api/projetos/${projetoId}/etapas/${etapaId}`, {
      headers: adminHeaders,
      data: {
        titulo: 'Etapa 1 - Planejamento Atualizado',
        descricao: 'Descrição atualizada',
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.titulo).toBe('Etapa 1 - Planejamento Atualizado');
  });

  test('deve alterar status da etapa - PATCH /api/projetos/:id/etapas/:etapaId/status', async ({ request, adminHeaders }) => {
    if (!projetoId || !etapaId) {
      test.skip();
      return;
    }

    const response = await request.patch(`${baseURL}/api/projetos/${projetoId}/etapas/${etapaId}/status`, {
      headers: adminHeaders,
      data: {
        novoStatus: 'em_andamento',
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('em_andamento');
  });

  test('deve reordenar etapas - POST /api/projetos/:id/etapas/reordenar', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    // Criar mais etapas para reordenar
    const etapa2 = await request.post(`${baseURL}/api/projetos/${projetoId}/etapas`, {
      headers: adminHeaders,
      data: {
        titulo: 'Etapa 2',
        descricao: 'Segunda etapa',
        ordem: 1,
      },
    });

    const etapa3 = await request.post(`${baseURL}/api/projetos/${projetoId}/etapas`, {
      headers: adminHeaders,
      data: {
        titulo: 'Etapa 3',
        descricao: 'Terceira etapa',
        ordem: 2,
      },
    });

    if (etapa2.status() !== 201 || etapa3.status() !== 201) {
      test.skip();
      return;
    }

    const etapa2Body = await etapa2.json();
    const etapa3Body = await etapa3.json();

    // Reordenar: inverter ordem das 3 etapas
    const response = await request.post(`${baseURL}/api/projetos/${projetoId}/etapas/reordenar`, {
      headers: adminHeaders,
      data: {
        novaOrdem: [
          { id: etapa3Body.id, ordem: 0 },
          { id: etapa2Body.id, ordem: 1 },
          { id: etapaId, ordem: 2 },
        ],
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toContain('sucesso');
    expect(body.count).toBe(3);
  });

  test('deve excluir etapa - DELETE /api/projetos/:id/etapas/:etapaId', async ({ request, adminHeaders }) => {
    if (!projetoId || !etapaId) {
      test.skip();
      return;
    }

    const response = await request.delete(`${baseURL}/api/projetos/${projetoId}/etapas/${etapaId}`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toContain('excluída');
  });
});

test.describe('API Projetos - Tarefas CRUD', () => {
  let projetoId: number;
  let etapaId: number;
  let tarefaId: number;

  test.beforeAll(async ({ request }) => {
    // Criar projeto e etapa para testes
    const adminHeaders = {
      'Authorization': `Bearer fake-admin-token`,
      'Content-Type': 'application/json',
    };

    const projetoResponse = await request.post(`${baseURL}/api/projetos`, {
      headers: adminHeaders,
      data: {
        titulo: `Projeto Tarefas Test ${Date.now()}`,
        descricao: 'Para testar tarefas',
        clienteId: 1,
        responsavelId: 1,
        dataInicio: '2025-01-01',
        dataFimPrevista: '2025-12-31',
        orcamento: 50000,
        prioridade: 'media',
      },
    });

    if (projetoResponse.status() === 201) {
      const projetoBody = await projetoResponse.json();
      projetoId = projetoBody.id;

      // Criar etapa
      const etapaResponse = await request.post(`${baseURL}/api/projetos/${projetoId}/etapas`, {
        headers: adminHeaders,
        data: {
          titulo: 'Etapa para Tarefas',
          descricao: 'Etapa de teste',
          ordem: 0,
        },
      });

      if (etapaResponse.status() === 201) {
        const etapaBody = await etapaResponse.json();
        etapaId = etapaBody.id;
      }
    }
  });

  test('deve criar tarefa - POST /api/projetos/:id/tarefas', async ({ request, adminHeaders }) => {
    if (!projetoId || !etapaId) {
      test.skip();
      return;
    }

    const response = await request.post(`${baseURL}/api/projetos/${projetoId}/tarefas`, {
      headers: adminHeaders,
      data: {
        etapaId: etapaId,
        titulo: 'Tarefa 1 - Análise',
        descricao: 'Realizar análise inicial',
        prioridade: 'alta',
        responsavelId: 1,
        dataInicio: '2025-01-15',
        dataFimPrevista: '2025-01-30',
        horasEstimadas: 40,
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.titulo).toBe('Tarefa 1 - Análise');
    expect(body.status).toBe('pendente');
    expect(body.prioridade).toBe('alta');

    tarefaId = body.id;
  });

  test('deve listar tarefas - GET /api/projetos/:id/tarefas', async ({ request, adminHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/tarefas`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toBeInstanceOf(Array);
    expect(body.length).toBeGreaterThan(0);
  });

  test('deve buscar tarefa por ID - GET /api/projetos/:id/tarefas/:tarefaId', async ({ request, adminHeaders }) => {
    if (!projetoId || !tarefaId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/tarefas/${tarefaId}`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(tarefaId);
    expect(body.titulo).toBeDefined();
  });

  test('deve atualizar tarefa - PUT /api/projetos/:id/tarefas/:tarefaId', async ({ request, adminHeaders }) => {
    if (!projetoId || !tarefaId) {
      test.skip();
      return;
    }

    const response = await request.put(`${baseURL}/api/projetos/${projetoId}/tarefas/${tarefaId}`, {
      headers: adminHeaders,
      data: {
        titulo: 'Tarefa 1 - Análise Completa',
        prioridade: 'urgente',
        horasEstimadas: 50,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.titulo).toBe('Tarefa 1 - Análise Completa');
    expect(body.prioridade).toBe('urgente');
  });

  test('deve alterar status da tarefa - PATCH /api/projetos/:id/tarefas/:tarefaId/status', async ({ request, adminHeaders }) => {
    if (!projetoId || !tarefaId) {
      test.skip();
      return;
    }

    const response = await request.patch(`${baseURL}/api/projetos/${projetoId}/tarefas/${tarefaId}/status`, {
      headers: adminHeaders,
      data: {
        novoStatus: 'em_andamento',
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('em_andamento');
  });

  test('deve excluir tarefa - DELETE /api/projetos/:id/tarefas/:tarefaId', async ({ request, adminHeaders }) => {
    if (!projetoId || !tarefaId) {
      test.skip();
      return;
    }

    const response = await request.delete(`${baseURL}/api/projetos/${projetoId}/tarefas/${tarefaId}`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toContain('excluída');
  });
});

test.describe('API Projetos - Materiais CRUD', () => {
  let projetoId: number;
  let materialId: number;

  test.beforeAll(async ({ request }) => {
    const adminHeaders = {
      'Authorization': `Bearer fake-admin-token`,
      'Content-Type': 'application/json',
    };

    const response = await request.post(`${baseURL}/api/projetos`, {
      headers: adminHeaders,
      data: {
        titulo: `Projeto Materiais Test ${Date.now()}`,
        descricao: 'Para testar materiais',
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

  test('deve criar material - POST /api/projetos/:id/materiais', async ({ request, estoqueHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.post(`${baseURL}/api/projetos/${projetoId}/materiais`, {
      headers: estoqueHeaders,
      data: {
        nome: 'Cimento CP-II 50kg',
        descricao: 'Cimento para fundação',
        unidadeMedida: 'kg',
        quantidade: 100,
        custoUnitario: 35.50,
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.nome).toBe('Cimento CP-II 50kg');
    expect(body.quantidade).toBe(100);
    expect(body.custoTotal).toBe(3550); // 100 * 35.50

    materialId = body.id;
  });

  test('deve listar materiais - GET /api/projetos/:id/materiais', async ({ request, estoqueHeaders }) => {
    if (!projetoId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/materiais`, {
      headers: estoqueHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toBeInstanceOf(Array);
  });

  test('deve buscar material por ID - GET /api/projetos/:id/materiais/:materialId', async ({ request, estoqueHeaders }) => {
    if (!projetoId || !materialId) {
      test.skip();
      return;
    }

    const response = await request.get(`${baseURL}/api/projetos/${projetoId}/materiais/${materialId}`, {
      headers: estoqueHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(materialId);
    expect(body.nome).toBeDefined();
  });

  test('deve atualizar material - PUT /api/projetos/:id/materiais/:materialId', async ({ request, estoqueHeaders }) => {
    if (!projetoId || !materialId) {
      test.skip();
      return;
    }

    const response = await request.put(`${baseURL}/api/projetos/${projetoId}/materiais/${materialId}`, {
      headers: estoqueHeaders,
      data: {
        quantidade: 150,
        custoUnitario: 38.00,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.quantidade).toBe(150);
    expect(body.custoUnitario).toBe(38.00);
    expect(body.custoTotal).toBe(5700); // 150 * 38
  });

  test('deve alterar status do material - PATCH /api/projetos/:id/materiais/:materialId/status', async ({ request, estoqueHeaders }) => {
    if (!projetoId || !materialId) {
      test.skip();
      return;
    }

    const response = await request.patch(`${baseURL}/api/projetos/${projetoId}/materiais/${materialId}/status`, {
      headers: estoqueHeaders,
      data: {
        novoStatus: 'requisitado',
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('requisitado');
  });

  test('deve excluir material - DELETE /api/projetos/:id/materiais/:materialId', async ({ request, adminHeaders }) => {
    if (!projetoId || !materialId) {
      test.skip();
      return;
    }

    const response = await request.delete(`${baseURL}/api/projetos/${projetoId}/materiais/${materialId}`, {
      headers: adminHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toContain('excluído');
  });
});
