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

jest.mock('@/shared/lib/usuario-query', () => ({
  buildUsuarioSelect: jest.fn().mockResolvedValue('id,email,nomeCompleto,nivel,status'),
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
  userUpdateApiSchema: { safeParse: jest.fn() },
}));

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hash') }));

import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

function makeDeleteRequest(id: string) {
  return new NextRequest(`http://localhost/api/usuarios/${id}`, { method: 'DELETE' });
}

describe('DELETE /api/usuarios/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — no auth', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(401);
  });

  it('403 — no delete permission', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'USUARIO', email: 'u@test.com' } as any);
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
  });

  it('400 — trying to delete self', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 5, role: 'ADMIN', email: 'a@test.com' } as any);
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(400);
  });

  it('404 — not found', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('999'), { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
  });

  it('400 — deleting last ADMIN', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 2, email: 'admin2@test.com', status: 'ATIVO', nivel: 'ADMIN',
    });
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ cnt: BigInt(0) }]);
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('2'), { params: Promise.resolve({ id: '2' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('LAST_ADMIN');
  });

  it('200 — happy path soft deletes user (status → INATIVO)', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 5, email: 'user@test.com', status: 'ATIVO', nivel: 'USUARIO',
    });
    (prisma.usuario.update as jest.Mock).mockResolvedValueOnce({ id: 5, status: 'INATIVO' });
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'INATIVO' }) })
    );
  });
});
