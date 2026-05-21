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
 * Tests: GET + PATCH + DELETE /api/usuarios/[id]/route.ts
 *
 * Cobertura:
 *  - Auth (401 sem token)
 *  - RBAC (403 sem permissão)
 *  - ID inválido (400)
 *  - Not Found (404)
 *  - Last-Admin protection (400)
 *  - Happy paths (200)
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    worker: {
      findFirst: jest.fn(),
    },
    historicoSenha: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
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

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true }),
  },
}));

jest.mock('@/shared/lib/audit', () => ({
  AuditLogger: { log: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/lib/utils/retry', () => ({
  withRetry: jest.fn((fn: () => unknown) => fn()),
}));

jest.mock('@/shared/lib/usuario-query', () => ({
  getUsuarioColumns: jest
    .fn()
    .mockResolvedValue(
      new Set([
        'id', 'email', 'nomeCompleto', 'nivel', 'status', 'telefone',
        'dataNascimento', 'endereco1', 'endereco2', 'cidade', 'estado',
        'zipcode', 'cep', 'anotacoes', 'criadoEm', 'atualizadoEm',
        'ultimoLoginEm', 'avatarUrl', 'expiresAt',
      ]),
    ),
  buildUsuarioSelect: jest
    .fn()
    .mockResolvedValue('id, email, nomeCompleto, nivel, status'),
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
  getManageableRoles: jest
    .fn()
    .mockReturnValue(['GERENTE', 'USUARIO', 'FINANCEIRO', 'ESTOQUE', 'CLIENTE']),
}));

jest.mock('@/shared/lib/validation', () => ({
  userUpdateApiSchema: {
    safeParse: jest.fn().mockReturnValue({
      success: true,
      data: { nomeCompleto: 'John Smith Updated' },
    }),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
  compare: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../[id]/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { canManageRole } from '@/shared/lib/user-hierarchy';
import { userUpdateApiSchema } from '@/shared/lib/validation';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  id: 1,
  email: 'admin@gladpros.com',
  role: 'ADMIN',
  nivel: 'ADMIN',
  empresaId: 1,
};

const TARGET_USER = {
  id: 42,
  email: 'john.smith@example.com',
  nomeCompleto: 'John Smith',
  nivel: 'USUARIO',
  status: 'ATIVO',
};

const mockRequest = (
  method: string,
  body?: object,
  url = 'http://localhost/api/usuarios/42',
) =>
  new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

const mockContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

// Linha de DB normalizada que o SELECT retorna
const MOCK_DB_ROW = {
  id: 42,
  email: 'john.smith@example.com',
  nomeCompleto: 'John Smith',
  nivel: 'USUARIO',
  status: 'ATIVO',
  telefone: '(214)555-0100',
  cidade: 'Dallas',
  estado: 'TX',
  dataNascimento: null,
  nascimento: null,
  data_nascimento: null,
  birthdate: null,
  dob: null,
  endereco1: '123 Main St',
  endereco2: null,
  zipcode: '75201',
  cep: null,
  anotacoes: null,
  ultimoLoginEm: null,
  criadoEm: new Date('2025-01-15T10:00:00Z'),
  atualizadoEm: new Date('2025-01-15T10:00:00Z'),
  avatarUrl: null,
  expiresAt: null,
};

// ─── GET /api/usuarios/[id] ───────────────────────────────────────────────────

describe('GET /api/usuarios/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
    (can as jest.Mock).mockReturnValue(true);
    // SELECT retorna usuário e worker = null
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([MOCK_DB_ROW]);
    (prisma.worker.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it('retorna 401 quando requireUser lança erro de autenticação', async () => {
    const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
    (requireUser as jest.Mock).mockRejectedValueOnce(authError);

    const res = await GET(mockRequest('GET'), mockContext('42'));

    expect(res.status).toBe(401);
  });

  it('retorna 400 para ID inválido (zero ou NaN)', async () => {
    const res = await GET(mockRequest('GET', undefined, 'http://localhost/api/usuarios/0'), mockContext('0'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('INVALID_ID');
  });

  it('retorna 403 quando usuário não é self e não tem permissão read', async () => {
    (requireUser as jest.Mock).mockResolvedValueOnce({ ...ADMIN_USER, id: 99, role: 'USUARIO' });
    (can as jest.Mock).mockReturnValueOnce(false); // sem read permission

    const res = await GET(mockRequest('GET'), mockContext('42'));

    expect(res.status).toBe(403);
  });

  it('retorna 404 quando usuário não existe', async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]); // nenhum resultado

    const res = await GET(mockRequest('GET'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
  });

  it('retorna dados do usuário normalizado no happy path', async () => {
    const res = await GET(mockRequest('GET'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(42);
    expect(body.email).toBe('john.smith@example.com');
    expect(body.nomeCompleto).toBe('John Smith');
  });

  it('inclui workerId quando existe worker vinculado', async () => {
    (prisma.worker.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 7,
      name: 'John Smith',
      classification: 'CONTRACTOR_1099',
    });

    const res = await GET(mockRequest('GET'), mockContext('42'));
    const body = await res.json();

    expect(body.workerId).toBe(7);
    expect(body.worker).toMatchObject({ id: 7, classification: 'CONTRACTOR_1099' });
  });

  it('usuário pode visualizar o próprio perfil mesmo sem permissão read', async () => {
    (requireUser as jest.Mock).mockResolvedValueOnce({ ...ADMIN_USER, id: 42, role: 'USUARIO' });
    (can as jest.Mock).mockReturnValueOnce(false); // sem permissão genérica

    const res = await GET(mockRequest('GET'), mockContext('42'));

    expect(res.status).toBe(200);
  });
});

// ─── PATCH /api/usuarios/[id] ─────────────────────────────────────────────────

describe('PATCH /api/usuarios/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mockReset limpa o queue de specificMockImpls que clearAllMocks NÃO limpa.
    // GET test 7 define mockReturnValueOnce(false) em can mas nunca o consome
    // (handler faz short-circuit no self-edit antes de chamar can()).
    // Esse valor fica no queue e vaza para os testes PATCH — causando 403 em vez de 404.
    (can as jest.Mock).mockReset();
    (prisma.$queryRaw as jest.Mock).mockReset();
    (prisma.$queryRawUnsafe as jest.Mock).mockReset();
    (prisma.$executeRawUnsafe as jest.Mock).mockReset();

    (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
    (can as jest.Mock).mockReturnValue(true);
    (canManageRole as jest.Mock).mockReturnValue(true);
    // getTargetUserRole: $queryRaw retorna role do target (persistente, não Once)
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ nivel: 'USUARIO' }]);
    // SELECT antes e depois da atualização
    (prisma.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce([MOCK_DB_ROW]) // before
      .mockResolvedValueOnce([{ ...MOCK_DB_ROW, nomeCompleto: 'John Smith Updated' }]); // after
    (prisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(1);
    (userUpdateApiSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: { nomeCompleto: 'John Smith Updated' },
    });
  });

  it('retorna 401 quando requireUser lança erro de autenticação', async () => {
    const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
    (requireUser as jest.Mock).mockRejectedValueOnce(authError);

    const res = await PATCH(
      mockRequest('PATCH', { nomeCompleto: 'Updated' }),
      mockContext('42'),
    );

    expect(res.status).toBe(401);
  });

  it('retorna 400 para ID inválido', async () => {
    const res = await PATCH(
      mockRequest('PATCH', { nomeCompleto: 'X' }, 'http://localhost/api/usuarios/abc'),
      mockContext('abc'),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('INVALID_ID');
  });

  it('retorna 403 quando não é self e não tem permissão update', async () => {
    (requireUser as jest.Mock).mockResolvedValueOnce({ ...ADMIN_USER, id: 99, role: 'USUARIO' });
    (can as jest.Mock).mockReturnValueOnce(false);

    const res = await PATCH(
      mockRequest('PATCH', { nomeCompleto: 'X' }),
      mockContext('42'),
    );

    expect(res.status).toBe(403);
  });

  it('retorna 404 quando target não existe (getTargetUserRole retorna null)', async () => {
    // Explicit guards against cross-test mock pollution
    (requireUser as jest.Mock).mockResolvedValueOnce(ADMIN_USER);
    (can as jest.Mock).mockReturnValue(true);
    (canManageRole as jest.Mock).mockReturnValue(true);
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]); // nivel not found

    const res = await PATCH(
      mockRequest('PATCH', { nomeCompleto: 'X' }),
      mockContext('42'),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
  });

  it('retorna 400 ao tentar validação inválida', async () => {
    (userUpdateApiSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: false,
      error: {
        issues: [{ path: ['email'], message: 'Email inválido' }],
        flatten: () => ({ fieldErrors: { email: ['Email inválido'] } }),
      },
    });

    const res = await PATCH(
      mockRequest('PATCH', { email: 'not-an-email' }),
      mockContext('42'),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.fields).toHaveProperty('email');
  });

  it('retorna 400 ao tentar rebaixar o último ADMIN ativo', async () => {
    // Target é ADMIN
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ nivel: 'ADMIN' }]) // getTargetUserRole
      .mockResolvedValueOnce([{ cnt: 0 }]); // countActiveAdmins: nenhum outro ADMIN

    (userUpdateApiSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { role: 'GERENTE' }, // tentando rebaixar
    });

    const res = await PATCH(
      mockRequest('PATCH', { role: 'GERENTE' }),
      mockContext('42'), // id=42 != authUser.id=1, sem self-edit (que removeria o campo role)
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('LAST_ADMIN');
  });

  it('retorna { data: { id }, success: true } no happy path', async () => {
    const res = await PATCH(
      mockRequest('PATCH', { nomeCompleto: 'John Smith Updated' }),
      mockContext('42'),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('id', 42);
  });
});

