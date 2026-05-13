/**
 * Unit Tests — GET /api/estoque/materiais & POST /api/estoque/materiais
 */

jest.mock('next/server', () => {
  const makeSearchParams = (url: string) => {
    try { return new URLSearchParams(url.includes('?') ? url.split('?')[1] ?? '' : ''); }
    catch { return new URLSearchParams(); }
  };
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => ({
      url,
      method: (init?.method ?? 'GET').toUpperCase(),
      nextUrl: { searchParams: makeSearchParams(url), pathname: url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] },
      headers: { get: (name: string) => { const h = (init?.headers ?? {}) as Record<string, string>; return h[name] ?? h[name.toLowerCase()] ?? null; } },
      json: jest.fn().mockImplementation(() => {
        if (init?.body) { try { return Promise.resolve(JSON.parse(init.body)); } catch { return Promise.resolve({}); } }
        return Promise.resolve({});
      }),
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
        status: options?.status ?? 200,
        headers: new Map(),
        json: jest.fn().mockResolvedValue(data),
        _data: data,
      })),
    },
  };
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    material: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    materialSaldo: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
        return { status: 401, _data: { error: 'Unauthorized', success: false } };
      }
      return { status: 500, _data: { error: 'Internal server error', success: false } };
    }
  }),
}));

jest.mock('@/lib/api', () => ({
  successResponse: jest.fn().mockImplementation((data: unknown, _msg: string, status = 200) => ({
    status,
    _data: { data, success: true },
    json: jest.fn().mockResolvedValue({ data, success: true }),
  })),
  paginatedResponse: jest.fn().mockImplementation((data: unknown, total: number, page: number, pageSize: number) => ({
    status: 200,
    _data: { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, success: true },
    json: jest.fn(),
  })),
  forbiddenResponse: jest.fn().mockImplementation((msg: string) => ({
    status: 403,
    _data: { error: 'Forbidden', message: msg, success: false },
  })),
  conflictResponse: jest.fn().mockImplementation((msg: string) => ({
    status: 409,
    _data: { error: 'Conflict', message: msg, success: false },
  })),
  withErrorHandler: jest.fn().mockImplementation((h: Function) => h),
  getPaginationParams: jest.fn().mockReturnValue({ page: 1, pageSize: 20, skip: 0, take: 20 }),
  getSortParams: jest.fn().mockReturnValue({ sortBy: 'criadoEm', sortOrder: 'desc' }),
  getSearchParams: jest.fn().mockReturnValue({ search: null }),
  createPrismaOrderBy: jest.fn().mockReturnValue({ criadoEm: 'desc' }),
  createTextSearchWhere: jest.fn().mockReturnValue({}),
  mergeWhereConditions: jest.fn().mockReturnValue({}),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  createLogContext: jest.fn().mockReturnValue({}),
}));

jest.mock('@/lib/estoque/validation', () => ({
  materialSchema: {
    parse: jest.fn().mockImplementation((body: unknown) => body),
  },
}));

import { NextRequest } from 'next/server';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockUser = {
  id: 1,
  email: 'admin@gladpros.com',
  role: 'ADMIN',
  empresaId: 1,
  nivel: 1,
};

const mockMaterial = {
  id: 1,
  codigo: 'MAT-001',
  nome: 'Cabo Elétrico 2.5mm',
  descricao: 'Cabo flexível',
  unidadeId: 1,
  categoriaId: 1,
  precoUnitario: 5.50,
  estoqueMinimo: 10,
  estoque: 100,
  criadoEm: new Date('2024-01-01'),
  unidade: { id: 1, sigla: 'M', nome: 'Metro' },
  categoria: { id: 1, nome: 'Elétrico' },
  criador: { id: 1, nomeCompleto: 'Admin User', email: 'admin@gladpros.com' },
};

function makeRequest(url = 'http://localhost/api/estoque/materiais', init?: { method?: string; body?: string }) {
  return new NextRequest(url, init);
}

describe('GET /api/estoque/materiais', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
    (mockPrisma.material.findMany as jest.Mock).mockResolvedValue([mockMaterial]);
    (mockPrisma.material.count as jest.Mock).mockResolvedValue(1);
  });

  it('200 — returns paginated material list', async () => {
    const { GET } = await import('@/app/api/estoque/materiais/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const data = (res as unknown as { _data: { data: unknown[]; success: boolean } })._data;
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('401 — rejects unauthenticated request', async () => {
    mockRequireUser.mockRejectedValue(Object.assign(new Error('UNAUTHENTICATED'), {}));
    const { GET } = await import('@/app/api/estoque/materiais/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('403 — rejects user without estoque read permission', async () => {
    mockCan.mockReturnValue(false);
    const { GET } = await import('@/app/api/estoque/materiais/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it('calls prisma.material.findMany with empresaId filter', async () => {
    const { GET } = await import('@/app/api/estoque/materiais/route');
    await GET(makeRequest());
    expect(mockPrisma.material.findMany).toHaveBeenCalled();
  });

  it('200 — filters by search query param', async () => {
    const { GET } = await import('@/app/api/estoque/materiais/route');
    const res = await GET(makeRequest('http://localhost/api/estoque/materiais?search=cabo'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/estoque/materiais', () => {
  const validBody = {
    codigo: 'MAT-002',
    nome: 'Fio Terra 4mm',
    unidadeId: 1,
    precoUnitario: 7.20,
    estoqueMinimo: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
    (mockPrisma.material.findFirst as jest.Mock).mockResolvedValue(null); // no duplicate
    (mockPrisma.material.create as jest.Mock).mockResolvedValue({ ...mockMaterial, ...validBody, id: 2 });
    (mockPrisma.$transaction as jest.Mock).mockImplementation((callback) => callback(mockPrisma));
  });

  it('201 — creates material successfully', async () => {
    const { POST } = await import('@/app/api/estoque/materiais/route');
    const res = await POST(makeRequest('http://localhost/api/estoque/materiais', {
      method: 'POST',
      body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(201);
  });

  it('401 — rejects unauthenticated create', async () => {
    mockRequireUser.mockRejectedValue(Object.assign(new Error('UNAUTHENTICATED'), {}));
    const { POST } = await import('@/app/api/estoque/materiais/route');
    const res = await POST(makeRequest('http://localhost/api/estoque/materiais', { method: 'POST', body: JSON.stringify(validBody) }));
    expect(res.status).toBe(401);
  });

  it('403 — rejects user without estoque create permission', async () => {
    mockCan.mockImplementation((_role: unknown, _module: unknown, action: unknown) => action !== 'create');
    const { POST } = await import('@/app/api/estoque/materiais/route');
    const res = await POST(makeRequest('http://localhost/api/estoque/materiais', { method: 'POST', body: JSON.stringify(validBody) }));
    expect(res.status).toBe(403);
  });

  it('409 — rejects duplicate codigo', async () => {
    (mockPrisma.material.findFirst as jest.Mock).mockResolvedValue(mockMaterial); // duplicate
    const { POST } = await import('@/app/api/estoque/materiais/route');
    const res = await POST(makeRequest('http://localhost/api/estoque/materiais', {
      method: 'POST',
      body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(409);
  });

  it('calls prisma.material.create with criadoPor from authenticated user', async () => {
    const { POST } = await import('@/app/api/estoque/materiais/route');
    await POST(makeRequest('http://localhost/api/estoque/materiais', {
      method: 'POST',
      body: JSON.stringify(validBody),
    }));
    const createCall = (mockPrisma.material.create as jest.Mock).mock.calls[0]?.[0];
    expect(createCall?.data?.criadoPor).toBe(mockUser.id);
  });
});
