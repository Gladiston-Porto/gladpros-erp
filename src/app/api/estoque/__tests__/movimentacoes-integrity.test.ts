jest.mock('@/lib/prisma', () => ({
  prisma: {
    material: {
      findUnique: jest.fn(),
    },
    materialSaldo: {
      findFirst: jest.fn(),
    },
    materialMovimentacao: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';

const { Request, Response, Headers } = require('node-fetch');
Object.assign(global, { Request, Response, Headers });
if (typeof Response.json !== 'function') {
  Response.json = (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

const { POST } = require('../movimentacoes/route');

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/estoque/movimentacoes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Estoque movimentacoes integrity', () => {
  const requireUserMock = requireUser as jest.Mock;
  const canMock = can as jest.Mock;
  const materialFindUniqueMock = prisma.material.findUnique as jest.Mock;
  const materialSaldoFindFirstMock = prisma.materialSaldo.findFirst as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: 1, role: 'ESTOQUE', empresaId: 1 });
    canMock.mockReturnValue(true);
    materialFindUniqueMock.mockResolvedValue({ id: 10, nome: 'Romex 12/2' });
  });

  it('blocks manual SAIDA that would consume stock already reserved for projects or OS', async () => {
    materialSaldoFindFirstMock.mockResolvedValue({
      id: 55,
      materialId: 10,
      localizacaoId: 1,
      loteId: null,
      quantidade: 10,
      reservado: 8,
    });

    const response = await POST(jsonRequest({
      tipo: 'SAIDA',
      materialId: 10,
      localizacaoOrigemId: 1,
      quantidade: 3,
      motivo: 'Uso manual em campo',
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Saldo insuficiente na localização de origem');
    expect(body.details).toEqual({
      saldoDisponivel: 2,
      quantidadeSolicitada: 3,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
