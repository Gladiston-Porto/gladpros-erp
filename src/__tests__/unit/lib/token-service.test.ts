// @bug:AUTH-P1-003
// @description: refresh token não pode ser consumido duas vezes em corrida
// @fix: src/lib/auth/token-service.ts - refreshAccessToken usa updateMany condicional para consumo atômico

jest.mock('@/lib/prisma', () => ({
  prisma: {
    refreshToken: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/security/kms', () => ({
  KMS: {
    deriveJWTKey: jest.fn(),
    getAllValidKeys: jest.fn(),
  },
}));

jest.mock('@/shared/lib/jwt', () => ({
  signAuthJWT: jest.fn(),
}));

import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { signAuthJWT } from '@/shared/lib/jwt';
import { refreshAccessToken } from '@/lib/auth/token-service';

const mockFindUnique = prisma.refreshToken.findUnique as jest.Mock;
const mockUpdateMany = prisma.refreshToken.updateMany as jest.Mock;
const mockCreate = prisma.refreshToken.create as jest.Mock;
const mockFindUser = prisma.usuario.findUnique as jest.Mock;
const mockSignAuthJWT = signAuthJWT as jest.Mock;

describe('token-service refreshAccessToken', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters!!';
    process.env.NODE_ENV = 'test';

    mockFindUnique.mockResolvedValue({
      id: 11,
      usuarioId: 7,
      jti: 'refresh-jti-1',
      revogado: false,
      usadoEm: null,
      expiraEm: new Date(Date.now() + 60_000),
      usuario: { id: 7 },
    });
    mockFindUser.mockResolvedValue({
      id: 7,
      email: 'user@test.local',
      nivel: 'USUARIO',
      status: 'ATIVO',
      tokenVersion: 3,
    });
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockCreate.mockResolvedValue({ id: 12 });
    mockSignAuthJWT.mockResolvedValue('new-access-token');
  });

  afterEach(() => {
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;

    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('rotaciona o refresh token quando o consumo atômico retorna count=1', async () => {
    const oldRefreshToken = jwt.sign(
      {
        userId: 7,
        email: 'user@test.local',
        nivel: 'USUARIO',
        jti: 'refresh-jti-1',
        type: 'refresh',
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' },
    );

    const result = await refreshAccessToken(oldRefreshToken, {
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result.accessToken).toBe('new-access-token');
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ jti: 'refresh-jti-1', usadoEm: null, revogado: false }),
      }),
    );
    expect(mockCreate).toHaveBeenCalled();
  });

  it('bloqueia reutilização concorrente quando o consumo atômico retorna count=0', async () => {
    const oldRefreshToken = jwt.sign(
      {
        userId: 7,
        email: 'user@test.local',
        nivel: 'USUARIO',
        jti: 'refresh-jti-1',
        type: 'refresh',
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' },
    );
    mockUpdateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 4 });

    await expect(
      refreshAccessToken(oldRefreshToken, { ip: '127.0.0.1', userAgent: 'jest' }),
    ).rejects.toThrow('Token já foi usado');

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { usuarioId: 7, revogado: false },
        data: expect.objectContaining({
          motivoRevogacao: expect.stringContaining('reutilização concorrente'),
        }),
      }),
    );
  });
});
