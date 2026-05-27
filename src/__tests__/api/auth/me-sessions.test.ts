import { GET } from '../../../app/api/auth/me/sessions/route';
import { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      headers: new Map<string, string>(),
      cookies: { set: jest.fn() },
    })),
  },
}));

jest.mock('../../../shared/lib/rbac', () => ({
  requireUser: jest.fn().mockResolvedValue({ id: '10', empresaId: 1, role: 'USUARIO' }),
}));

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    auditLog: { create: jest.fn() },
  },
}));

describe('GET /api/auth/me/sessions', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      url: 'http://localhost/api/auth/me/sessions?page=2&pageSize=10',
      cookies: {
        get: jest.fn().mockReturnValue({ value: 'current-token' }),
      },
    } as unknown as NextRequest;

    require('../../../lib/prisma')
      .prisma.$queryRaw.mockResolvedValueOnce([{ total: 23 }])
      .mockResolvedValueOnce([
        {
          id: 1,
          ip: '127.0.0.1',
          userAgent: 'Jest',
          cidade: 'Dallas',
          pais: 'US',
          ultimaAtividade: new Date('2025-01-01T10:00:00Z'),
          criadoEm: new Date('2025-01-01T09:00:00Z'),
          token: 'current-token',
        },
      ]);
  });

  it('retorna 200 com paginação e sessão atual marcada', async () => {
    const response = await GET(mockRequest);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 23,
      totalPages: 3,
    });
    expect(data.data).toHaveLength(1);
    expect(data.data[0].isCurrent).toBe(true);
  });

  it('aplica limite máximo de pageSize=100', async () => {
    mockRequest = {
      ...mockRequest,
      url: 'http://localhost/api/auth/me/sessions?page=1&pageSize=999',
    } as unknown as NextRequest;

    const response = await GET(mockRequest);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.pagination.pageSize).toBe(100);
  });
});
