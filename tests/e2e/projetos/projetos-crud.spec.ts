/**
 * E2E: Projetos — CRUD Flows
 *
 * Validates:
 * 1. List projects via API
 * 2. Create a new project via API
 * 3. Read project details via API
 * 4. Update project via API
 * 5. Change project status via API
 * 6. Delete project via API
 */

import { test, expect } from '@playwright/test';
import { seedAuthenticatedSessionFromDatabase } from '../helpers/auth';

const ADMIN_EMAIL = 'qa.admin.clientes@teste.local';

test.describe('Projetos — CRUD', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let authToken: string;
  let createdProjetoId: number;

  test('setup: get auth token', async ({ page }) => {
    const session = await seedAuthenticatedSessionFromDatabase(page, ADMIN_EMAIL);
    authToken = session.token;
    expect(authToken).toBeTruthy();
  });

  test('GET /api/projetos — list projects', async ({ request }) => {
    const res = await request.get('/api/projetos', {
      headers: { Cookie: `auth-token=${authToken}` },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.pagination).toBeDefined();
  });

  test('POST /api/projetos — create project', async ({ request }) => {
    const res = await request.post('/api/projetos', {
      headers: {
        Cookie: `auth-token=${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        titulo: `E2E Test Project ${Date.now()}`,
        descricao: 'Created by E2E test',
        clienteId: 1,
        dataInicioPrevista: new Date().toISOString().split('T')[0],
      },
    });

    expect(res.status()).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBeDefined();
    createdProjetoId = json.data.id;
  });

  test('GET /api/projetos/[id] — read project', async ({ request }) => {
    const res = await request.get(`/api/projetos/${createdProjetoId}`, {
      headers: { Cookie: `auth-token=${authToken}` },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(createdProjetoId);
    expect(json.success).toBe(true);
  });

  test('PUT /api/projetos/[id] — update project', async ({ request }) => {
    const res = await request.put(`/api/projetos/${createdProjetoId}`, {
      headers: {
        Cookie: `auth-token=${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        titulo: `E2E Updated ${Date.now()}`,
        descricao: 'Updated by E2E test',
      },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.success).toBe(true);
  });

  test('PATCH /api/projetos/[id]/status — change status', async ({ request }) => {
    const res = await request.patch(`/api/projetos/${createdProjetoId}/status`, {
      headers: {
        Cookie: `auth-token=${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        novoStatus: 'em_execucao',
        motivo: 'E2E test status change',
      },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test('DELETE /api/projetos/[id] — delete project', async ({ request }) => {
    const res = await request.delete(`/api/projetos/${createdProjetoId}`, {
      headers: {
        Cookie: `auth-token=${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        motivo: 'E2E test cleanup',
      },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
