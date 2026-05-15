/**
 * @jest-environment node
 *
 * Unit tests for liberar/devolver material routes:
 *   POST /api/projetos/[id]/materiais/[materialId]/liberar
 *   POST /api/projetos/[id]/materiais/[materialId]/devolver
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();
const mockRequireProjectChildAccess = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectChildAccess: (...args: unknown[]) => mockRequireProjectChildAccess(...args),
}));

const mockLiberarMaterial = jest.fn();
const mockDevolverMaterial = jest.fn();

jest.mock('@/domains/projects/services/inventory-movement.service', () => ({
  InventoryMovementService: jest.fn().mockImplementation(() => ({
    liberarMaterial: mockLiberarMaterial,
    devolverMaterial: mockDevolverMaterial,
  })),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { POST as liberarPOST } from '@/app/api/projetos/[id]/materiais/[materialId]/liberar/route';
import { POST as devolverPOST } from '@/app/api/projetos/[id]/materiais/[materialId]/devolver/route';

const adminUser = { id: '42', role: 'ADMIN', email: 'admin@test.com' };

function makeRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const makeCtx = (id: string, materialId: string) => ({
  params: Promise.resolve({ id, materialId }),
});

const LIBERAR_BASE = 'http://localhost:3000/api/projetos/1/materiais/10/liberar';
const DEVOLVER_BASE = 'http://localhost:3000/api/projetos/1/materiais/10/devolver';

const sampleMovimentacao = {
  id: 1,
  tipo: 'LIBERACAO',
  quantidade: 5,
  projetoId: 1,
  materialId: 10,
  usuarioId: 42,
  status: 'CONCLUIDA',
};

// ---------------------------------------------------------------------------
// POST /liberar
// ---------------------------------------------------------------------------

describe('POST /api/projetos/[id]/materiais/[materialId]/liberar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockLiberarMaterial.mockResolvedValue(sampleMovimentacao);
  });

  it('returns 201 with created movimentacao', async () => {
    const req = makeRequest(LIBERAR_BASE, { quantidade: 5 });
    const res = await liberarPOST(req, makeCtx('1', '10'));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.tipo).toBe('LIBERACAO');
    expect(json.data.quantidade).toBe(5);
  });

  it('passes correct params to service including usuarioId', async () => {
    const req = makeRequest(LIBERAR_BASE, { quantidade: 3, observacao: 'Urgente' });
    await liberarPOST(req, makeCtx('1', '10'));

    expect(mockLiberarMaterial).toHaveBeenCalledWith({
      projetoId: 1,
      materialId: 10,
      quantidade: 3,
      usuarioId: 42,
      observacao: 'Urgente',
    });
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/abc/materiais/10/liberar',
      { quantidade: 5 },
    );
    const res = await liberarPOST(req, makeCtx('abc', '10'));

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid material ID', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/materiais/xyz/liberar',
      { quantidade: 5 },
    );
    const res = await liberarPOST(req, makeCtx('1', 'xyz'));

    expect(res.status).toBe(400);
  });

  it('throws ZodError for missing quantidade', async () => {
    const req = makeRequest(LIBERAR_BASE, { observacao: 'sem qtd' });

    await expect(liberarPOST(req, makeCtx('1', '10'))).rejects.toThrow();
  });

  it('throws ZodError for negative quantidade', async () => {
    const req = makeRequest(LIBERAR_BASE, { quantidade: -1 });

    await expect(liberarPOST(req, makeCtx('1', '10'))).rejects.toThrow();
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest(LIBERAR_BASE, { quantidade: 5 });

    await expect(liberarPOST(req, makeCtx('1', '10'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when insufficient permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest(LIBERAR_BASE, { quantidade: 5 });

    await expect(liberarPOST(req, makeCtx('1', '10'))).rejects.toThrow('FORBIDDEN');
  });
});

// ---------------------------------------------------------------------------
// POST /devolver
// ---------------------------------------------------------------------------

describe('POST /api/projetos/[id]/materiais/[materialId]/devolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockDevolverMaterial.mockResolvedValue({ ...sampleMovimentacao, tipo: 'DEVOLUCAO' });
  });

  it('returns 201 with created movimentacao', async () => {
    const req = makeRequest(DEVOLVER_BASE, { quantidade: 2 });
    const res = await devolverPOST(req, makeCtx('1', '10'));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.tipo).toBe('DEVOLUCAO');
  });

  it('passes correct params to service including usuarioId', async () => {
    const req = makeRequest(DEVOLVER_BASE, { quantidade: 2, observacao: 'Sobrou' });
    await devolverPOST(req, makeCtx('1', '10'));

    expect(mockDevolverMaterial).toHaveBeenCalledWith({
      projetoId: 1,
      materialId: 10,
      quantidade: 2,
      usuarioId: 42,
      observacao: 'Sobrou',
    });
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/abc/materiais/10/devolver',
      { quantidade: 2 },
    );
    const res = await devolverPOST(req, makeCtx('abc', '10'));

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid material ID', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/materiais/xyz/devolver',
      { quantidade: 2 },
    );
    const res = await devolverPOST(req, makeCtx('1', 'xyz'));

    expect(res.status).toBe(400);
  });

  it('throws ZodError for missing quantidade', async () => {
    const req = makeRequest(DEVOLVER_BASE, { observacao: 'sem qtd' });

    await expect(devolverPOST(req, makeCtx('1', '10'))).rejects.toThrow();
  });

  it('throws ZodError for zero quantidade', async () => {
    const req = makeRequest(DEVOLVER_BASE, { quantidade: 0 });

    await expect(devolverPOST(req, makeCtx('1', '10'))).rejects.toThrow();
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest(DEVOLVER_BASE, { quantidade: 2 });

    await expect(devolverPOST(req, makeCtx('1', '10'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when insufficient permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest(DEVOLVER_BASE, { quantidade: 2 });

    await expect(devolverPOST(req, makeCtx('1', '10'))).rejects.toThrow('FORBIDDEN');
  });
});
