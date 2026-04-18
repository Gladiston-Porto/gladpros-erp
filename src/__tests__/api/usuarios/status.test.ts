import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/audit', () => ({
  AuditoriaService: {
    registrarCriacaoUsuario: jest.fn(),
    registrarAtualizacaoUsuario: jest.fn(),
    registrarExclusaoUsuario: jest.fn(),
  },
}));

jest.mock('@/shared/lib/user-hierarchy', () => ({
  UserRole: { ADMIN: 'ADMIN', GERENTE: 'GERENTE', FINANCEIRO: 'FINANCEIRO', USUARIO: 'USUARIO', ESTOQUE: 'ESTOQUE', CLIENTE: 'CLIENTE' },
  canManageRole: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => handler),
}));

jest.mock('@/shared/lib/validation', () => ({
  toggleUserStatusSchema: {
    safeParse: jest.fn().mockImplementation((data: unknown) => ({ success: true, data })),
  },
}));

import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

function makePatchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/usuarios/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('PATCH /api/usuarios/:id/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — no auth', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    const res = await PATCH(makePatchRequest('5', { ativo: false }), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(401);
  });

  it('403 — USUARIO role denied', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'USUARIO', email: 'u@test.com' } as any);
    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    const res = await PATCH(makePatchRequest('5', { ativo: false }), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
  });

  it('400 — invalid body', async () => {
    const { toggleUserStatusSchema } = require('@/shared/lib/validation');
    (toggleUserStatusSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: false,
      error: { issues: [{ message: 'ativo is required' }] },
    });
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    const res = await PATCH(makePatchRequest('5', {}), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(400);
  });

  it('200 — happy path returns { data: { ativo }, success: true }', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    // Impedir self-toggle: authUser.id=1, userId=5 → OK
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ nivel: 'USUARIO', status: 'ATIVO' }]);
    (prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1);
    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    const res = await PATCH(makePatchRequest('5', { ativo: false }), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('ativo');
  });
});
