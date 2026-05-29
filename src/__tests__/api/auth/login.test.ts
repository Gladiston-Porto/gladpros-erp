import { POST } from '../../../app/api/auth/login/route';
import { NextRequest } from 'next/server';

// Mock do NextRequest / NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    json: jest.fn(),
    headers: { get: jest.fn() },
    ...options,
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => {
      const response = {
        status: options?.status || 200,
        json: jest.fn().mockResolvedValue(data),
        headers: new Map(),
        cookies: { set: jest.fn() },
      };
      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      return response;
    }),
  },
}));

// Mock do Prisma — caminho correto conforme AGENTS.md: @/lib/prisma
jest.mock('../../../lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

// Mock dos serviços
jest.mock('../../../shared/lib/password', () => ({
  PasswordService: {
    verifyPassword: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/email', () => ({
  EmailService: {
    sendMFA: jest.fn().mockResolvedValue({ success: true }),
    prewarm: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/mfa', () => ({
  MFAService: {
    createMFACode: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/blocking', () => ({
  BlockingService: {
    isBlocked: jest.fn(),
    recordFailedAttempt: jest.fn(),
    checkUserBlock: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/rate-limit', () => ({
  loginRateLimit: {
    isAllowed: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/audit', () => ({
  AuditLogger: {
    log: jest.fn(),
    logLogin: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/mfa-challenge', () => ({
  createMfaChallenge: jest.fn().mockReturnValue('mock-mfa-challenge'),
}));

describe('POST /api/auth/login', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Rate limit padrão: permitido
    require('../../../shared/lib/rate-limit').loginRateLimit.isAllowed.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
    });

    // Prisma padrão: usuário não encontrado
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([]);

    // Mocks de serviços com padrões seguros
    require('../../../shared/lib/blocking').BlockingService.checkUserBlock.mockResolvedValue({
      blocked: false,
    });
    require('../../../shared/lib/blocking').BlockingService.recordFailedAttempt.mockResolvedValue(
      undefined,
    );
    require('../../../shared/lib/audit').AuditLogger.logLogin.mockResolvedValue(undefined);

    mockRequest = {
      url: 'http://localhost/api/auth/login',
      method: 'POST',
      json: jest.fn(),
      headers: { get: jest.fn() },
      cookies: { get: jest.fn().mockReturnValue(undefined) },
    } as unknown as NextRequest;
  });

  it('should return 400 for invalid request body', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({});
    (mockRequest.headers.get as jest.Mock).mockReturnValue('127.0.0.1');

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email e senha são obrigatórios');
  });

  it('should return 429 when rate limited', async () => {
    require('../../../shared/lib/rate-limit').loginRateLimit.isAllowed.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      message: 'Muitas tentativas',
    });
    (mockRequest.json as jest.Mock).mockResolvedValue({
      email: 'test@example.com',
      password: 'password123',
    });
    (mockRequest.headers.get as jest.Mock).mockReturnValue('127.0.0.1');

    const response = await POST(mockRequest);

    expect(response.status).toBe(429);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('Retry-After')).toBeDefined();
  });

  it('should return 401 for non-existent user', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([]);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      email: 'nonexistent@example.com',
      password: 'password123',
    });
    (mockRequest.headers.get as jest.Mock).mockReturnValue('127.0.0.1');

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Credenciais inválidas');
  });

  it('should return 401 for inactive user', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      {
        id: 1,
        email: 'inactive@example.com',
        nomeCompleto: 'Inactive User',
        senha: 'hashedpassword',
        senhaProvisoria: false,
        primeiroAcesso: false,
        criadoEm: new Date(),
        status: 'INATIVO',
        nivel: 'USUARIO',
        tokenVersion: 0,
      },
    ]);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      email: 'inactive@example.com',
      password: 'password123',
    });
    (mockRequest.headers.get as jest.Mock).mockReturnValue('127.0.0.1');

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Credenciais inválidas');
  });

  it('should return 401 for incorrect password', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      {
        id: 1,
        email: 'test@example.com',
        nomeCompleto: 'Test User',
        senha: 'hashedpassword',
        senhaProvisoria: false,
        primeiroAcesso: false,
        criadoEm: new Date(),
        status: 'ATIVO',
        nivel: 'USUARIO',
        tokenVersion: 0,
      },
    ]);

    require('../../../shared/lib/password').PasswordService.verifyPassword.mockResolvedValue(false);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    (mockRequest.headers.get as jest.Mock).mockReturnValue('127.0.0.1');

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Credenciais inválidas');
  });

  // @bug:AUTH-P2-001
  // @description: não expor metadados de bloqueio antes de validar senha
  it('should return 401 for blocked user when password is invalid (anti-enumeration)', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      {
        id: 1,
        email: 'test@example.com',
        nomeCompleto: 'Test User',
        senha: 'hashedpassword',
        senhaProvisoria: false,
        primeiroAcesso: false,
        criadoEm: new Date(),
        status: 'ATIVO',
        nivel: 'USUARIO',
        tokenVersion: 0,
      },
    ]);

    require('../../../shared/lib/blocking').BlockingService.checkUserBlock.mockResolvedValue({
      blocked: true,
      unlockAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    require('../../../shared/lib/password').PasswordService.verifyPassword.mockResolvedValue(false);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    (mockRequest.headers.get as jest.Mock).mockReturnValue('127.0.0.1');

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Credenciais inválidas');
    expect(data.blocked).toBeUndefined();
    expect(data.unlockAt).toBeUndefined();
    expect(data.requiresPinUnlock).toBeUndefined();
    expect(data.requiresSecurityQuestion).toBeUndefined();
  });

  it('should return 401 for blocked user even when password is valid (anti-enumeration)', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      {
        id: 1,
        email: 'test@example.com',
        nomeCompleto: 'Test User',
        senha: 'hashedpassword',
        senhaProvisoria: false,
        primeiroAcesso: false,
        criadoEm: new Date(),
        status: 'ATIVO',
        nivel: 'USUARIO',
        tokenVersion: 0,
      },
    ]);

    require('../../../shared/lib/blocking').BlockingService.checkUserBlock.mockResolvedValue({
      blocked: true,
      unlockAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    require('../../../shared/lib/password').PasswordService.verifyPassword.mockResolvedValue(true);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      email: 'test@example.com',
      password: 'password123',
    });
    (mockRequest.headers.get as jest.Mock).mockReturnValue('127.0.0.1');

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Credenciais inválidas');
    expect(data.blocked).toBeUndefined();
    expect(data.unlockAt).toBeUndefined();
  });

  it('should return mfaRequired for successful login with MFA enabled', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      {
        id: 1,
        email: 'test@example.com',
        nomeCompleto: 'Test User',
        senha: 'hashedpassword',
        senhaProvisoria: false,
        primeiroAcesso: false,
        criadoEm: new Date(),
        status: 'ATIVO',
        nivel: 'USUARIO',
        tokenVersion: 0,
      },
    ]);

    require('../../../shared/lib/password').PasswordService.verifyPassword.mockResolvedValue(true);
    require('../../../shared/lib/mfa').MFAService.createMFACode.mockResolvedValue({
      code: '123456',
      id: 1,
    });
    require('../../../shared/lib/email').EmailService.sendMFA.mockResolvedValue({ success: true });
    require('../../../shared/lib/email').EmailService.prewarm.mockReturnValue(undefined);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      email: 'test@example.com',
      password: 'password123',
    });
    (mockRequest.headers.get as jest.Mock).mockReturnValue('127.0.0.1');

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mfaRequired).toBe(true);
    expect(data.success).toBe(true);
    expect(data.emailSent).toBe(true);
    // Garantir que o código MFA nunca é retornado na resposta
    expect(data.code).toBeUndefined();
  });

  it('should return nextStep=primeiro-acesso for first access login', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      {
        id: 1,
        email: 'newuser@example.com',
        nomeCompleto: 'New User',
        senha: 'hashedpassword',
        senhaProvisoria: true,
        primeiroAcesso: true,
        criadoEm: new Date(),
        status: 'ATIVO',
        nivel: 'USUARIO',
        tokenVersion: 0,
      },
    ]);

    require('../../../shared/lib/password').PasswordService.verifyPassword.mockResolvedValue(true);
    require('../../../shared/lib/mfa').MFAService.createMFACode.mockResolvedValue({
      code: '654321',
      id: 2,
    });
    require('../../../shared/lib/email').EmailService.sendMFA.mockResolvedValue({ success: true });
    require('../../../shared/lib/email').EmailService.prewarm.mockReturnValue(undefined);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      email: 'newuser@example.com',
      password: 'password123',
    });
    (mockRequest.headers.get as jest.Mock).mockReturnValue('127.0.0.1');

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.mfaRequired).toBe(true);
    expect(data.nextStep).toBe('primeiro-acesso');
    expect(data.user.primeiroAcesso).toBe(true);
  });
});
