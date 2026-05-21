jest.mock('@/lib/prisma', () => ({
  prisma: {
    serviceOrder: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
  can: jest.fn(),
}));

jest.mock('@/shared/services/marginService', () => ({
  recalculateOSMargin: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { can, requireUser } from '@/shared/lib/rbac';

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

const { POST: generateInvoicePOST } = require('../[id]/generate-invoice/route');
const { PATCH: updateServiceOrderPATCH } = require('../[id]/route');

function jsonRequest(path: string, method: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('Service Orders P1 billing regressions', () => {
  const requireUserMock = requireUser as jest.Mock;
  const canMock = can as jest.Mock;
  const serviceOrderFindUniqueMock = prisma.serviceOrder.findUnique as jest.Mock;
  const serviceOrderFindFirstMock = prisma.serviceOrder.findFirst as jest.Mock;
  const invoiceFindFirstMock = prisma.invoice.findFirst as jest.Mock;
  const serviceOrderUpdateMock = prisma.serviceOrder.update as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: 10, role: 'ADMIN', empresaId: 1 });
    canMock.mockReturnValue(true);
  });

  it('requires invoices:create before generating an invoice from an OS', async () => {
    requireUserMock.mockResolvedValue({ id: 20, role: 'USUARIO', empresaId: 1 });
    canMock.mockImplementation((_role: string, moduleKey: string, action: string) => (
      moduleKey === 'service-orders' && action === 'update'
    ));

    const response = await generateInvoicePOST(
      jsonRequest('/api/service-orders/123/generate-invoice', 'POST'),
      { params: Promise.resolve({ id: '123' }) }
    );

    expect(response.status).toBe(403);
    expect(serviceOrderFindUniqueMock).not.toHaveBeenCalled();
  });

  it('blocks invoice generation for project-linked OS when the project already has an active invoice', async () => {
    serviceOrderFindFirstMock.mockResolvedValue({
      id: 123,
      ticketNumber: 'OS-2025-00123',
      status: 'COMPLETED',
      invoiceId: null,
      projetoId: 77,
      clienteId: 5,
      materialSupply: 'COMPANY_PROVIDES',
      agreedClientPrice: null,
      propertyType: 'RESIDENTIAL',
      serviceCategory: 'REPAIR',
      contractType: 'LUMP_SUM',
      serviceCity: 'Dallas',
      serviceState: 'TX',
      serviceZip: '75219',
      Cliente: { id: 5, nomeFantasia: null, nomeCompleto: 'John Smith' },
      Invoice: null,
      materials: [],
      workEntries: [],
    });
    invoiceFindFirstMock.mockResolvedValue({
      id: 900,
      numeroInvoice: 'INV-2025-00900',
      status: 'SENT',
    });

    const response = await generateInvoicePOST(
      jsonRequest('/api/service-orders/123/generate-invoice', 'POST'),
      { params: Promise.resolve({ id: '123' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.message).toContain('projeto já possui uma fatura ativa');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('locks structural edits when a service order is in WRITE_OFF status', async () => {
    serviceOrderFindUniqueMock.mockResolvedValue({
      id: 123,
      status: 'WRITE_OFF',
      scheduleDateStart: null,
      scheduleDateEnd: null,
    });

    const response = await updateServiceOrderPATCH(
      jsonRequest('/api/service-orders/123', 'PATCH', { hourlyRate: 125 }),
      { params: Promise.resolve({ id: '123' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toContain('Não é possível editar hourlyRate');
    expect(serviceOrderUpdateMock).not.toHaveBeenCalled();
  });
});
