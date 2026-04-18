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

jest.mock('@/shared/lib/audit', () => ({
  AuditoriaService: {
    registrarCriacaoUsuario: jest.fn(),
    registrarAtualizacaoUsuario: jest.fn(),
    registrarExclusaoUsuario: jest.fn(),
  },
}));

jest.mock('@/shared/lib/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/shared/lib/passwords', () => ({
  generateTempPassword: jest.fn().mockReturnValue('TempPass123!'),
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

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/shared/lib/emails/welcome', () => ({
  renderWelcomeEmail: jest.fn().mockReturnValue({ subject: 'Welcome', html: '<p>Welcome</p>', text: 'Welcome' }),
}));

jest.mock('@/shared/lib/user-hierarchy', () => ({
  UserRole: { ADMIN: 'ADMIN', GERENTE: 'GERENTE', FINANCEIRO: 'FINANCEIRO', USUARIO: 'USUARIO', ESTOQUE: 'ESTOQUE', CLIENTE: 'CLIENTE' },
  canManageRole: jest.fn().mockReturnValue(true),
  getManageableRoles: jest.fn().mockReturnValue(['GERENTE', 'FINANCEIRO', 'USUARIO', 'ESTOQUE', 'CLIENTE']),
}));

import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/usuarios', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/usuarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — no auth', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { POST } = await import('@/app/api/usuarios/route');
    const res = await POST(makePostRequest({ email: 'test@test.com', nomeCompleto: 'Test User' }));
    expect(res.status).toBe(401);
  });

  it('403 — non-ADMIN role', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 2, role: 'GERENTE', email: 'g@test.com' } as any);
    const { POST } = await import('@/app/api/usuarios/route');
    const res = await POST(makePostRequest({ email: 'new@test.com', nomeCompleto: 'New User' }));
    expect(res.status).toBe(403);
  });

  it('400 — missing email', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    const { POST } = await import('@/app/api/usuarios/route');
    const res = await POST(makePostRequest({ nomeCompleto: 'No Email' }));
    expect(res.status).toBe(400);
  });

  it('400 — invalid email format', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    const { POST } = await import('@/app/api/usuarios/route');
    const res = await POST(makePostRequest({ email: 'not-an-email', nomeCompleto: 'Bad Email' }));
    expect(res.status).toBe(400);
  });

  it('409 — email already taken', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ id: 99 }]); // existing user check
    const { POST } = await import('@/app/api/usuarios/route');
    const res = await POST(makePostRequest({ email: 'taken@test.com', nomeCompleto: 'Duplicate User' }));
    expect(res.status).toBe(409);
  });

  it('201 — happy path returns { data, success: true }', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    // No existing user
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);
    // Insert
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);
    // Fetch created
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{
      id: 10, email: 'newuser@test.com', nomeCompleto: 'New User', nivel: 'USUARIO', status: 'ATIVO',
    }]);
    const { POST } = await import('@/app/api/usuarios/route');
    const res = await POST(makePostRequest({ email: 'newuser@test.com', nomeCompleto: 'New User' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});
