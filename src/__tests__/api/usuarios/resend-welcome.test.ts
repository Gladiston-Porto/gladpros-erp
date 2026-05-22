// src/__tests__/api/usuarios/resend-welcome.test.ts
// Testes para POST /api/usuarios/[id]/resend-welcome

jest.mock('next/server', () => {
  const makeSearchParams = (url: string) => {
    try { return new URLSearchParams(url.includes('?') ? url.split('?')[1] ?? '' : ''); }
    catch { return new URLSearchParams(); }
  };
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => ({
      url,
      method: (init?.method ?? 'POST').toUpperCase(),
      nextUrl: {
        searchParams: makeSearchParams(url),
        pathname: url.replace(/^https?:\/\/[^/]+/, '').split('?')[0],
      },
      headers: {
        get: (name: string) => {
          const h = (init?.headers ?? {}) as Record<string, string>;
          return h[name] ?? h[name.toLowerCase()] ?? null;
        },
      },
      json: jest.fn().mockResolvedValue({}),
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn().mockReturnValue(true),
}));

jest.mock('@/shared/lib/passwords', () => ({
  generateTempPassword: jest.fn().mockReturnValue('TempPass456!'),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashed_new'),
}));

jest.mock('@/shared/lib/emails/welcome', () => ({
  renderWelcomeEmail: jest.fn().mockReturnValue({
    subject: 'Bem-vindo à GladPros',
    html: '<p>Bem-vindo!</p>',
  }),
}));

jest.mock('@/shared/lib/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/shared/lib/jwt', () => ({
  signFirstAccessJWT: jest.fn().mockResolvedValue('new-magic-token'),
}));

jest.mock('@/shared/lib/audit', () => ({
  AuditLogger: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
        return { status: 401, json: jest.fn().mockResolvedValue({ error: 'Unauthorized', success: false }) };
      }
      throw error;
    }
  }),
}));

import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/usuarios/[id]/resend-welcome/route';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { sendMail } from '@/shared/lib/mailer';
import { AuditLogger } from '@/shared/lib/audit';

const mockQueryRaw = prisma.$queryRaw as jest.MockedFunction<typeof prisma.$queryRaw>;
const mockExecuteRaw = prisma.$executeRaw as jest.MockedFunction<typeof prisma.$executeRaw>;
const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;
const mockSendMail = sendMail as jest.MockedFunction<typeof sendMail>;
const mockAuditLog = AuditLogger.log as jest.MockedFunction<typeof AuditLogger.log>;

const adminUser = { id: 1, email: 'admin@gladpros.com', role: 'ADMIN', empresaId: 1 };
const targetUser = {
  id: 55,
  email: 'novo@gladpros.com',
  nomeCompleto: 'Novo Colaborador',
  status: 'ATIVO',
  primeiroAcesso: 1,
};

function makeReq(id: string | number) {
  return new NextRequest(`http://localhost:3000/api/usuarios/${id}/resend-welcome`, { method: 'POST' });
}

async function callPOST(id: string | number) {
  const req = makeReq(id);
  return POST(req, { params: Promise.resolve({ id: String(id) }) });
}

describe('POST /api/usuarios/[id]/resend-welcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(adminUser as Parameters<typeof mockRequireUser>[0] extends void ? never : Awaited<ReturnType<typeof mockRequireUser>>);
    mockCan.mockReturnValue(true);
    mockExecuteRaw.mockResolvedValue(1 as unknown as never);
  });

  describe('Autenticação e autorização', () => {
    it('retorna 401 quando não autenticado', async () => {
      mockRequireUser.mockRejectedValueOnce(Object.assign(new Error('UNAUTHENTICATED'), { message: 'UNAUTHENTICATED' }));
      const res = await callPOST(55);
      expect(res.status).toBe(401);
    });

    it('retorna 403 quando usuário não tem permissão', async () => {
      mockCan.mockReturnValueOnce(false);
      // Nota: a rota retorna 403 ANTES de qualquer consulta ao banco — não configurar mockQueryRaw aqui
      const res = await callPOST(55);
      expect(res.status).toBe(403);
    });
  });

  describe('Validação de entrada', () => {
    it('retorna 400 quando ID é inválido (NaN)', async () => {
      const res = await callPOST('abc');
      expect(res.status).toBe(400);
    });

    it('retorna 400 quando ID é zero', async () => {
      const res = await callPOST(0);
      expect(res.status).toBe(400);
    });
  });

  describe('Validação de estado do usuário alvo', () => {
    it('retorna 404 quando usuário não é encontrado', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      const res = await callPOST(999);
      expect(res.status).toBe(404);
    });

    it('retorna 400 quando usuário está INATIVO', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ ...targetUser, status: 'INATIVO' }]);
      const res = await callPOST(55);
      expect(res.status).toBe(400);
    });

    it('retorna 409 quando usuário já concluiu o primeiro acesso (primeiroAcesso = 0)', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ ...targetUser, primeiroAcesso: 0 }]);
      const res = await callPOST(55);
      expect(res.status).toBe(409);
    });

    it('retorna 409 quando usuário já concluiu o primeiro acesso (primeiroAcesso = false)', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ ...targetUser, primeiroAcesso: false }]);
      const res = await callPOST(55);
      expect(res.status).toBe(409);
    });
  });

  describe('Fluxo feliz', () => {
    beforeEach(() => {
      mockQueryRaw.mockResolvedValue([targetUser]);
      mockExecuteRaw.mockResolvedValue(1 as unknown as never);
    });

    it('retorna 200 com success: true quando tudo está correto', async () => {
      const res = await callPOST(55);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain(targetUser.email);
    });

    it('atualiza a senha no banco via $executeRaw', async () => {
      await callPOST(55);
      expect(mockExecuteRaw).toHaveBeenCalled();
    });

    it('envia email para o usuário alvo', async () => {
      await callPOST(55);
      expect(mockSendMail).toHaveBeenCalledWith(
        targetUser.email,
        expect.any(String),
        expect.any(String)
      );
    });

    it('registra AuditLog com action RESEND_WELCOME_EMAIL', async () => {
      await callPOST(55);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESEND_WELCOME_EMAIL',
          resource: 'Usuario',
          resourceId: '55',
          status: 'SUCCESS',
        })
      );
    });
  });

  describe('Falha no envio de email', () => {
    it('retorna 500 quando sendMail falha', async () => {
      mockQueryRaw.mockResolvedValue([targetUser]);
      mockExecuteRaw.mockResolvedValue(1 as unknown as never);
      mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));
      const res = await callPOST(55);
      expect(res.status).toBe(500);
    });
  });
});
