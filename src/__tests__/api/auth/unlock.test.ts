import { POST } from '../../../app/api/auth/unlock/route';
import { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    json: jest.fn(),
    headers: { get: jest.fn() },
    ...options,
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      headers: new Map(),
      cookies: { set: jest.fn() },
    })),
  },
}));

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/blocking', () => ({
  BlockingService: {
    unlockWithPin: jest.fn(),
    unlockWithSecurityQuestion: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/audit', () => ({
  AuditLogger: {
    logLogin: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../shared/lib/rate-limit', () => ({
  RateLimiter: jest.fn().mockImplementation(() => ({
    isAllowed: jest.fn().mockResolvedValue({ allowed: true }),
  })),
}));

const blockedUser = {
  id: 5,
  email: 'bloqueado@gladpros.com',
  nomeCompleto: 'Bloqueado Test',
  bloqueado: true,
};

describe('POST /api/auth/unlock', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([blockedUser]);
    require('../../../shared/lib/blocking').BlockingService.unlockWithPin.mockResolvedValue({
      success: true,
    });
    require('../../../shared/lib/blocking').BlockingService.unlockWithSecurityQuestion.mockResolvedValue(
      { success: true },
    );

    mockRequest = {
      url: 'http://localhost/api/auth/unlock',
      json: jest.fn(),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') },
    } as unknown as NextRequest;
  });

  it('retorna 400 para body inválido', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({});
    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('retorna 400 quando usuário não encontrado (sem revelar enumeração)', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([]);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      method: 'pin',
      email: 'naoexiste@gladpros.com',
      pin: '1234',
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Não foi possível desbloquear a conta com os dados informados');
  });

  it('retorna 400 quando usuário não está bloqueado', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...blockedUser, bloqueado: false },
    ]);
    (mockRequest.json as jest.Mock).mockResolvedValue({
      method: 'pin',
      email: blockedUser.email,
      pin: '1234',
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Não foi possível desbloquear a conta com os dados informados');
  });

  it('retorna 400 quando email ausente no método pin', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({ method: 'pin', pin: '1234' });
    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
  });

  it('retorna 401 quando PIN incorreto', async () => {
    require('../../../shared/lib/blocking').BlockingService.unlockWithPin.mockResolvedValue({
      success: false,
      error: 'PIN incorreto',
    });
    (mockRequest.json as jest.Mock).mockResolvedValue({
      method: 'pin',
      email: blockedUser.email,
      pin: '9999',
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Não foi possível desbloquear a conta com os dados informados');
    expect(require('../../../shared/lib/audit').AuditLogger.logLogin).toHaveBeenCalled();
  });

  it('retorna 200 ao desbloquear com PIN correto', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({
      method: 'pin',
      email: blockedUser.email,
      pin: '1234',
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Conta desbloqueada com sucesso');
    expect(require('../../../shared/lib/audit').AuditLogger.logLogin).toHaveBeenCalled();
  });

  it('retorna 400 quando resposta de segurança ausente', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({
      method: 'security',
      email: blockedUser.email,
    });
    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
  });

  it('retorna 401 quando resposta de segurança incorreta', async () => {
    require('../../../shared/lib/blocking').BlockingService.unlockWithSecurityQuestion.mockResolvedValue(
      {
        success: false,
        error: 'Resposta incorreta',
      },
    );
    (mockRequest.json as jest.Mock).mockResolvedValue({
      method: 'security',
      email: blockedUser.email,
      answer: 'errado',
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Não foi possível desbloquear a conta com os dados informados');
  });

  it('retorna 200 ao desbloquear com pergunta de segurança correta', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({
      method: 'security',
      email: blockedUser.email,
      answer: 'correta',
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
