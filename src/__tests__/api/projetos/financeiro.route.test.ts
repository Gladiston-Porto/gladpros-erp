/**
 * @jest-environment node
 *
 * Unit tests for financial resumo route:
 *   GET /api/projetos/[id]/financeiro/resumo
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();
const mockShouldMaskFinancials = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  shouldMaskFinancials: (...args: unknown[]) => mockShouldMaskFinancials(...args),
}));

const mockObterResumoFinanceiro = jest.fn();

jest.mock('@/domains/projects/gateways', () => ({
  getFinanceGateway: jest.fn(() => ({
    obterResumoFinanceiro: mockObterResumoFinanceiro,
  })),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { GET } from '@/app/api/projetos/[id]/financeiro/resumo/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };
const gerenteUser = { id: '2', role: 'GERENTE', email: 'gerente@test.com' };

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method: 'GET' });
}

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

const fullResumo = {
  projetoId: 1,
  numeroProjeto: 'PROJ-001',
  valorOrcado: 50000,
  valorMateriais: 15000,
  valorFaturado: 30000,
  valorPago: 20000,
  valorPendente: 10000,
  totalInvoices: 5,
  invoicesPendentes: 2,
  invoicesPagos: 2,
  invoicesVencidos: 1,
  margem: 35000,
  percentualMargem: 70,
  atualizadoEm: new Date().toISOString(),
};

describe('GET /api/projetos/[id]/financeiro/resumo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockShouldMaskFinancials.mockReturnValue(false);
    mockObterResumoFinanceiro.mockResolvedValue(fullResumo);
  });

  it('returns 200 with full financial data for ADMIN', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/resumo');
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.valorOrcado).toBe(50000);
    expect(json.data.valorPago).toBe(20000);
    expect(json.data.percentualMargem).toBeDefined();
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/financeiro/resumo');
    const res = await GET(req, makeCtx('abc'));

    expect(res.status).toBe(400);
    expect((await res.json()).success).toBe(false);
  });

  it('returns 404 when project not found (empty resumo)', async () => {
    mockObterResumoFinanceiro.mockResolvedValue({ numeroProjeto: null });
    const req = makeRequest('http://localhost:3000/api/projetos/999/financeiro/resumo');
    const res = await GET(req, makeCtx('999'));

    expect(res.status).toBe(404);
    expect((await res.json()).success).toBe(false);
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/resumo');

    await expect(GET(req, makeCtx('1'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when no canViewFinancials permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/resumo');

    await expect(GET(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });

  it('masks financial values for non-finance roles (GERENTE)', async () => {
    mockRequireProjectPermission.mockResolvedValue(gerenteUser);
    mockShouldMaskFinancials.mockReturnValue(true);

    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/resumo');
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // Masked: financial fields not returned
    expect(json.data.valorOrcado).toBeUndefined();
    expect(json.data.valorMateriais).toBeUndefined();
    expect(json.data.valorFaturado).toBeUndefined();
    expect(json.data.valorPago).toBeUndefined();
    expect(json.data.margem).toBeUndefined();
    expect(json.data.percentualMargem).toBeUndefined();
    // Non-sensitive fields still present
    expect(json.data.projetoId).toBe(1);
    expect(json.data.numeroProjeto).toBe('PROJ-001');
    expect(json.data.totalInvoices).toBe(5);
  });

  it('returns full data for ADMIN (no masking)', async () => {
    mockShouldMaskFinancials.mockReturnValue(false);

    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/resumo');
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    expect(json.data.valorOrcado).toBe(50000);
    expect(json.data.valorMateriais).toBe(15000);
    expect(json.data.valorPago).toBe(20000);
    expect(json.data.invoicesPendentes).toBe(2);
    expect(json.data.invoicesVencidos).toBe(1);
  });
});
