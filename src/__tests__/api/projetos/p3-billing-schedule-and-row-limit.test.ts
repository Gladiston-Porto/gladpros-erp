/**
 * @jest-environment node
 *
 * Unit tests for:
 *   GET /api/projetos/[id]/financeiro/billing-schedule
 *   P3.2 — health row limit warning (DATA_TRUNCATED alert)
 */

import { NextRequest } from 'next/server';

// ─── Billing Schedule mocks ───────────────────────────────────────────────────

const mockRequireProjectPermission = jest.fn();
const mockRequireProjectAccess = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectAccess: (...args: unknown[]) => mockRequireProjectAccess(...args),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/projetos/[id]/financeiro/billing-schedule/route';

const mockInvoiceFindMany = prisma.invoice.findMany as jest.Mock;

// ─── helpers ──────────────────────────────────────────────────────────────────

const adminUser = { id: 1, role: 'ADMIN', email: 'admin@test.com' };

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method: 'GET' });
}

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

const now = new Date();

function makeInvoice(overrides: Partial<{
  id: number; billingType: string; status: string; totalAmount: number;
}> = {}) {
  return {
    id: 1,
    invoiceNumber: 'INV-001',
    billingType: 'DEPOSIT',
    billingReference: null,
    status: 'DRAFT',
    totalAmount: 5000,
    dueDate: null,
    paidAt: null,
    issuedAt: now,
    ...overrides,
  };
}

// ─── GET /billing-schedule ────────────────────────────────────────────────────

describe('GET /api/projetos/[id]/financeiro/billing-schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockRequireProjectAccess.mockResolvedValue(undefined);
  });

  it('returns 200 with empty groups when no invoices', async () => {
    mockInvoiceFindMany.mockResolvedValue([]);
    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/billing-schedule');
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.groups).toHaveLength(0);
    expect(json.data.totalPlanned).toBe(0);
    expect(json.data.totalExecuted).toBe(0);
    expect(json.data.coveragePct).toBe(0);
  });

  it('separates planned (DRAFT) and executed (PAID) invoices', async () => {
    mockInvoiceFindMany.mockResolvedValue([
      makeInvoice({ id: 1, billingType: 'DEPOSIT', status: 'DRAFT', totalAmount: 3000 }),
      makeInvoice({ id: 2, billingType: 'DEPOSIT', status: 'PAID', totalAmount: 2000 }),
    ]);

    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/billing-schedule');
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    const depositGroup = json.data.groups.find((g: { billingType: string }) => g.billingType === 'DEPOSIT');
    expect(depositGroup.planned).toBe(3000);
    expect(depositGroup.executed).toBe(2000);
    expect(json.data.totalPlanned).toBe(3000);
    expect(json.data.totalExecuted).toBe(2000);
    expect(json.data.coveragePct).toBe(40); // 2000/(3000+2000)*100
  });

  it('groups multiple billing types in correct order', async () => {
    mockInvoiceFindMany.mockResolvedValue([
      makeInvoice({ id: 1, billingType: 'FINAL', status: 'DRAFT', totalAmount: 10000 }),
      makeInvoice({ id: 2, billingType: 'DEPOSIT', status: 'PAID', totalAmount: 5000 }),
    ]);

    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/billing-schedule');
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    const types = json.data.groups.map((g: { billingType: string }) => g.billingType);
    expect(types[0]).toBe('DEPOSIT');  // DEPOSIT comes before FINAL
    expect(types[1]).toBe('FINAL');
  });

  it('PARTIALLY_PAID counts as executed', async () => {
    mockInvoiceFindMany.mockResolvedValue([
      makeInvoice({ id: 1, billingType: 'PROGRESS', status: 'PARTIALLY_PAID', totalAmount: 8000 }),
    ]);

    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/billing-schedule');
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    const progressGroup = json.data.groups.find((g: { billingType: string }) => g.billingType === 'PROGRESS');
    expect(progressGroup.executed).toBe(8000);
    expect(progressGroup.planned).toBe(0);
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/financeiro/billing-schedule');
    const res = await GET(req, makeCtx('abc'));
    expect(res.status).toBe(400);
  });
});

// ─── P3.2 — DATA_TRUNCATED alert (unit) ───────────────────────────────────────

import { OPERATIONAL_ALERT_TYPES, FINANCIAL_ALERT_TYPES, PROJECT_HEALTH_ROW_LIMIT } from '@/domains/projects/services/project-health.service';

describe('P3.2 — DATA_TRUNCATED alert type and constants', () => {
  it('DATA_TRUNCATED is in OPERATIONAL_ALERT_TYPES', () => {
    expect(OPERATIONAL_ALERT_TYPES.has('DATA_TRUNCATED')).toBe(true);
  });

  it('DATA_TRUNCATED is NOT in FINANCIAL_ALERT_TYPES', () => {
    expect(FINANCIAL_ALERT_TYPES.has('DATA_TRUNCATED' as never)).toBe(false);
  });

  it('PROJECT_HEALTH_ROW_LIMIT is a positive number', () => {
    expect(PROJECT_HEALTH_ROW_LIMIT).toBeGreaterThan(0);
  });
});