// ─── DELETE /api/usuarios/[id] ────────────────────────────────────────────────

describe('DELETE /api/usuarios/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mockReset limpa queue residual de $queryRaw que pode vazar do describe PATCH
    (prisma.$queryRaw as jest.Mock).mockReset();
    (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
    (can as jest.Mock).mockReturnValue(true);
    (canManageRole as jest.Mock).mockReturnValue(true);
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(TARGET_USER);
    (prisma.usuario.update as jest.Mock).mockResolvedValue({ ...TARGET_USER, status: 'INATIVO' });
    // countActiveAdmins via $queryRaw
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ cnt: 2 }]);
  });

  it('retorna 401 quando requireUser lança erro de autenticação', async () => {
    const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
    (requireUser as jest.Mock).mockRejectedValueOnce(authError);

    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));

    expect(res.status).toBe(401);
  });

  it('retorna 403 sem permissão delete', async () => {
    (can as jest.Mock).mockReturnValueOnce(false);

    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('retorna 400 ao tentar deletar a própria conta (self-delete)', async () => {
    // authUser.id === target id
    const res = await DELETE(
      mockRequest('DELETE', undefined, 'http://localhost/api/usuarios/1'),
      mockContext('1'),
    );

    expect(res.status).toBe(400);
  });

  it('retorna 404 quando usuário não existe', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
  });

  it('retorna 400 ao tentar desativar o último ADMIN ativo', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({
      ...TARGET_USER,
      nivel: 'ADMIN',
    });
    // Nenhum outro ADMIN ativo além do target
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ cnt: 0 }]);

    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('LAST_ADMIN');
  });

  it('retorna { data: null, success: true } no soft-delete bem-sucedido', async () => {
    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeNull();
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 42 } }),
    );
  });

  it('retorna success:true idempotente quando usuário já está INATIVO', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({
      ...TARGET_USER,
      status: 'INATIVO',
    });

    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // não deve chamar update pois já estava inativo
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });
});
