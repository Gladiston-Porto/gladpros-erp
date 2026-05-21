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
      json: jest.fn().mockImplementation(() => { if (init?.body) { try { return Promise.resolve(JSON.parse(init.body)); } catch { return Promise.resolve({}); } } return Promise.resolve({}); }),
      text: jest.fn().mockResolvedValue(init?.body ?? ''),
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
        status: options?.status ?? 200,
        headers: new Map(),
        cookies: { set: jest.fn(), get: jest.fn(), delete: jest.fn() },
        json: jest.fn().mockResolvedValue(data),
      })),
    },
  };
});

/**
 * Tests: PUT /api/usuarios/[id]/toggle-status/route.ts
 *
 * Cobertura:
 *  - Auth (401)
 *  - RBAC (403 sem permissão update)
 *  - ID inválido (400)
 *  - Usuário não encontrado (404)
 *  - Bloqueio de auto-desativação (400)
 *  - Bloqueio de desativar último ADMIN (400)
 *  - Toggle ATIVO → INATIVO com tokenVersion increment
 *  - Toggle INATIVO → ATIVO sem tokenVersion increment
 *  - Bloqueio de hierarquia (403 quando não pode gerenciar role)
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler:
    (fn: (...a: unknown[]) => unknown) =>
    async (...args: unknown[]) => {
      try {
        return await fn(...args);
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        const status = err?.status === 401 ? 401 : 500;
        const { NextResponse } = require('next/server');
        return NextResponse.json(
          { error: err?.message ?? 'Internal Server Error', success: false },
          { status },
        );
      }
    },
}));

jest.mock('@/shared/lib/audit', () => ({
  AuditLogger: { log: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/shared/lib/user-hierarchy', () => ({
  UserRole: {
    ADMIN: 'ADMIN',
    GERENTE: 'GERENTE',
    USUARIO: 'USUARIO',
    FINANCEIRO: 'FINANCEIRO',
    ESTOQUE: 'ESTOQUE',
    CLIENTE: 'CLIENTE',
  },
  canManageRole: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { PUT } from '../[id]/toggle-status/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { canManageRole } from '@/shared/lib/user-hierarchy';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  id: 1,
  email: 'admin@gladpros.com',
  role: 'ADMIN',
  nivel: 'ADMIN',
  empresaId: 1,
};

const TARGET_ATIVO = {
  id: 42,
  email: 'john.smith@example.com',
  status: 'ATIVO',
  nivel: 'USUARIO',
};

const TARGET_INATIVO = {
  id: 42,
  email: 'john.smith@example.com',
  status: 'INATIVO',
  nivel: 'USUARIO',
};

const mockRequest = (id: string = '42') =>
  new NextRequest(`http://localhost/api/usuarios/${id}/toggle-status`, {
    method: 'PUT',
  });

const mockContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('PUT /api/usuarios/[id]/toggle-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
    (can as jest.Mock).mockReturnValue(true);
    (canManageRole as jest.Mock).mockReturnValue(true);
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(TARGET_ATIVO);
    (prisma.usuario.update as jest.Mock).mockResolvedValue({ id: 42, status: 'INATIVO' });
    // Dead-man check: há outros ADMINs ativos
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ cnt: 2 }]);
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  it('retorna 401 quando requireUser lança erro de autenticação', async () => {
    const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
    (requireUser as jest.Mock).mockRejectedValueOnce(authError);

    const res = await PUT(mockRequest(), mockContext('42'));

    expect(res.status).toBe(401);
  });

  // ── RBAC ────────────────────────────────────────────────────────────────────

  it('retorna 403 quando can() retorna false para update', async () => {
    (can as jest.Mock).mockReturnValueOnce(false);

    const res = await PUT(mockRequest(), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Forbidden');
  });

  it('retorna 403 quando role do requestor não pode gerenciar role do target', async () => {
    // GERENTE tentando alterar outro GERENTE (mesma hierarquia)
    (requireUser as jest.Mock).mockResolvedValueOnce({
      ...ADMIN_USER,
      role: 'GERENTE',
      nivel: 'GERENTE',
    });
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({
      ...TARGET_ATIVO,
      nivel: 'GERENTE',
    });
    (canManageRole as jest.Mock).mockReturnValueOnce(false); // hierarquia bloqueia

    const res = await PUT(mockRequest(), mockContext('42'));

    expect(res.status).toBe(403);
  });

  // ── Validação de ID ─────────────────────────────────────────────────────────

  it('retorna 400 para ID inválido (NaN)', async () => {
    const res = await PUT(
      mockRequest('abc'),
      mockContext('abc'),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toContain('inválido');
  });

  // ── Not Found ───────────────────────────────────────────────────────────────

  it('retorna 404 quando usuário não existe', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const res = await PUT(mockRequest(), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Not Found');
  });

  // ── Proteção self-deactivation ───────────────────────────────────────────────

  it('retorna 400 ao tentar desativar a própria conta', async () => {
    // authUser.id === target.id
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({
      ...TARGET_ATIVO,
      id: 1, // mesmo ID do ADMIN_USER
    });

    const res = await PUT(
      mockRequest('1'),
      mockContext('1'),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain('própria conta');
  });

  // ── Dead-man ADMIN ──────────────────────────────────────────────────────────

  it('retorna 400 ao tentar desativar o último ADMIN ativo', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({
      ...TARGET_ATIVO,
      nivel: 'ADMIN',
    });
    // $queryRaw retorna 0 outros ADMINs ativos
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ cnt: 0 }]);

    const res = await PUT(mockRequest(), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain('último ADMIN');
  });

  // ── Toggle ATIVO → INATIVO ──────────────────────────────────────────────────

  it('toggle ATIVO→INATIVO retorna status INATIVO e incrementa tokenVersion', async () => {
    (prisma.usuario.update as jest.Mock).mockResolvedValueOnce({
      id: 42,
      status: 'INATIVO',
    });

    const res = await PUT(mockRequest(), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ status: 'INATIVO' });

    // tokenVersion deve ser incrementado ao desativar
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'INATIVO',
          tokenVersion: { increment: 1 },
        }),
      }),
    );
  });

  // ── Toggle INATIVO → ATIVO ──────────────────────────────────────────────────

  it('toggle INATIVO→ATIVO retorna status ATIVO sem incrementar tokenVersion', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce(TARGET_INATIVO);
    (prisma.usuario.update as jest.Mock).mockResolvedValueOnce({
      id: 42,
      status: 'ATIVO',
    });

    const res = await PUT(mockRequest(), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ status: 'ATIVO' });

    // tokenVersion NÃO deve ser alterado ao reativar
    const updateCall = (prisma.usuario.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('tokenVersion');
  });

  // ── Auditoria ───────────────────────────────────────────────────────────────

  it('registra auditoria após o toggle', async () => {
    const { AuditLogger } = require('@/shared/lib/audit');

    await PUT(mockRequest(), mockContext('42'));

    expect(AuditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE_USER',
        resource: 'Usuario',
        resourceId: '42',
        status: 'SUCCESS',
      }),
    );
  });

  // ── Dead-man ADMIN ativo com outros ADMINs ───────────────────────────────────

  it('permite desativar ADMIN quando há outros ADMINs ativos', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({
      ...TARGET_ATIVO,
      nivel: 'ADMIN',
    });
    // Há 2 outros ADMINs ativos
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ cnt: 2 }]);

    const res = await PUT(mockRequest(), mockContext('42'));

    expect(res.status).toBe(200);
  });
});
