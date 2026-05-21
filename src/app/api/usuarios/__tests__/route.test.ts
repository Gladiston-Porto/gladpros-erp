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
 * Tests: GET + POST /api/usuarios/route.ts
 *
 * Cobertura:
 *  - Auth (401 sem token)
 *  - RBAC (403 sem permissão)
 *  - Payload inválido (400)
 *  - Happy path (200 / 201)
 *  - Email duplicado (409)
 *  - GERENTE sem roles gerenciáveis (403)
 */

// ─── Mocks (hoisted pelo Jest antes dos imports) ──────────────────────────────

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
      create: jest.fn(),
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

// withErrorHandler real: captura erros para retornar status HTTP correto
jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler:
    (fn: (...a: unknown[]) => unknown) =>
    async (...args: unknown[]) => {
      try {
        return await fn(...args);
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        const status =
          err?.status === 401 || err?.message === 'UNAUTHENTICATED' ? 401 : 500;
        const { NextResponse } = require('next/server');
        return NextResponse.json(
          { error: err?.message ?? 'Internal Server Error', success: false },
          { status },
        );
      }
    },
}));

jest.mock('@/shared/lib/cache/business-cache', () => ({
  withBusinessCache: jest.fn((_key: string, factory: () => Promise<unknown>) => factory()),
}));

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true }),
  },
}));

jest.mock('@/shared/lib/audit', () => ({
  AuditLogger: { log: jest.fn().mockResolvedValue(undefined) },
}));

// withRetry: passa direto para a função original
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
        'primeiroAcesso', 'senhaProvisoria', 'expiresAt', 'bloqueado',
        'ultimoLoginEm', 'avatarUrl',
      ]),
    ),
  buildUsuarioSelect: jest.fn().mockResolvedValue('id, email, nomeCompleto, nivel, status'),
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

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashed_password'),
  compare: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/shared/lib/passwords', () => ({
  generateTempPassword: jest.fn().mockReturnValue('TempPass123!'),
}));

jest.mock('@/shared/lib/emails/welcome', () => ({
  renderWelcomeEmail: jest
    .fn()
    .mockReturnValue({ subject: 'Welcome to GladPros', html: '<p>Welcome</p>' }),
}));

jest.mock('@/shared/lib/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/shared/lib/jwt', () => ({
  signFirstAccessJWT: jest.fn().mockResolvedValue('magic_token_abc123'),
}));

jest.mock('@/lib/api/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── Imports (depois dos mocks) ───────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { getManageableRoles } from '@/shared/lib/user-hierarchy';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  id: 1,
  email: 'admin@gladpros.com',
  role: 'ADMIN',
  nivel: 'ADMIN',
  empresaId: 1,
};

const mockGetRequest = (params = '') =>
  new NextRequest(`http://localhost/api/usuarios${params ? `?${params}` : ''}`);

const mockPostRequest = (body: object) =>
  new NextRequest('http://localhost/api/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const MOCK_USER_ROW = {
  id: 42,
  email: 'john.smith@example.com',
  nomeCompleto: 'John Smith',
  nivel: 'USUARIO',
  status: 'ATIVO',
  telefone: '(214)555-0100',
  cidade: 'Dallas',
  estado: 'TX',
  ultimoLoginEm: null,
  criadoEm: new Date('2025-01-15T10:00:00Z'),
  atualizadoEm: new Date('2025-01-15T10:00:00Z'),
  avatarUrl: null,
  expiresAt: null,
  primeiroAcesso: false,
  bloqueado: false,
};

// ─── GET /api/usuarios ────────────────────────────────────────────────────────

