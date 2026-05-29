// @bug:AUTH-P2-002
// @description: logout deve limpar e revogar o deviceTrust atual
// @fix: src/app/api/auth/logout/route.ts apaga cookie deviceTrust e remove o dispositivo confiável correspondente

import { POST } from '@/app/api/auth/logout/route';
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockResolvedValue([{ id: 15, usuarioId: 42 }]),
  },
}));

jest.mock('@/shared/lib/jwt', () => ({
  verifyAuthJWT: jest.fn().mockResolvedValue({ sub: '42', sessionId: 15 }),
}));

jest.mock('@/shared/lib/db-metadata', () => ({
  hasTokenVersionColumn: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/auth/token-service', () => ({
  revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
  revokeTokensForSession: jest.fn().mockResolvedValue(1),
}));

jest.mock('@/shared/lib/security', () => ({
  SecurityService: {
    revokeSessionByToken: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/api/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe('REGRESSION AUTH-P2-002', () => {
  it('limpa cookie deviceTrust e remove o dispositivo confiável no logout', async () => {
    const request = {
      url: 'http://localhost/api/auth/logout',
      headers: {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'cookie') {
            return 'sessionToken=session-abc; authToken=jwt-abc; deviceTrust=device-123; refreshToken=rt-xyz';
          }
          return null;
        }),
      },
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(
      require('@/shared/lib/security').SecurityService.revokeSessionByToken,
    ).toHaveBeenCalledWith('session-abc');
    expect(require('@/lib/auth/token-service').revokeTokensForSession).toHaveBeenCalledWith(
      15,
      'Logout da sessão atual',
    );
    expect(require('@/lib/prisma').prisma.$executeRaw).toHaveBeenCalled();

    const cookieNames = (response.cookies.set as jest.Mock).mock.calls.map(
      ([name]: [string]) => name,
    );
    expect(cookieNames).toContain('deviceTrust');
  });
});
