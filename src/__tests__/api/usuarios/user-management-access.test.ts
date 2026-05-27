// @bug:USUARIOS-P2-005 — teste de regressão: empresaId no where do checkUserManagementAccess
// @bug:USUARIOS-P2-006 — teste de regressão: cobertura mantida após migração do diretório oficial de testes
// Movido de src/app/api/usuarios/__tests__/ para src/__tests__/api/usuarios/ (P2-006)
jest.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { UserRole } from '@/shared/lib/user-hierarchy';

const { Request, Response, Headers } = require('node-fetch');
Object.assign(global, { Request, Response, Headers });
if (typeof Response.json !== 'function') {
  Response.json = (data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
}

const {
  canAccessSessionOwner,
  checkUserManagementAccess,
  getSessionOwner,
} = require('@/app/api/usuarios/_helpers/access');

describe('user management hierarchy access', () => {
  const findUniqueMock = prisma.usuario.findUnique as jest.Mock;
  const queryRawMock = prisma.$queryRaw as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks GERENTE from managing ADMIN security side endpoints', async () => {
    findUniqueMock.mockResolvedValue({ nivel: UserRole.ADMIN });

    const result = await checkUserManagementAccess(
      { id: 2, role: UserRole.GERENTE, empresaId: 1 },
      1,
      { allowSelf: true },
    );

    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.response.status).toBe(403);
  });

  it('allows GERENTE to manage USUARIO side endpoints', async () => {
    findUniqueMock.mockResolvedValue({ nivel: UserRole.USUARIO });

    const result = await checkUserManagementAccess(
      { id: 2, role: UserRole.GERENTE, empresaId: 1 },
      3,
      { allowSelf: true },
    );

    expect(result.allowed).toBe(true);
  });

  it('allows users to access their own session/security data when explicitly allowed', async () => {
    findUniqueMock.mockResolvedValue({ nivel: UserRole.ADMIN });

    const result = await checkUserManagementAccess(
      { id: 1, role: UserRole.ADMIN, empresaId: 1 },
      1,
      { allowSelf: true },
    );

    expect(result.allowed).toBe(true);
  });

  it('resolves session owner before authorizing session revocation by raw session id', async () => {
    queryRawMock.mockResolvedValue([{ usuarioId: 1, nivel: UserRole.ADMIN }]);

    const owner = await getSessionOwner(10);

    expect(owner).toEqual({ usuarioId: 1, nivel: UserRole.ADMIN });
    expect(canAccessSessionOwner({ id: 2, role: UserRole.GERENTE }, owner!)).toBe(false);
    expect(canAccessSessionOwner({ id: 1, role: UserRole.ADMIN }, owner!)).toBe(true);
  });

  // @bug:USUARIOS-P2-005 — regressão: empresaId deve ser passado ao findUnique
  it('passes empresaId to findUnique to prevent cross-tenant IDOR', async () => {
    findUniqueMock.mockResolvedValue({ nivel: UserRole.USUARIO });

    await checkUserManagementAccess({ id: 2, role: UserRole.GERENTE, empresaId: 1 }, 3, {
      allowSelf: false,
    });

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 3, empresaId: 1 }),
      }),
    );
  });
});
