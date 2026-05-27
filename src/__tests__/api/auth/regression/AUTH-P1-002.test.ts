// @bug:AUTH-P1-002
// @description: revogação de sessão deve invalidar também os refresh tokens vinculados à sessão
// @fix: src/app/api/auth/me/sessions/route.ts e src/app/api/auth/me/sessions/[id]/route.ts agora revogam tokens da sessão

import { POST as revokeOthers } from '@/app/api/auth/me/sessions/route';
import { DELETE as revokeOne } from '@/app/api/auth/me/sessions/[id]/route';
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

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn().mockResolvedValue({ id: '10', empresaId: 1, role: 'USUARIO' }),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn().mockResolvedValue(1),
    auditLog: { create: jest.fn().mockResolvedValue(undefined) },
  },
}));

jest.mock('@/lib/auth/token-service', () => ({
  revokeTokensForSession: jest.fn().mockResolvedValue(1),
  revokeAllUserTokens: jest.fn().mockResolvedValue(1),
  revokeAllUserTokensExceptSession: jest.fn().mockResolvedValue(1),
}));

describe('REGRESSION AUTH-P1-002', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('revoga refresh tokens ao encerrar uma sessão específica', async () => {
    require('@/lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { id: 44, token: 'session-token-44' },
    ]);

    const request = {
      url: 'http://localhost/api/auth/me/sessions/44',
      cookies: { get: jest.fn().mockReturnValue({ value: 'current-session' }) },
    } as unknown as NextRequest;

    const response = await revokeOne(request, { params: Promise.resolve({ id: '44' }) });

    expect(response.status).toBe(200);
    expect(require('@/lib/auth/token-service').revokeTokensForSession).toHaveBeenCalledWith(
      44,
      'Sessão revogada pelo usuário',
    );
  });

  it('revoga refresh tokens das outras sessões ao usar revoke-others', async () => {
    require('@/lib/prisma').prisma.$queryRaw.mockResolvedValue([{ id: 77 }]);

    const request = {
      url: 'http://localhost/api/auth/me/sessions',
      cookies: { get: jest.fn().mockReturnValue({ value: 'current-session-token' }) },
    } as unknown as NextRequest;

    const response = await revokeOthers(request);

    expect(response.status).toBe(200);
    expect(
      require('@/lib/auth/token-service').revokeAllUserTokensExceptSession,
    ).toHaveBeenCalledWith(10, 77, 'Revogação de outras sessões pelo usuário');
  });
});
