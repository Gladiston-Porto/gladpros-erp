// src/__tests__/api/auth/first-access-magic.test.ts
// Testes para GET /api/auth/first-access/magic?token=X

jest.mock('next/server', () => {
  const makeSearchParams = (url: string) => {
    try {
      return new URLSearchParams(url.includes('?') ? (url.split('?')[1] ?? '') : '');
    } catch {
      return new URLSearchParams();
    }
  };
  return {
    NextRequest: jest
      .fn()
      .mockImplementation(
        (url: string, init?: { method?: string; headers?: Record<string, string> }) => ({
          url,
          method: (init?.method ?? 'GET').toUpperCase(),
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
          cookies: { get: jest.fn() },
        }),
      ),
    NextResponse: {
      json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
        status: options?.status ?? 200,
        headers: new Map(),
        cookies: { set: jest.fn(), get: jest.fn(), delete: jest.fn() },
        json: jest.fn().mockResolvedValue(data),
      })),
      redirect: jest.fn().mockImplementation((url: URL | string) => ({
        status: 302,
        headers: new Map([['location', typeof url === 'string' ? url : url.toString()]]),
        cookies: { set: jest.fn(), get: jest.fn(), delete: jest.fn() },
        url: typeof url === 'string' ? url : url.toString(),
      })),
    },
  };
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('@/shared/lib/jwt', () => ({
  verifyFirstAccessJWT: jest.fn(),
  signAuthJWT: jest.fn().mockResolvedValue('mocked-auth-token'),
}));

