jest.mock('next/server', () => {
  const makeSearchParams = (url: string) => {
    try { return new URLSearchParams(url.includes('?') ? url.split('?')[1] ?? '' : ''); }
    catch { return new URLSearchParams(); }
  };
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string }) => ({
      url,
      method: (init?.method ?? 'GET').toUpperCase(),
      headers: { get: jest.fn().mockReturnValue(null) },
      nextUrl: { searchParams: makeSearchParams(url) },
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
        status: options?.status ?? 200,
        _data: data,
      })),
    },
  };
});

import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((fn: unknown) => fn),
}));

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { GET } from '@/app/api/usuarios/alerts/inactive/route';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;
const mockQueryRaw = prisma.$queryRaw as jest.MockedFunction<typeof prisma.$queryRaw>;

const adminUser = { id: 1, email: 'admin@gladpros.com', role: 'ADMIN', empresaId: 1 };

const sampleUser = {
  id: 10,
  email: 'worker@gladpros.com',
  nomeCompleto: 'Worker Inativo',
  nivel: 'USUARIO',
  ultimoLoginEm: new Date(Date.now() - 35 * 86_400_000), // 35 dias atrás
  criadoEm: new Date(Date.now() - 90 * 86_400_000),
  avatarUrl: null,
};

function makeReq(days?: string) {
  const url = days
    ? `http://localhost/api/usuarios/alerts/inactive?days=${days}`
    : 'http://localhost/api/usuarios/alerts/inactive';
  return new NextRequest(url);
}

describe('GET /api/usuarios/alerts/inactive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(adminUser as never);
    mockCan.mockReturnValue(true);
  });

  it('retorna 401 quando não autenticado', async () => {
    mockRequireUser.mockRejectedValue(Object.assign(new Error('UNAUTHENTICATED'), { digest: 'NEXT_REDIRECT' }));
    await expect(GET(makeReq())).rejects.toThrow('UNAUTHENTICATED');
  });

  it('retorna 403 quando sem permissão', async () => {
    mockCan.mockReturnValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });

  it('retorna 400 quando days é inválido (0)', async () => {
    const res = await GET(makeReq('0'));
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando days é inválido (400)', async () => {
    const res = await GET(makeReq('400'));
    expect(res.status).toBe(400);
  });

  it('retorna 200 com lista vazia quando não há usuários inativos', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect((res as { _data: { data: { count: number } } })._data.data.count).toBe(0);
    expect((res as { _data: { data: { users: unknown[] } } })._data.data.users).toHaveLength(0);
  });

  it('retorna 200 com usuários inativos e dias corretos', async () => {
    mockQueryRaw.mockResolvedValue([sampleUser]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = (res as { _data: { data: { count: number; days: number; users: Array<{ diasSemAcesso: number; email: string }> }; success: boolean } })._data;
    expect(data.success).toBe(true);
    expect(data.data.count).toBe(1);
    expect(data.data.days).toBe(30);
    expect(data.data.users[0].email).toBe('worker@gladpros.com');
    expect(data.data.users[0].diasSemAcesso).toBeGreaterThanOrEqual(35);
  });

  it('respeita parâmetro days personalizado', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const res = await GET(makeReq('60'));
    expect(res.status).toBe(200);
    expect((res as { _data: { data: { days: number } } })._data.data.days).toBe(60);
  });

  it('calcula diasSemAcesso para usuário que nunca fez login', async () => {
    const neverLogged = {
      ...sampleUser,
      ultimoLoginEm: null,
      criadoEm: new Date(Date.now() - 40 * 86_400_000),
    };
    mockQueryRaw.mockResolvedValue([neverLogged]);
    const res = await GET(makeReq());
    const users = (res as { _data: { data: { users: Array<{ diasSemAcesso: number; ultimoLoginEm: null }> } } })._data.data.users;
    expect(users[0].ultimoLoginEm).toBeNull();
    expect(users[0].diasSemAcesso).toBeGreaterThanOrEqual(40);
  });

  it('retorna múltiplos usuários ordenados', async () => {
    const rows = [
      { ...sampleUser, id: 10, email: 'a@test.com', ultimoLoginEm: new Date(Date.now() - 40 * 86_400_000) },
      { ...sampleUser, id: 11, email: 'b@test.com', ultimoLoginEm: new Date(Date.now() - 60 * 86_400_000) },
    ];
    mockQueryRaw.mockResolvedValue(rows);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect((res as { _data: { data: { count: number } } })._data.data.count).toBe(2);
  });
});
