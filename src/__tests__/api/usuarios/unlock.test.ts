jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; headers?: Record<string, string> }) => ({
      url,
      method: (init?.method ?? 'POST').toUpperCase(),
      headers: { get: (name: string) => (init?.headers ?? {})[name] ?? null },
      json: jest.fn().mockResolvedValue({}),
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
    usuario: {
      update: jest.fn(),
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

jest.mock('@/shared/lib/audit', () => ({
  AuditoriaService: {
    registrarAtualizacaoUsuario: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((fn: unknown) => fn),
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { POST } from '@/app/api/usuarios/[id]/unlock/route';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;
const mockQueryRaw = prisma.$queryRaw as jest.MockedFunction<typeof prisma.$queryRaw>;
const mockUpdate = prisma.usuario.update as jest.MockedFunction<typeof prisma.usuario.update>;

function makeReq(id = '5') {
  return new NextRequest(`http://localhost/api/usuarios/${id}/unlock`, { method: 'POST' });
}

const adminUser = { id: 1, email: 'admin@gladpros.com', role: 'ADMIN', empresaId: 1 };

describe('POST /api/usuarios/[id]/unlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(adminUser as never);
    mockCan.mockReturnValue(true);
  });

  it('retorna 401 quando não autenticado', async () => {
    mockRequireUser.mockRejectedValue(Object.assign(new Error('UNAUTHENTICATED'), { digest: 'NEXT_REDIRECT' }));
    await expect(POST(makeReq(), { params: Promise.resolve({ id: '5' }) })).rejects.toThrow('UNAUTHENTICATED');
  });

  it('retorna 403 quando sem permissão', async () => {
    mockCan.mockReturnValue(false);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
  });

  it('retorna 400 para ID inválido', async () => {
    const res = await POST(makeReq('abc'), { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando admin tenta desbloquear a própria conta', async () => {
    const res = await POST(makeReq('1'), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(400);
  });

  it('retorna 404 quando usuário não encontrado', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(404);
  });

  it('retorna 400 quando usuário não está bloqueado', async () => {
    mockQueryRaw.mockResolvedValue([
      { id: 5, email: 'user@gladpros.com', nomeCompleto: 'Usuário Teste', bloqueado: false, status: 'ATIVO' },
    ]);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando bloqueado = 0 (MySQL TINYINT)', async () => {
    mockQueryRaw.mockResolvedValue([
      { id: 5, email: 'user@gladpros.com', nomeCompleto: 'Usuário Teste', bloqueado: 0, status: 'ATIVO' },
    ]);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(400);
  });

  it('desbloqueia corretamente e retorna 200 (bloqueado = true)', async () => {
    mockQueryRaw.mockResolvedValue([
      { id: 5, email: 'user@gladpros.com', nomeCompleto: 'Usuário Bloqueado', bloqueado: true, status: 'ATIVO' },
    ]);
    mockUpdate.mockResolvedValue({ id: 5 } as never);

    const res = await POST(makeReq(), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ bloqueado: false, bloqueadoEm: null }),
      })
    );
  });

  it('desbloqueia corretamente e retorna 200 (bloqueado = 1, MySQL TINYINT)', async () => {
    mockQueryRaw.mockResolvedValue([
      { id: 5, email: 'user@gladpros.com', nomeCompleto: 'Usuário Bloqueado', bloqueado: 1, status: 'ATIVO' },
    ]);
    mockUpdate.mockResolvedValue({ id: 5 } as never);

    const res = await POST(makeReq(), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bloqueado: false, bloqueadoEm: null }),
      })
    );
  });
});