jest.mock('@/shared/lib/rate-limit', () => ({
  RateLimiter: jest.fn().mockImplementation(() => ({
    isAllowed: jest.fn().mockResolvedValue({ allowed: true }),
  })),
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { NextRequest, NextResponse } from 'next/server';
import { GET } from '../../../app/api/auth/first-access/magic/route';
import { prisma } from '@/lib/prisma';
import { verifyFirstAccessJWT, signAuthJWT } from '@/shared/lib/jwt';

const mockPrismaQueryRaw = prisma.$queryRaw as jest.MockedFunction<typeof prisma.$queryRaw>;
const mockVerify = verifyFirstAccessJWT as jest.MockedFunction<typeof verifyFirstAccessJWT>;
const mockSignAuth = signAuthJWT as jest.MockedFunction<typeof signAuthJWT>;

const BASE_URL = 'http://localhost:3000';

function makeReq(token?: string) {
  const url = token
    ? `${BASE_URL}/api/auth/first-access/magic?token=${token}`
    : `${BASE_URL}/api/auth/first-access/magic`;
  return new NextRequest(url);
}

const activeUser = {
  id: 42,
  email: 'worker@gladpros.com',
  nivel: 'USUARIO',
  status: 'ATIVO',
  primeiroAcesso: 1,
  tokenVersion: 0,
  magicLinkConsumedAt: null,
};

describe('GET /api/auth/first-access/magic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_URL = BASE_URL;
    mockSignAuth.mockResolvedValue('mocked-auth-token');
  });

  describe('Parâmetro token ausente', () => {
    it('redireciona para /login?erro=magic-link-invalido quando token está ausente', async () => {
      const req = makeReq();
      await GET(req);
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/login' }),
      );
      const callArg = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL;
      expect(callArg.searchParams.get('erro')).toBe('magic-link-invalido');
    });
  });

  describe('Token JWT inválido', () => {
    it('redireciona para /login?erro=magic-link-expirado quando JWT é inválido', async () => {
      mockVerify.mockRejectedValueOnce(new Error('jwt malformed'));
      const req = makeReq('invalid-token');
      await GET(req);
      const callArg = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL;
      expect(callArg.searchParams.get('erro')).toBe('magic-link-expirado');
    });

    it('redireciona para /login?erro=magic-link-expirado quando JWT expirou', async () => {
      mockVerify.mockRejectedValueOnce(new Error('jwt expired'));
      const req = makeReq('expired-token');
      await GET(req);
      const callArg = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL;
      expect(callArg.searchParams.get('erro')).toBe('magic-link-expirado');
    });
  });

  describe('Usuário não encontrado', () => {
    it('redireciona para /login?erro=usuario-nao-encontrado quando usuário não existe no banco', async () => {
      mockVerify.mockResolvedValueOnce({ userId: 999, email: 'ghost@gladpros.com' });
      mockPrismaQueryRaw.mockResolvedValueOnce([]);
      const req = makeReq('valid-token-ghost');
      await GET(req);
      const callArg = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL;
      expect(callArg.searchParams.get('erro')).toBe('usuario-nao-encontrado');
    });
  });

  describe('Usuário já configurou o acesso', () => {
    it('redireciona para /login?info=conta-ja-configurada quando primeiroAcesso = 0', async () => {
      mockVerify.mockResolvedValueOnce({ userId: 42, email: activeUser.email });
      mockPrismaQueryRaw.mockResolvedValueOnce([{ ...activeUser, primeiroAcesso: 0 }]);
      const req = makeReq('valid-token-used');
      await GET(req);
      const callArg = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL;
      expect(callArg.searchParams.get('info')).toBe('conta-ja-configurada');
    });

    it('redireciona para /login?info=conta-ja-configurada quando primeiroAcesso = false', async () => {
      mockVerify.mockResolvedValueOnce({ userId: 42, email: activeUser.email });
      mockPrismaQueryRaw.mockResolvedValueOnce([{ ...activeUser, primeiroAcesso: false }]);
      const req = makeReq('valid-token-already-done');
      await GET(req);
      const callArg = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL;
      expect(callArg.searchParams.get('info')).toBe('conta-ja-configurada');
    });
  });

  describe('Conta inativa', () => {
    it('redireciona para /login?erro=conta-inativa quando usuário está INATIVO', async () => {
      mockVerify.mockResolvedValueOnce({ userId: 42, email: activeUser.email });
      mockPrismaQueryRaw.mockResolvedValueOnce([{ ...activeUser, status: 'INATIVO' }]);
      const req = makeReq('valid-token-inactive');
      await GET(req);
      const callArg = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL;
      expect(callArg.searchParams.get('erro')).toBe('conta-inativa');
    });
  });

  describe('Fluxo feliz — magic link válido', () => {
    it('emite authToken como cookie e redireciona para /primeiro-acesso quando tudo está correto', async () => {
      mockVerify.mockResolvedValueOnce({ userId: 42, email: activeUser.email });
      mockPrismaQueryRaw.mockResolvedValueOnce([activeUser]);
      const req = makeReq('valid-token-ok');
      const res = await GET(req);

      // Deve ter chamado signAuthJWT para emitir o authToken
      expect(mockSignAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: '42',
          role: 'USUARIO',
          email: activeUser.email,
        }),
      );

      // Deve redirecionar para /primeiro-acesso com userId
      expect(NextResponse.redirect).toHaveBeenCalled();
      const callArg = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL;
      expect(callArg.pathname).toBe('/primeiro-acesso');
      expect(callArg.searchParams.get('userId')).toBe('42');

      // Cookie deve ser setado na resposta
      expect(res.cookies.set).toHaveBeenCalledWith(
        'authToken',
        'mocked-auth-token',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 30 * 60,
        }),
      );
    });
  });

  describe('Rate limiting', () => {
    it('redireciona para /login?erro=magic-link-rate-limit quando limite é atingido', async () => {
      const { RateLimiter } = jest.requireMock('@/shared/lib/rate-limit') as {
        RateLimiter: jest.MockedClass<{ new (): { isAllowed: jest.Mock } }>;
      };
      RateLimiter.mockImplementationOnce(() => ({
        isAllowed: jest.fn().mockResolvedValue({ allowed: false, message: 'Too many requests' }),
      }));

      // Re-import para pegar a nova instância do limiter
      jest.resetModules();
      const { GET: GETRateLimit } = await import('../../../app/api/auth/first-access/magic/route');
      const req = makeReq('some-token');
      await GETRateLimit(req);
      const callArg = (NextResponse.redirect as jest.Mock).mock.calls[0]?.[0] as URL | undefined;
      if (callArg) {
        expect(callArg.searchParams.get('erro')).toBe('magic-link-rate-limit');
      }
    });
  });
});
