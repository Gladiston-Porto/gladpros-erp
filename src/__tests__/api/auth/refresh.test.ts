import { POST } from '../../../app/api/auth/refresh/route';
import { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    json: jest.fn(),
    headers: { get: jest.fn() },
    cookies: { get: jest.fn() },
    ...options,
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => {
      const cookiesMap = new Map<string, { value: string; options: Record<string, unknown> }>();
      return {
        status: options?.status || 200,
        json: jest.fn().mockResolvedValue(data),
        headers: new Map(),
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

jest.mock('../../../lib/auth/token-service', () => ({
  refreshAccessToken: jest.fn(),
}));

jest.mock('../../../shared/lib/rate-limit', () => ({
  apiRateLimit: {
    checkLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
      message: '',
    }),
  },
}));

const VALID_REFRESH_TOKEN = 'valid-refresh-token-xyz';
const NEW_TOKEN_PAIR = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

describe('POST /api/auth/refresh', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    require('../../../lib/auth/token-service').refreshAccessToken.mockResolvedValue(NEW_TOKEN_PAIR);
    require('../../../shared/lib/rate-limit').apiRateLimit.checkLimit.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
      message: '',
    });

    mockRequest = {
      url: 'http://localhost/api/auth/refresh',
      json: jest.fn().mockResolvedValue({}),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') },
      cookies: { get: jest.fn().mockReturnValue({ value: VALID_REFRESH_TOKEN }) },
    } as unknown as NextRequest;
  });

  it('retorna 400 quando não há refresh token (sem cookie, sem body)', async () => {
    mockRequest.cookies.get = jest.fn().mockReturnValue(undefined);
    (mockRequest.json as jest.Mock).mockResolvedValue({});

    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('REFRESH_TOKEN_REQUIRED');
    expect(data.success).toBe(false);
  });

  it('retorna 400 com body inválido e sem cookie', async () => {
    mockRequest.cookies.get = jest.fn().mockReturnValue(undefined);
    (mockRequest.json as jest.Mock).mockRejectedValue(new Error('json parse error'));

    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
  });

  it('retorna 403 quando token de refresh já foi usado (detecção de reutilização)', async () => {
    require('../../../lib/auth/token-service').refreshAccessToken.mockRejectedValue(
      new Error('Token já foi usado'),
    );
    const response = await POST(mockRequest);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('TOKEN_REUSE_DETECTED');
    expect(data.success).toBe(false);
  });

  it('retorna 429 quando rate limit de refresh é atingido', async () => {
    require('../../../shared/lib/rate-limit').apiRateLimit.checkLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      message: 'Muitas tentativas',
    });

    const response = await POST(mockRequest);
    const data = await response.json();
    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
  });

  it('retorna 403 quando token foi revogado', async () => {
    require('../../../lib/auth/token-service').refreshAccessToken.mockRejectedValue(
      new Error('Token foi revogado'),
    );
    const response = await POST(mockRequest);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('TOKEN_REVOKED');
  });

  it('retorna 401 quando refresh token expirou', async () => {
    require('../../../lib/auth/token-service').refreshAccessToken.mockRejectedValue(
      new Error('Token expirado'),
    );
    const response = await POST(mockRequest);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('REFRESH_TOKEN_EXPIRED');
  });

  it('retorna 401 quando refresh token é inválido', async () => {
    require('../../../lib/auth/token-service').refreshAccessToken.mockRejectedValue(
      new Error('Token inválido'),
    );
    const response = await POST(mockRequest);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('INVALID_REFRESH_TOKEN');
  });

  it('retorna 403 quando usuário está inativo', async () => {
    require('../../../lib/auth/token-service').refreshAccessToken.mockRejectedValue(
      new Error('Usuário inativo'),
    );
    const response = await POST(mockRequest);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('USER_INACTIVE');
  });

  it('retorna 200 e define novos tokens como cookies httpOnly (nunca no body)', async () => {
    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    // Confirmar que refreshAccessToken foi chamado com o token do cookie
    expect(require('../../../lib/auth/token-service').refreshAccessToken).toHaveBeenCalledWith(
      VALID_REFRESH_TOKEN,
      expect.objectContaining({ ip: expect.any(String) }),
    );
  });

  it('rejeita refresh token do body quando não há cookie httpOnly', async () => {
    mockRequest.cookies.get = jest.fn().mockReturnValue(undefined);
    (mockRequest.json as jest.Mock).mockResolvedValue({ refreshToken: 'body-refresh-token' });

    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    expect(require('../../../lib/auth/token-service').refreshAccessToken).not.toHaveBeenCalledWith(
      'body-refresh-token',
      expect.any(Object),
    );
  });
});
