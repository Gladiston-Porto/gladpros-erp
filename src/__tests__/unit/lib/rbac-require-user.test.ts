/**
 * Testes unitários para requireUser (rbac.ts)
 *
 * Foco: bloqueio imediato de usuários INATIVO quando RBAC_TRUST_JWT=0
 * e verificação do comportamento do modo RBAC_TRUST_JWT=1
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/shared/lib/jwt', () => ({
  verifyAuthJWT: jest.fn(),
}));

jest.mock('@/shared/lib/db-metadata', () => ({
  hasTokenVersionColumn: jest.fn().mockResolvedValue(true),
}));

import { prisma } from '@/lib/prisma';
import { verifyAuthJWT } from '@/shared/lib/jwt';
import { requireUser } from '@/shared/lib/rbac';

const mockQueryRaw = prisma.$queryRaw as jest.Mock;
const mockVerify = verifyAuthJWT as jest.Mock;

function makeRequest(token?: string, sessionToken?: string) {
  return {
    cookies: {
      get: (name: string) => {
        if (name === 'authToken' && token) return { value: token };
        if (name === 'sessionToken' && sessionToken) return { value: sessionToken };
        return undefined;
      },
    },
    headers: {
      get: () => null,
    },
  } as unknown as import('next/server').NextRequest;
}

const validClaims = {
  sub: '10',
  role: 'USUARIO',
  email: 'worker@test.com',
  status: 'ATIVO',
  tokenVersion: 3,
  iat: Math.floor(Date.now() / 1000) - 100,
  exp: Math.floor(Date.now() / 1000) + 3600,
};

describe('requireUser — bloqueio de usuário INATIVO', () => {
  const originalEnv = process.env.RBAC_TRUST_JWT;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RBAC_TRUST_JWT;
    mockVerify.mockResolvedValue(validClaims);
  });

  afterEach(() => {
    if (originalEnv !== undefined) process.env.RBAC_TRUST_JWT = originalEnv;
    else delete process.env.RBAC_TRUST_JWT;
  });

  it('RBAC_TRUST_JWT=0: bloqueia usuário com status INATIVO no DB', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ nivel: 'USUARIO', status: 'INATIVO', tokenVersion: 3 }]);
    await expect(requireUser(makeRequest('valid.jwt.token'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('RBAC_TRUST_JWT=0: permite usuário com status ATIVO no DB', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ nivel: 'USUARIO', status: 'ATIVO', tokenVersion: 3 }]);
    const user = await requireUser(makeRequest('valid.jwt.token'));
    expect(user.role).toBe('USUARIO');
    expect(user.status).toBe('ATIVO');
  });

  it('RBAC_TRUST_JWT=0: bloqueia tokenVersion desatualizado (sessão invalidada)', async () => {
    // Admin desativou e incrementou tokenVersion para 4, JWT ainda tem 3
    mockQueryRaw.mockResolvedValueOnce([{ nivel: 'USUARIO', status: 'ATIVO', tokenVersion: 4 }]);
    await expect(requireUser(makeRequest('valid.jwt.token'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('RBAC_TRUST_JWT=0: sem token → UNAUTHENTICATED', async () => {
    await expect(requireUser(makeRequest())).rejects.toThrow('UNAUTHENTICATED');
  });

  it('RBAC_TRUST_JWT=1: token legado sem sessionId ainda usa JWT sem DB check', async () => {
    process.env.RBAC_TRUST_JWT = '1';
    const user = await requireUser(makeRequest('valid.jwt.token'));
    expect(mockQueryRaw).not.toHaveBeenCalled();
    expect(user.role).toBe('USUARIO');
  });

  it('RBAC_TRUST_JWT=1: token com sessionId exige sessão ativa no DB', async () => {
    // @bug:AUTH-P1-004
    process.env.RBAC_TRUST_JWT = '1';
    mockVerify.mockResolvedValue({ ...validClaims, sessionId: 33 });
    mockQueryRaw
      .mockResolvedValueOnce([{ nivel: 'USUARIO', status: 'ATIVO', tokenVersion: 3 }])
      .mockResolvedValueOnce([]);

    await expect(requireUser(makeRequest('valid.jwt.token', 'revoked-session'))).rejects.toThrow(
      'UNAUTHENTICATED',
    );

    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
  });

  it('RBAC_TRUST_JWT=0: usuário não encontrado no DB → UNAUTHENTICATED', async () => {
    mockQueryRaw.mockResolvedValueOnce([]); // sem resultado
    await expect(requireUser(makeRequest('valid.jwt.token'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('RBAC_TRUST_JWT=0: JWT vinculado à sessão exige sessionToken válido', async () => {
    mockVerify.mockResolvedValue({ ...validClaims, sessionId: 33 });
    mockQueryRaw
      .mockResolvedValueOnce([{ nivel: 'USUARIO', status: 'ATIVO', tokenVersion: 3 }])
      .mockResolvedValueOnce([]);

    await expect(requireUser(makeRequest('valid.jwt.token'))).rejects.toThrow('UNAUTHENTICATED');
  });
});
