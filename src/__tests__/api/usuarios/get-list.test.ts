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

jest.mock('@/shared/lib/cache/business-cache', () => ({
  withBusinessCache: jest.fn().mockImplementation((_key: string, fn: () => unknown) => fn()),
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => handler),
}));

import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockQueryRaw = prisma.$queryRaw as jest.MockedFunction<typeof prisma.$queryRaw>;

function makeRequest(url = 'http://localhost/api/usuarios') {
  return new NextRequest(url);
}

describe('GET /api/usuarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — no auth', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { GET } = await import('@/app/api/usuarios/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('403 — role without read permission', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'CLIENTE', email: 'c@test.com' } as any);
    const { GET } = await import('@/app/api/usuarios/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it('200 — happy path returns items and total', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    // count query
    (mockQueryRaw as jest.Mock).mockResolvedValueOnce([{ cnt: BigInt(2) }]);
    // list query
    (mockQueryRaw as jest.Mock).mockResolvedValueOnce([
      { id: 1, email: 'user1@test.com', nomeCompleto: 'User One', nivel: 'USUARIO', status: 'ATIVO' },
      { id: 2, email: 'user2@test.com', nomeCompleto: 'User Two', nivel: 'GERENTE', status: 'ATIVO' },
    ]);
    const { GET } = await import('@/app/api/usuarios/route');
    const res = await GET(makeRequest('http://localhost/api/usuarios?page=1&pageSize=10'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('200 — pagination params respected', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (mockQueryRaw as jest.Mock).mockResolvedValueOnce([{ cnt: BigInt(50) }]);
    (mockQueryRaw as jest.Mock).mockResolvedValueOnce([]);
    const { GET } = await import('@/app/api/usuarios/route');
    const res = await GET(makeRequest('http://localhost/api/usuarios?page=3&pageSize=5'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(3);
    expect(body.pageSize).toBe(5);
  });
});
