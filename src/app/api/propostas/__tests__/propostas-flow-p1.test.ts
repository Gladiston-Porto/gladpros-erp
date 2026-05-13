jest.mock('@/lib/prisma', () => ({
  prisma: {
    proposta: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    propostaLog: {
      create: jest.fn(),
    },
    usuario: {
      findMany: jest.fn(),
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

jest.mock('@/shared/lib/notifications', () => ({
  NotificationService: {
    create: jest.fn(),
  },
}));

jest.mock('@/shared/lib/cache', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { cancelProposal } from '@/domains/proposals/services';

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

const { POST: expireProposalsPOST } = require('../expirar/route');
const { GET: followUpCronGET } = require('../../cron/propostas/follow-up/route');

function request(path: string, headers?: HeadersInit) {
  return new Request(`http://localhost${path}`, { method: 'POST', headers });
}

describe('Propostas P1 flow regressions', () => {
  const propostaFindFirstMock = prisma.proposta.findFirst as jest.Mock;
  const requireUserMock = requireUser as jest.Mock;

  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = originalCronSecret;
    requireUserMock.mockResolvedValue({ id: '1', role: 'ADMIN', empresaId: 1 });
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  it('blocks cancellation when a proposal is already linked to a project', async () => {
    propostaFindFirstMock.mockResolvedValue({
      id: 10,
      status: 'APROVADA',
      projetoId: 77,
      deletedAt: null,
    });

    const result = await cancelProposal(10, 'Cliente pediu cancelamento', {
      actorId: '1',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result).toEqual({
      success: false,
      error: 'Proposta já vinculada a projeto. Cancele ou reverta o projeto antes de cancelar a proposta.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('fails closed for proposal expiry cron calls when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET;

    const response = await expireProposalsPOST(request('/api/propostas/expirar', {
      authorization: 'Bearer any-token',
    }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe('CRON_SECRET não configurado');
    expect(requireUserMock).not.toHaveBeenCalled();
  });

  it('fails closed for proposal follow-up cron when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET;

    const response = await followUpCronGET(request('/api/cron/propostas/follow-up', {
      authorization: 'Bearer any-token',
    }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe('CRON_SECRET não configurado');
  });
});
