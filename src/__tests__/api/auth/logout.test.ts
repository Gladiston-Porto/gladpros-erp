import { POST } from '../../../app/api/auth/logout/route';
import { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    json: jest.fn(),
    headers: { get: jest.fn() },
    ...options,
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => {
      const cookiesMap = new Map<string, { value: string; options: Record<string, unknown> }>();
      return {
        status: options?.status || 200,
        json: jest.fn().mockResolvedValue(data),
        headers: new Map<string, string>(),
        cookies: {
          set: jest.fn((name: string, value: string, opts: Record<string, unknown>) => {
            cookiesMap.set(name, { value, options: opts });
          }),
          _map: cookiesMap,
        },
      };
    }),
  },
}));

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    $executeRaw: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../../../shared/lib/jwt', () => ({
  verifyAuthJWT: jest.fn(),
}));

jest.mock('../../../shared/lib/db-metadata', () => ({
  hasTokenVersionColumn: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../lib/auth/token-service', () => ({
  revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
  revokeTokensForSession: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../../shared/lib/security', () => ({
  SecurityService: {
    revokeSessionByToken: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../lib/api/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('POST /api/auth/logout', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      url: 'http://localhost/api/auth/logout',
      json: jest.fn(),
      headers: { get: jest.fn().mockReturnValue(null) },
    } as unknown as NextRequest;
  });

  it('retorna 200 mesmo sem cookies', async () => {
    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Logout realizado com sucesso');
  });

  it('limpa os quatro cookies de autenticação (authToken, refreshToken, sessionToken, deviceTrust)', async () => {
    const response = await POST(mockRequest);
    const setCalls = (response.cookies.set as jest.Mock).mock.calls;
    const cookieNames = setCalls.map(([name]: [string]) => name);
    expect(cookieNames).toContain('authToken');
    expect(cookieNames).toContain('refreshToken');
    expect(cookieNames).toContain('sessionToken');
    expect(cookieNames).toContain('deviceTrust');
    // Cada cookie deve ter maxAge: 0 para expirar
    setCalls.forEach(([, value, opts]: [string, string, Record<string, unknown>]) => {
      expect(value).toBe('');
      expect(opts.maxAge).toBe(0);
      expect(opts.httpOnly).toBe(true);
    });
  });

  it('revoga o refresh token quando presente no cookie', async () => {
    (mockRequest.headers.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'cookie') return 'refreshToken=rt-abc123; authToken=at-xyz';
      return null;
    });

    await POST(mockRequest);

    expect(require('../../../lib/auth/token-service').revokeRefreshToken).toHaveBeenCalledWith(
      'rt-abc123',
      'Logout do usuário',
    );
  });

  it('incrementa tokenVersion quando authToken é um JWT válido', async () => {
    require('../../../shared/lib/jwt').verifyAuthJWT.mockResolvedValue({ sub: '42' });
    (mockRequest.headers.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'cookie') return 'authToken=valid-jwt-token';
      return null;
    });

    await POST(mockRequest);

    expect(require('../../../lib/prisma').prisma.$executeRaw).toHaveBeenCalled();
  });

  it('não incrementa tokenVersion quando hasTokenVersionColumn retorna false', async () => {
    require('../../../shared/lib/jwt').verifyAuthJWT.mockResolvedValue({ sub: '42' });
    require('../../../shared/lib/db-metadata').hasTokenVersionColumn.mockResolvedValue(false);
    (mockRequest.headers.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'cookie') return 'authToken=valid-jwt-token';
      return null;
    });

    await POST(mockRequest);

    expect(require('../../../lib/prisma').prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('retorna 200 mesmo quando verifyAuthJWT falha (token expirado ou inválido)', async () => {
    require('../../../shared/lib/jwt').verifyAuthJWT.mockRejectedValue(new Error('token expired'));
    (mockRequest.headers.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'cookie') return 'authToken=expired-token';
      return null;
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    // tokenVersion não deve ser incrementado para token inválido
    expect(require('../../../lib/prisma').prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('retorna 200 mesmo quando revokeRefreshToken falha (degradação graciosa)', async () => {
    require('../../../lib/auth/token-service').revokeRefreshToken.mockRejectedValue(
      new Error('DB offline'),
    );
    (mockRequest.headers.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'cookie') return 'refreshToken=some-token';
      return null;
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    // Mesmo com falha no revoke, o logout ainda limpa os cookies
    expect(response.cookies.set).toHaveBeenCalledTimes(4);
  });

  it('revoga a sessão atual e os refresh tokens vinculados à sessão quando sessionToken existe', async () => {
    require('../../../shared/lib/jwt').verifyAuthJWT.mockResolvedValue({
      sub: '42',
      sessionId: 15,
    });
    require('../../../lib/prisma').prisma.$queryRaw = jest
      .fn()
      .mockResolvedValue([{ id: 15, usuarioId: 42 }]);
    (mockRequest.headers.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'cookie')
        return 'sessionToken=session-abc; authToken=valid-jwt-token; deviceTrust=trust-123';
      return null;
    });

    await POST(mockRequest);

    expect(
      require('../../../shared/lib/security').SecurityService.revokeSessionByToken,
    ).toHaveBeenCalledWith('session-abc');
    expect(require('../../../lib/auth/token-service').revokeTokensForSession).toHaveBeenCalledWith(
      15,
      'Logout da sessão atual',
    );
    expect(require('../../../lib/prisma').prisma.$executeRaw).toHaveBeenCalled();
  });

  it('aceita token via Authorization: Bearer como alternativa ao cookie', async () => {
    require('../../../shared/lib/jwt').verifyAuthJWT.mockResolvedValue({ sub: '99' });
    (mockRequest.headers.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'authorization') return 'Bearer header-auth-token';
      return null;
    });

    await POST(mockRequest);

    expect(require('../../../shared/lib/jwt').verifyAuthJWT).toHaveBeenCalledWith(
      'header-auth-token',
    );
  });
});
