/**
 * @jest-environment node
 *
 * Unit tests for POST /api/projetos/[id]/invoices/gerar
 * Covers: auth, RBAC (invoices.create), validation, rate-limit bypass,
 *         gateway success, gateway failure, 500 on missing invoice.
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();
const mockRequireProjectAccess = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectAccess: (...args: unknown[]) => mockRequireProjectAccess(...args),
}));

const mockCan = jest.fn();

jest.mock('@/shared/lib/rbac-core', () => ({
  can: (...args: unknown[]) => mockCan(...args),
}));

const mockIsAllowed = jest.fn();

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  },
}));

const mockGerarInvoice = jest.fn();
const mockBuscarInvoice = jest.fn();

jest.mock('@/domains/projects/gateways/prisma-finance.gateway', () => ({
  getPrismaFinanceGateway: () => ({
    gerarInvoice: (...args: unknown[]) => mockGerarInvoice(...args),
    buscarInvoice: (...args: unknown[]) => mockBuscarInvoice(...args),
  }),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { POST } from '@/app/api/projetos/[id]/invoices/gerar/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };
const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

const validBody = {
  descricao: 'Invoice de progresso — Fase 1',
  dataVencimento: '2026-06-01T00:00:00.000Z',
  billingType: 'PROGRESS',
  incluirProposta: true,
  incluirMateriais: false,
  itensAdicionais: [],
};

const mockInvoice = {
  id: 101,
  numeroInvoice: 'INV-2026-0001',
  projetoId: 42,
  numeroProjeto: 'PRJ-2026-0042',
  clienteNome: 'Acme Corp',
  status: 'DRAFT',
  descricao: validBody.descricao,
  dataEmissao: new Date().toISOString(),
  dataVencimento: validBody.dataVencimento,
  itens: [],
  subtotal: 0,
  desconto: 0,
  valorTotal: 0,
  valorPago: 0,
  observacoes: null,
  criadoEm: new Date().toISOString(),
};

function makeReq(body: unknown) {
  return new NextRequest(
    new URL('http://localhost:3000/api/projetos/42/invoices/gerar'),
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

describe('POST /api/projetos/[id]/invoices/gerar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockRequireProjectAccess.mockResolvedValue(undefined);
    mockCan.mockReturnValue(true);
    mockIsAllowed.mockResolvedValue({ allowed: true, resetTime: Date.now() + 60000 });
    mockGerarInvoice.mockResolvedValue({ sucesso: true, invoiceId: 101 });
    mockBuscarInvoice.mockResolvedValue(mockInvoice);
  });

  it('returns 201 with invoice data on success', async () => {
    const res = await POST(makeReq(validBody), makeCtx('42'));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.invoiceId).toBe(101);
    expect(json.data.numeroInvoice).toBe('INV-2026-0001');
    expect(json.data.status).toBe('DRAFT');
  });

  it('passes correct params to gateway', async () => {
    await POST(makeReq(validBody), makeCtx('42'));
    expect(mockGerarInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        projetoId: 42,
        usuarioId: 1,
        billingType: 'PROGRESS',
        descricao: validBody.descricao,
        incluirProposta: true,
        incluirMateriais: false,
      }),
    );
  });

  it('returns 403 when user lacks invoices.create permission', async () => {
    mockCan.mockReturnValue(false);
    const res = await POST(makeReq(validBody), makeCtx('42'));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 429 when rate-limited', async () => {
    mockIsAllowed.mockResolvedValue({ allowed: false, resetTime: Date.now() + 30000 });
    const res = await POST(makeReq(validBody), makeCtx('42'));
    expect(res.status).toBe(429);
  });

  it('returns 400 for invalid project ID', async () => {
    const res = await POST(makeReq(validBody), makeCtx('abc'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing descricao', async () => {
    const res = await POST(makeReq({ ...validBody, descricao: '' }), makeCtx('42'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 for invalid dataVencimento', async () => {
    const res = await POST(makeReq({ ...validBody, dataVencimento: 'not-a-date' }), makeCtx('42'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when item valorTotal does not match qty * unit', async () => {
    const body = {
      ...validBody,
      itensAdicionais: [
        { descricao: 'Item X', tipo: 'MATERIAL', quantidade: 2, valorUnitario: 100, valorTotal: 150 },
      ],
    };
    const res = await POST(makeReq(body), makeCtx('42'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when gateway reports failure', async () => {
    mockGerarInvoice.mockResolvedValue({ sucesso: false, mensagem: 'Projeto já possui invoice FINAL' });
    const res = await POST(makeReq(validBody), makeCtx('42'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe('Projeto já possui invoice FINAL');
  });

  it('returns 500 when invoice not found after creation', async () => {
    mockBuscarInvoice.mockResolvedValue(null);
    const res = await POST(makeReq(validBody), makeCtx('42'));
    expect(res.status).toBe(500);
  });
});
