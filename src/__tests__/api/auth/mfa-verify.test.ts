import { POST } from '../../../app/api/auth/mfa/verify/route';
import { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    json: jest.fn(),
    formData: jest.fn(),
    headers: { get: jest.fn() },
    nextUrl: { searchParams: new URLSearchParams() },
    ...options,
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      headers: new Map(Object.entries(options?.headers || {})),
      cookies: { set: jest.fn(), getAll: jest.fn().mockReturnValue([]) },
    })),
  },
}));

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../../../shared/lib/mfa', () => ({
  MFAService: {
    verifyMFACode: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/rate-limit', () => ({
  mfaRateLimit: {
    checkLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 2,
      resetTime: Date.now() + 60000,
      message: '',
    }),
  },
}));

jest.mock('../../../shared/lib/db-metadata', () => ({
  hasTokenVersionColumn: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../shared/lib/jwt', () => ({
  signAuthJWT: jest.fn().mockResolvedValue('mock-jwt-token'),
}));

jest.mock('../../../lib/auth/token-service', () => ({
  generateRefreshToken: jest.fn().mockResolvedValue({ refreshToken: 'mock-refresh-token' }),
}));

jest.mock('../../../shared/lib/security', () => ({
  SecurityService: {
    createSession: jest.fn().mockResolvedValue('mock-session-token'),
  },
}));

jest.mock('../../../shared/lib/blocking', () => ({
  BlockingService: {
    clearFailedAttempts: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../lib/api/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/mfa-challenge', () => ({
  verifyMfaChallenge: jest.fn().mockReturnValue(true),
  createMfaChallenge: jest.fn().mockReturnValue('mock-challenge'),
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  nomeCompleto: 'Test User',
  primeiroAcesso: false,
  senhaProvisoria: false,
  tipo: 'USUARIO',
  tokenVersion: 0,
};

describe('POST /api/auth/mfa/verify', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    require('../../../shared/lib/rate-limit').mfaRateLimit.checkLimit.mockResolvedValue({
      allowed: true,
      remaining: 2,
      resetTime: Date.now() + 60000,
      message: '',
    });

    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([mockUser]);
    require('../../../lib/prisma').prisma.$executeRaw.mockResolvedValue(1);
    require('../../../shared/lib/mfa').MFAService.verifyMFACode.mockResolvedValue({ valid: true });

    mockRequest = {
      url: 'http://localhost/api/auth/mfa/verify',
      method: 'POST',
      json: jest.fn(),
      formData: jest.fn(),
      headers: { get: jest.fn().mockReturnValue(null) },
      nextUrl: { searchParams: new URLSearchParams() },
    } as unknown as NextRequest;
  });

  it('should return 400 for missing userId or code', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({});

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('ID do usuário e código são obrigatórios');
    expect(data.success).toBe(false);
  });

  it('should return 429 when rate limited', async () => {
    require('../../../shared/lib/rate-limit').mfaRateLimit.checkLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      message: 'Muitas tentativas de verificação',
    });
    (mockRequest.json as jest.Mock).mockResolvedValue({
      userId: 1,
      code: '123456',
      challenge: 'mock-challenge',
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(429);
  });

  it('should return 401 for invalid MFA code', async () => {
    require('../../../shared/lib/mfa').MFAService.verifyMFACode.mockResolvedValue({
      valid: false,
      error: 'Código inválido ou expirado',
    });
    (mockRequest.json as jest.Mock).mockResolvedValue({
      userId: 1,
      code: '000000',
      challenge: 'mock-challenge',
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Código inválido ou expirado');
    expect(data.success).toBe(false);
  });

  it('should return 404 when user not found after MFA validation', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([]);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      userId: 999,
      code: '123456',
      challenge: 'mock-challenge',
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Usuário não encontrado');
    expect(data.success).toBe(false);
  });

  it('should issue JWT and set cookies on successful login', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({
      userId: 1,
      code: '123456',
      challenge: 'mock-challenge',
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('test@example.com');
    // MFA code nunca deve ser retornado na resposta
    expect(data.code).toBeUndefined();
  });

  it('should return requiresSetup for first-access user', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...mockUser, primeiroAcesso: true },
    ]);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      userId: 1,
      code: '123456',
      challenge: 'mock-challenge',
      tipoAcao: 'PRIMEIRO_ACESSO',
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requiresSetup).toBe(true);
    expect(data.nextStep).toBe('primeiro-acesso');
  });
});
