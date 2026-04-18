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

import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/usuarios/${id}`);
}

const mockUser = { id: 5, email: 'user@test.com', nomeCompleto: 'Test User', nivel: 'USUARIO', status: 'ATIVO' };

describe('GET /api/usuarios/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — no auth', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { GET } = await import('@/app/api/usuarios/[id]/route');
    const res = await GET(makeRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(401);
  });

  it('403 — no read permission (not own, not admin)', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 99, role: 'USUARIO', email: 'other@test.com' } as any);
    const { GET } = await import('@/app/api/usuarios/[id]/route');
    const res = await GET(makeRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
  });

  it('404 — user not found', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);
    const { GET } = await import('@/app/api/usuarios/[id]/route');
    const res = await GET(makeRequest('999'), { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
  });

  it('200 — admin can read any user', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([mockUser]);
    const { GET } = await import('@/app/api/usuarios/[id]/route');
    const res = await GET(makeRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(5);
  });

  it('200 — user can read own profile', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 5, role: 'USUARIO', email: 'user@test.com' } as any);
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([mockUser]);
    const { GET } = await import('@/app/api/usuarios/[id]/route');
    const res = await GET(makeRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
  });
});