describe('GET /api/usuarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: autenticado como ADMIN com permissão de leitura
    (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
    (can as jest.Mock).mockReturnValue(true);
  });

  it('retorna 401 quando requireUser lança erro de autenticação', async () => {
    const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
    (requireUser as jest.Mock).mockRejectedValueOnce(authError);

    const req = mockGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('retorna 403 quando can() retorna false para read', async () => {
    (can as jest.Mock).mockReturnValueOnce(false);

    const req = mockGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it('retorna 400 quando query params são inválidos', async () => {
    const req = mockGetRequest('role=INVALID_ROLE');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('INVALID_QUERY');
  });

  it('retorna lista paginada com success:true', async () => {
    // 3 chamadas: items, count, stats
    (prisma.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce([MOCK_USER_ROW])
      .mockResolvedValueOnce([{ cnt: 1 }])
      .mockResolvedValueOnce([{ status: 'ATIVO', cnt: 1 }]);

    const req = mockGetRequest('page=1&pageSize=20');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('retorna 403 quando GERENTE não tem roles gerenciáveis', async () => {
    (requireUser as jest.Mock).mockResolvedValueOnce({
      ...ADMIN_USER,
      role: 'GERENTE',
      nivel: 'GERENTE',
    });
    (getManageableRoles as jest.Mock).mockReturnValueOnce([]); // sem permissão

    const req = mockGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it('filtra usuários por status=ATIVO corretamente', async () => {
    (prisma.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce([MOCK_USER_ROW])
      .mockResolvedValueOnce([{ cnt: 1 }])
      .mockResolvedValueOnce([{ status: 'ATIVO', cnt: 1 }]);

    const req = mockGetRequest('status=ATIVO');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('mapeia data.primeiroAcesso como boolean', async () => {
    const rowWithPrimeiroAcesso = { ...MOCK_USER_ROW, primeiroAcesso: 1 };
    (prisma.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce([rowWithPrimeiroAcesso])
      .mockResolvedValueOnce([{ cnt: 1 }])
      .mockResolvedValueOnce([]);

    const req = mockGetRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(body.data[0].primeiroAcesso).toBe(true);
  });
});

// ─── POST /api/usuarios ───────────────────────────────────────────────────────

describe('POST /api/usuarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mockReset garante que o queue de mockResolvedValueOnce seja limpo
    // (clearAllMocks só limpa calls/results, não o queue de implementations)
    (prisma.$queryRaw as jest.Mock).mockReset();
    (prisma.$executeRawUnsafe as jest.Mock).mockReset();

    (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
    (can as jest.Mock).mockReturnValue(true);
    // Default persistente: sem email duplicado, sem usuário criado
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    (prisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(1);
  });

  it('retorna 401 quando requireUser lança erro de autenticação', async () => {
    const authError = Object.assign(new Error('UNAUTHENTICATED'), { status: 401 });
    (requireUser as jest.Mock).mockRejectedValueOnce(authError);

    const req = mockPostRequest({ email: 'test@example.com' });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('retorna 403 quando can() retorna false para create', async () => {
    (can as jest.Mock).mockReturnValueOnce(false);

    const req = mockPostRequest({ email: 'test@example.com' });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('retorna 400 quando email é inválido', async () => {
    const req = mockPostRequest({ email: 'nao-e-um-email' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.fields).toHaveProperty('email');
  });

  it('retorna 400 quando corpo contém telefone com formato errado', async () => {
    const req = mockPostRequest({
      email: 'valid@example.com',
      telefone: '123', // menos que 10 dígitos
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.fields).toHaveProperty('telefone');
  });

  it('retorna 409 quando email já está cadastrado', async () => {
    // Primeiro $queryRaw retorna usuário existente
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ id: 5 }]);

    const req = mockPostRequest({ email: 'existing@gladpros.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('EMAIL_TAKEN');
  });

  it('cria usuário e retorna { data: { id }, success: true } com status 201', async () => {
    // Configurar sequência: email check vazio → INSERT → fetch criado com id 99
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([])   // email check: sem duplicata
      .mockResolvedValueOnce([     // fetch do usuário criado
        {
          id: 99,
          email: 'jane.doe@example.com',
          nomeCompleto: 'Jane Doe',
          nivel: 'USUARIO',
          status: 'ATIVO',
          avatarUrl: null,
          expiresAt: null,
          primeiroAcesso: false,
        },
      ]);

    const req = mockPostRequest({
      email: 'jane.doe@example.com',
      nomeCompleto: 'Jane Doe',
      role: 'USUARIO',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ id: 99, email: 'jane.doe@example.com' });
  });

  it('retorna 400 quando body não contém campos obrigatórios', async () => {
    // Teste confiável: body vazio sem email → falha Zod com VALIDATION_ERROR
    // (teste de JSON inválido depende de comportamento de NextRequest no jsdom)
    const req = mockPostRequest({});

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.fields).toBeDefined();
  });

  it('verifica que bcrypt.hash é chamado para a senha provisória', async () => {
    const bcrypt = require('bcryptjs');

    const req = mockPostRequest({ email: 'newuser@example.com' });
    await POST(req);

    expect(bcrypt.hash).toHaveBeenCalledWith('TempPass123!', 12);
  });
});
