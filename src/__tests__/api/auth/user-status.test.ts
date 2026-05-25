import { POST } from '../../../app/api/auth/user-status/route';
import { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
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

jest.mock('../../../shared/lib/rate-limit', () => {
  // isAllowed definida DENTRO do factory — sem TDZ, sem problemas de hoisting
  const isAllowedFn = jest.fn().mockResolvedValue({ allowed: true });
  return {
    RateLimiter: jest.fn().mockImplementation(() => ({ isAllowed: isAllowedFn })),
    // Expor para acesso nos testes via require()
    __isAllowed: isAllowedFn,
  };
});

const BLOCKED_USER = {
  email: 'bloqueado@gladpros.com',
};

describe('POST /api/auth/user-status', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restaurar comportamento padrão do rate limiter após clearAllMocks

    const { __isAllowed } = require('../../../shared/lib/rate-limit') as any;
    __isAllowed.mockResolvedValue({ allowed: true });
    mockRequest = {
      url: 'http://localhost/api/auth/user-status',
      json: jest.fn(),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') },
    } as unknown as NextRequest;
  });

  // ---- Rate limit ----------------------------------------------------------

  it('retorna 429 quando o rate limit é excedido', async () => {
    const { __isAllowed } = require('../../../shared/lib/rate-limit') as any;
    __isAllowed.mockResolvedValueOnce({
      allowed: false,
      message: 'Muitas solicitações. Aguarde um momento.',
    });
    (mockRequest.json as jest.Mock).mockResolvedValue({ email: BLOCKED_USER.email });
    const response = await POST(mockRequest);
    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Muitas solicitações');
  });

  // ---- Validação -----------------------------------------------------------

  it('retorna 400 para body sem email', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({});
    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Email é obrigatório');
  });

  it('retorna 400 para email com formato inválido', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({ email: 'invalido' });
    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('retorna 400 quando json() retorna objeto vazio (body malformado)', async () => {
    (mockRequest.json as jest.Mock).mockRejectedValue(new SyntaxError('Unexpected end'));
    const response = await POST(mockRequest);
    // json().catch(() => ({})) → {} → falha na validação → 400
    expect(response.status).toBe(400);
  });

  // ---- Anti-enumeration ----------------------------------------------------

  it('retorna contrato neutro sem revelar existência da conta', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({ email: 'naoexiste@gladpros.com' });
    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.nextStep).toBe('unlock');
    expect(data.success).toBe(true);
    expect(data.blocked).toBeUndefined();
    expect(data.recovery).toBeUndefined();
  });

  // ---- Contrato uniforme ---------------------------------------------------

  it('retorna o mesmo contrato para conta existente', async () => {
    (mockRequest.json as jest.Mock).mockResolvedValue({ email: BLOCKED_USER.email });
    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.nextStep).toBe('unlock');
    expect(data.success).toBe(true);
    expect(data.recovery).toBeUndefined();
  });
});
