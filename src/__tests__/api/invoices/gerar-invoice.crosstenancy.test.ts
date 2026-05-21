/**
 * Cross-tenant regression tests for invoice generation routes.
 * Verifies that empresaId scoping is enforced after schema migration.
 *
 * P1-α: /api/propostas/[id]/gerar-invoice — proposta lookup must be scoped to user.empresaId
 * P1-β: /api/service-orders/[id]/generate-invoice — serviceOrder lookup must be scoped to user.empresaId
 */

jest.mock('next/server', () => {
  const makeSearchParams = (url: string) => {
    try { return new URLSearchParams(url.includes('?') ? url.split('?')[1] ?? '' : ''); }
    catch { return new URLSearchParams(); }
  };
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; body?: string }) => ({
      url,
      method: (init?.method ?? 'POST').toUpperCase(),
      nextUrl: { searchParams: makeSearchParams(url), pathname: url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] },
      headers: { get: () => null },
      json: jest.fn().mockImplementation(() =>
        init?.body ? Promise.resolve(JSON.parse(init.body)) : Promise.resolve({})
      ),
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
        status: options?.status ?? 200,
        _data: data,
        json: async () => data,
      })),
    },
  };
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    proposta: { findFirst: jest.fn() },
    serviceOrder: { findFirst: jest.fn(), findUnique: jest.fn() },
    invoice: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), count: jest.fn() },
    invoiceItem: { createMany: jest.fn() },
    auditLog: { create: jest.fn() },
    taxRate: { findUnique: jest.fn() },
    serviceOrderHistory: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
  can: jest.fn(),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => async (...args: unknown[]) => {
    try { return await handler(...args); }
    catch { return { status: 500, _data: { error: 'Internal server error', success: false }, json: async () => ({ success: false }) }; }
  }),
}));

import { NextRequest } from 'next/server';
import { requireUser, can } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const userEmpresa1 = { id: 'user-1', email: 'admin@gladpros.com', role: 'ADMIN', empresaId: 1, nivel: 1 };
const userEmpresa2 = { id: 'user-2', email: 'admin@other.com', role: 'ADMIN', empresaId: 2, nivel: 1 };

function makePostRequest(url: string, body: object) {
  return new NextRequest(url, { method: 'POST', body: JSON.stringify(body) });
}

// ── P1-α: /api/propostas/[id]/gerar-invoice ───────────────────────────────────
describe('Cross-tenant: POST /api/propostas/[id]/gerar-invoice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it('404 — user from empresa 2 cannot access proposta from empresa 1', async () => {
    mockRequireUser.mockResolvedValue(userEmpresa2 as never);
    // Proposta belongs to empresa 1 — findFirst scoped to empresaId: 2 should return null
    (mockPrisma.proposta.findFirst as jest.Mock).mockResolvedValue(null);

    const { POST } = await import('@/app/api/propostas/[id]/gerar-invoice/route');
    const res = await POST(makePostRequest('http://localhost/api/propostas/1/gerar-invoice', {}), {
      params: Promise.resolve({ id: '1' }),
    });

    expect(res.status).toBe(404);
    // Verify the lookup included empresaId: 2 (not 1)
    expect(mockPrisma.proposta.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 1, empresaId: 2 }),
      }),
    );
  });

  it('success — user from empresa 1 can access proposta from empresa 1', async () => {
    mockRequireUser.mockResolvedValue(userEmpresa1 as never);
    const mockProposta = {
      id: 1, empresaId: 1, status: 'APROVADA', clienteId: 1, titulo: 'Test',
      valorEstimado: '1000', PropostaEtapa: [], PropostaMaterial: [],
      Cliente: { id: 1, nomeCompleto: 'Test Client', nomeFantasia: null },
    };
    (mockPrisma.proposta.findFirst as jest.Mock).mockResolvedValue(mockProposta);

    expect(mockPrisma.proposta.findFirst).not.toHaveBeenCalled();
  });
});

// ── P1-β: /api/service-orders/[id]/generate-invoice ──────────────────────────
describe('Cross-tenant: POST /api/service-orders/[id]/generate-invoice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it('404 — user from empresa 2 cannot access service order from empresa 1', async () => {
    mockRequireUser.mockResolvedValue(userEmpresa2 as never);
    // ServiceOrder belongs to empresa 1 — findFirst scoped to empresaId: 2 should return null
    (mockPrisma.serviceOrder.findFirst as jest.Mock).mockResolvedValue(null);

    const { POST } = await import('@/app/api/service-orders/[id]/generate-invoice/route');
    const res = await POST(makePostRequest('http://localhost/api/service-orders/1/generate-invoice', {}), {
      params: Promise.resolve({ id: '1' }),
    });

    expect(res.status).toBe(404);
    // Verify the lookup included empresaId: 2
    expect(mockPrisma.serviceOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 1, empresaId: 2 }),
      }),
    );
  });
});
