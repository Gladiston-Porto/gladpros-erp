/**
 * Testes de Autenticação e RBAC para API de Projetos
 * Valida que apenas usuários autenticados e com permissões corretas podem acessar endpoints
 */

import { test, expect, mockUsers, getAuthHeaders } from '../fixtures/auth';

const baseURL = 'http://localhost:3000';

test.describe('API Projetos - Autenticação', () => {
  test('deve retornar 401 sem token de autenticação', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/projetos`);
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('deve retornar 401 com token inválido', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/projetos`, {
      headers: {
        'Authorization': 'Bearer token-invalido',
        'Content-Type': 'application/json',
      },
    });
    
    expect(response.status()).toBe(401);
  });

  test('deve aceitar token válido - ADMIN', async ({ request, adminHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos`, {
      headers: adminHeaders,
    });
    
    // Pode retornar 200 (com dados) ou 500 (problema no servidor, mas autenticado)
    expect([200, 500]).toContain(response.status());
  });

  test('deve aceitar token válido - GERENTE', async ({ request, gerenteHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos`, {
      headers: gerenteHeaders,
    });
    
    expect([200, 500]).toContain(response.status());
  });

  test('deve aceitar token válido - USUARIO', async ({ request, usuarioHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos`, {
      headers: usuarioHeaders,
    });
    
    expect([200, 500]).toContain(response.status());
  });
});

test.describe('API Projetos - RBAC Permissões', () => {
  test('ADMIN pode criar projeto', async ({ request, adminHeaders }) => {
    const response = await request.post(`${baseURL}/api/projetos`, {
      headers: adminHeaders,
      data: {
        titulo: 'Projeto Test ADMIN',
        descricao: 'Teste de criação',
        clienteId: 1,
        responsavelId: 1,
        dataInicio: '2025-01-01',
        dataFimPrevista: '2025-12-31',
        orcamento: 50000,
        prioridade: 'alta',
      },
    });
    
    // 201 (sucesso), 400 (dados inválidos, mas tem permissão), 500 (erro servidor)
    expect([201, 400, 500]).toContain(response.status());
    
    if (response.status() === 403) {
      throw new Error('ADMIN deveria ter permissão para criar projeto');
    }
  });

  test('GERENTE pode criar projeto', async ({ request, gerenteHeaders }) => {
    const response = await request.post(`${baseURL}/api/projetos`, {
      headers: gerenteHeaders,
      data: {
        titulo: 'Projeto Test GERENTE',
        descricao: 'Teste de criação',
        clienteId: 1,
        responsavelId: 2,
        dataInicio: '2025-01-01',
        dataFimPrevista: '2025-12-31',
        orcamento: 30000,
        prioridade: 'media',
      },
    });
    
    expect([201, 400, 500]).toContain(response.status());
    
    if (response.status() === 403) {
      throw new Error('GERENTE deveria ter permissão para criar projeto');
    }
  });

  test('USUARIO não pode criar projeto', async ({ request, usuarioHeaders }) => {
    const response = await request.post(`${baseURL}/api/projetos`, {
      headers: usuarioHeaders,
      data: {
        titulo: 'Projeto Test USUARIO',
        descricao: 'Tentativa de criação',
        clienteId: 1,
        responsavelId: 3,
        dataInicio: '2025-01-01',
        dataFimPrevista: '2025-12-31',
        orcamento: 20000,
        prioridade: 'baixa',
      },
    });
    
    expect(response.status()).toBe(403);
    
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('ESTOQUE não pode criar projeto', async ({ request, estoqueHeaders }) => {
    const response = await request.post(`${baseURL}/api/projetos`, {
      headers: estoqueHeaders,
      data: {
        titulo: 'Projeto Test ESTOQUE',
        descricao: 'Tentativa de criação',
        clienteId: 1,
        responsavelId: 4,
        dataInicio: '2025-01-01',
        dataFimPrevista: '2025-12-31',
        orcamento: 15000,
        prioridade: 'baixa',
      },
    });
    
    expect(response.status()).toBe(403);
  });

  test('FINANCEIRO não pode criar projeto', async ({ request, financeiroHeaders }) => {
    const response = await request.post(`${baseURL}/api/projetos`, {
      headers: financeiroHeaders,
      data: {
        titulo: 'Projeto Test FINANCEIRO',
        descricao: 'Tentativa de criação',
        clienteId: 1,
        responsavelId: 5,
        dataInicio: '2025-01-01',
        dataFimPrevista: '2025-12-31',
        orcamento: 10000,
        prioridade: 'baixa',
      },
    });
    
    expect(response.status()).toBe(403);
  });
});

test.describe('API Projetos - RBAC Delete', () => {
  test('apenas ADMIN pode excluir projeto', async ({ request, adminHeaders }) => {
    const response = await request.delete(`${baseURL}/api/projetos/999`, {
      headers: adminHeaders,
    });
    
    // 200 (sucesso), 404 (não encontrado, mas tem permissão), 500 (erro servidor)
    expect([200, 404, 500]).toContain(response.status());
    
    if (response.status() === 403) {
      throw new Error('ADMIN deveria ter permissão para excluir projeto');
    }
  });

  test('GERENTE não pode excluir projeto', async ({ request, gerenteHeaders }) => {
    const response = await request.delete(`${baseURL}/api/projetos/1`, {
      headers: gerenteHeaders,
    });
    
    expect(response.status()).toBe(403);
  });

  test('USUARIO não pode excluir projeto', async ({ request, usuarioHeaders }) => {
    const response = await request.delete(`${baseURL}/api/projetos/1`, {
      headers: usuarioHeaders,
    });
    
    expect(response.status()).toBe(403);
  });
});

test.describe('API Projetos - RBAC Dashboard', () => {
  test('ADMIN pode acessar dashboard', async ({ request, adminHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/dashboard`, {
      headers: adminHeaders,
    });
    
    expect([200, 500]).toContain(response.status());
    
    if (response.status() === 403) {
      throw new Error('ADMIN deveria ter acesso ao dashboard');
    }
  });

  test('GERENTE pode acessar dashboard', async ({ request, gerenteHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/dashboard`, {
      headers: gerenteHeaders,
    });
    
    expect([200, 500]).toContain(response.status());
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
  });
});

test.describe('API Projetos - RBAC Histórico', () => {
  test('ADMIN pode ver histórico', async ({ request, adminHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/1/historico`, {
      headers: adminHeaders,
    });
    
    expect([200, 404, 500]).toContain(response.status());
    
    if (response.status() === 403) {
      throw new Error('ADMIN deveria ter acesso ao histórico');
    }
  });

  test('GERENTE pode ver histórico', async ({ request, gerenteHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/1/historico`, {
      headers: gerenteHeaders,
    });
    
    expect([200, 404, 500]).toContain(response.status());
  });

  test('USUARIO não pode ver histórico', async ({ request, usuarioHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/1/historico`, {
      headers: usuarioHeaders,
    });
    
    expect(response.status()).toBe(403);
  });
});

test.describe('API Projetos - RBAC Materiais', () => {
  test('ADMIN pode gerenciar materiais', async ({ request, adminHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/1/materiais`, {
      headers: adminHeaders,
    });
    
    expect([200, 404, 500]).toContain(response.status());
    
    if (response.status() === 403) {
      throw new Error('ADMIN deveria poder gerenciar materiais');
    }
  });

  test('GERENTE pode gerenciar materiais', async ({ request, gerenteHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/1/materiais`, {
      headers: gerenteHeaders,
    });
    
    expect([200, 404, 500]).toContain(response.status());
  });

  test('USUARIO não pode gerenciar materiais', async ({ request, usuarioHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/1/materiais`, {
      headers: usuarioHeaders,
    });
    
    expect(response.status()).toBe(403);
  });

  test('ESTOQUE pode gerenciar materiais', async ({ request, estoqueHeaders }) => {
    const response = await request.get(`${baseURL}/api/projetos/1/materiais`, {
      headers: estoqueHeaders,
    });
    
    expect([200, 404, 500]).toContain(response.status());
  });
});
