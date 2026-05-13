jest.mock('@/lib/prisma', () => ({
  prisma: {
    materialSaldo: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    equipamento: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  successResponse: jest.fn().mockImplementation((data: unknown, _message?: string, status = 200) => Response.json({ data, success: true }, { status })),
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => handler),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  createLogContext: jest.fn().mockReturnValue({}),
  forbiddenResponse: jest.fn().mockImplementation((message: string) => Response.json({ error: 'Forbidden', message, success: false }, { status: 403 })),
  getSearchParams: jest.fn().mockImplementation((request: Request) => {
    const params = new URL(request.url).searchParams;
    return { filters: Object.fromEntries(params.entries()) };
  }),
}));

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';

const { Request, Response, Headers } = require('node-fetch');
Object.assign(global, { Request, Response, Headers });
if (typeof Response.json !== 'function') {
  Response.json = (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

describe('Estoque inventory pagination hardening', () => {
  const requireUserMock = requireUser as jest.Mock;
  const canMock = can as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: 1, role: 'ESTOQUE', empresaId: 1 });
    canMock.mockReturnValue(true);
  });

  it('paginates inventory snapshot instead of returning all stock balances', async () => {
    (prisma.materialSaldo.count as jest.Mock).mockResolvedValue(125);
    (prisma.materialSaldo.findMany as jest.Mock).mockResolvedValue([]);

    const { GET } = await import('../inventario/route');
    const response = await GET(new Request('http://localhost/api/estoque/inventario?page=2&pageSize=25'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.materialSaldo.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 25,
      skip: 25,
    }));
    expect(body.pagination).toEqual({ page: 2, pageSize: 25, total: 125, totalPages: 5 });
  });

  it('caps inventory snapshot page size at 100 items', async () => {
    (prisma.materialSaldo.count as jest.Mock).mockResolvedValue(1000);
    (prisma.materialSaldo.findMany as jest.Mock).mockResolvedValue([]);

    const { GET } = await import('../inventario/route');
    await GET(new Request('http://localhost/api/estoque/inventario?pageSize=999'));

    expect(prisma.materialSaldo.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 100,
      skip: 0,
    }));
  });

  it('paginates inventory report material and equipment detail lists', async () => {
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 250 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        total_materiais: 0,
        total_equipamentos: 0,
        total_localizacoes_com_estoque: 0,
        quantidade_total_materiais: 0,
        materiais_abaixo_minimo: 0,
        equipamentos_disponiveis: 0,
        equipamentos_em_uso: 0,
      }]);
    (prisma.equipamento.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.equipamento.count as jest.Mock).mockResolvedValue(80);
    (prisma.equipamento.groupBy as jest.Mock).mockResolvedValue([]);

    const { GET } = await import('../relatorios/inventario/route');
    const response = await GET(new Request('http://localhost/api/estoque/relatorios/inventario?page=3&pageSize=25'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.equipamento.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 25,
      skip: 50,
    }));
    expect((prisma.$queryRaw as jest.Mock).mock.calls[0]).toEqual(expect.arrayContaining([25, 50]));
    expect(body.data.relatorio.pagination).toEqual({
      page: 3,
      pageSize: 25,
      materiais: { total: 250, totalPages: 10 },
      equipamentos: { total: 80, totalPages: 4 },
    });
  });
});
