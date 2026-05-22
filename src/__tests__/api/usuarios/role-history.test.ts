jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; headers?: Record<string, string> }) => ({
      url,
      method: (init?.method ?? 'GET').toUpperCase(),
      headers: { get: (name: string) => { const h = (init?.headers ?? {}) as Record<string, string>; return h[name] ?? h[name.toLowerCase()] ?? null; } },
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
        status: options?.status ?? 200,
        json: jest.fn().mockResolvedValue(data),
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

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((fn: unknown) => fn),
}));

// Mock do helper de acesso — checkUserManagementAccess
jest.mock('@/app/api/usuarios/_helpers/access', () => ({
  checkUserManagementAccess: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { checkUserManagementAccess } from '@/app/api/usuarios/_helpers/access';
import { GET } from '@/app/api/usuarios/[id]/role-history/route';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCheckAccess = checkUserManagementAccess as jest.MockedFunction<typeof checkUserManagementAccess>;
const mockQueryRaw = prisma.$queryRaw as jest.MockedFunction<typeof prisma.$queryRaw>;

const adminUser = { id: 1, email: 'admin@gladpros.com', role: 'ADMIN', empresaId: 1 };

function accessAllowed() {
  mockCheckAccess.mockResolvedValue({ allowed: true } as never);
}

function accessDenied(status = 403) {
  mockCheckAccess.mockResolvedValue({
    allowed: false,
    response: { status, _data: { error: 'Forbidden', success: false } } as never,
  } as never);
}

function makeReq(id = '5') {
  return new NextRequest(`http://localhost/api/usuarios/${id}/role-history`, { method: 'GET' });
}

describe('GET /api/usuarios/[id]/role-history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(adminUser as never);
    accessAllowed();
  });

  it('retorna 401 quando não autenticado', async () => {
    mockRequireUser.mockRejectedValue(Object.assign(new Error('UNAUTHENTICATED'), { digest: 'NEXT_REDIRECT' }));
    await expect(GET(makeReq(), { params: Promise.resolve({ id: '5' }) })).rejects.toThrow('UNAUTHENTICATED');
  });

  it('retorna 403 quando acesso negado', async () => {
    accessDenied(403);
    const res = await GET(makeReq(), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
  });

  it('retorna 400 para ID inválido', async () => {
    const res = await GET(makeReq('abc'), { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });

  it('retorna lista vazia quando não há mudanças de role', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const res = await GET(makeReq(), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });

  it('filtra entradas sem mudança de nivel', async () => {
    // before.nivel === after.nivel — deve ser ignorado
    const row = {
      id: 1,
      acao: 'UPDATE',
      usuarioId: 1,
      payload: JSON.stringify({
        action: 'UPDATE_USER',
        status: 'SUCCESS',
        before: { nivel: 'USUARIO', nomeCompleto: 'João' },
        after:  { nivel: 'USUARIO', nomeCompleto: 'João Silva' },
      }),
      criadoEm: new Date('2024-01-10T10:00:00Z'),
      nomeCompleto: 'Admin',
      email: 'admin@gladpros.com',
    };
    mockQueryRaw.mockResolvedValue([row]);
    const res = await GET(makeReq(), { params: Promise.resolve({ id: '5' }) });
    const data = await res.json();
    expect(data.data).toHaveLength(0);
  });

  it('retorna mudança de role quando nivel difere', async () => {
    const row = {
      id: 10,
      acao: 'UPDATE',
      usuarioId: 1,
      payload: JSON.stringify({
        action: 'UPDATE_USER',
        status: 'SUCCESS',
        before: { nivel: 'USUARIO' },
        after:  { nivel: 'GERENTE' },
      }),
      criadoEm: new Date('2024-03-15T14:30:00Z'),
      nomeCompleto: 'Admin GladPros',
      email: 'admin@gladpros.com',
    };
    mockQueryRaw.mockResolvedValue([row]);
    const res = await GET(makeReq(), { params: Promise.resolve({ id: '5' }) });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].de).toBe('USUARIO');
    expect(data.data[0].para).toBe('GERENTE');
    expect(data.data[0].changedBy.nomeCompleto).toBe('Admin GladPros');
  });

  it('lida com payload nulo (sem mudança mostrada)', async () => {
    const row = {
      id: 2,
      acao: 'UPDATE',
      usuarioId: null,
      payload: null,
      criadoEm: new Date(),
      nomeCompleto: null,
      email: null,
    };
    mockQueryRaw.mockResolvedValue([row]);
    const res = await GET(makeReq(), { params: Promise.resolve({ id: '5' }) });
    const data = await res.json();
    expect(data.data).toHaveLength(0);
  });

  it('lida com payload JSON inválido sem quebrar', async () => {
    const row = {
      id: 3,
      acao: 'UPDATE',
      usuarioId: 1,
      payload: '{invalid json',
      criadoEm: new Date(),
      nomeCompleto: 'Admin',
      email: 'admin@gladpros.com',
    };
    mockQueryRaw.mockResolvedValue([row]);
    const res = await GET(makeReq(), { params: Promise.resolve({ id: '5' }) });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(0);
  });

  it('retorna múltiplas mudanças em ordem decrescente', async () => {
    const rows = [
      {
        id: 20,
        acao: 'UPDATE',
        usuarioId: 1,
        payload: JSON.stringify({ before: { nivel: 'GERENTE' }, after: { nivel: 'ADMIN' } }),
        criadoEm: new Date('2024-06-01T12:00:00Z'),
        nomeCompleto: 'Super Admin',
        email: 'super@gladpros.com',
      },
      {
        id: 15,
        acao: 'UPDATE',
        usuarioId: 1,
        payload: JSON.stringify({ before: { nivel: 'USUARIO' }, after: { nivel: 'GERENTE' } }),
        criadoEm: new Date('2024-04-10T09:00:00Z'),
        nomeCompleto: 'Admin GladPros',
        email: 'admin@gladpros.com',
      },
    ];
    mockQueryRaw.mockResolvedValue(rows);
    const res = await GET(makeReq(), { params: Promise.resolve({ id: '5' }) });
    const data = await res.json();
    expect(data.data).toHaveLength(2);
    expect(data.data[0].para).toBe('ADMIN');
    expect(data.data[1].para).toBe('GERENTE');
  });

  it('usa email como fallback quando nomeCompleto é null', async () => {
    const row = {
      id: 5,
      acao: 'UPDATE',
      usuarioId: 1,
      payload: JSON.stringify({ before: { nivel: 'USUARIO' }, after: { nivel: 'FINANCEIRO' } }),
      criadoEm: new Date('2024-05-01T00:00:00Z'),
      nomeCompleto: null,
      email: 'admin@gladpros.com',
    };
    mockQueryRaw.mockResolvedValue([row]);
    const res = await GET(makeReq(), { params: Promise.resolve({ id: '5' }) });
    const data = await res.json();
    expect(data.data[0].changedBy.nomeCompleto).toBe('admin@gladpros.com');
  });
});
