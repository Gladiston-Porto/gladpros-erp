/**
 * @jest-environment node
 *
 * Unit tests for anexos routes:
 *   GET/POST  /api/projetos/[id]/anexos
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();
const mockRequireProjectAccess = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectAccess: (...args: unknown[]) => mockRequireProjectAccess(...args),
}));

const mockListarPorProjeto = jest.fn();
const mockCriar = jest.fn();
const mockProjetoAnexoCount = jest.fn().mockResolvedValue(1);

jest.mock('@/domains/projects/services/ProjectAttachmentService', () => ({
  ProjectAttachmentService: jest.fn().mockImplementation(() => ({
    listarPorProjeto: mockListarPorProjeto,
    criar: mockCriar,
  })),
}));

jest.mock('@/domains/projects/validators', () => ({
  createProjetoAnexoSchema: { parse: jest.fn((v: unknown) => v) },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    projetoAnexo: {
      count: (...args: unknown[]) => mockProjetoAnexoCount(...args),
    },
  },
}));

import {
  GET as getAnexos,
  POST as postAnexo,
} from '@/app/api/projetos/[id]/anexos/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };
const usuarioUser = { id: '5', role: 'USUARIO', email: 'user@test.com' };

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/projetos/[id]/anexos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockListarPorProjeto.mockResolvedValue([
      { id: 1, nome: 'planta.pdf', url: 'https://storage/planta.pdf', tipo: 'application/pdf' },
    ]);
  });

  it('returns 200 with anexos list', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/anexos');
    const res = await getAnexos(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].nome).toBe('planta.pdf');
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/anexos');
    const res = await getAnexos(req, makeCtx('abc'));

    expect(res.status).toBe(400);
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/anexos');

    await expect(getAnexos(req, makeCtx('1'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when no permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/anexos');

    await expect(getAnexos(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });

  it('returns empty array when no anexos', async () => {
    mockListarPorProjeto.mockResolvedValue([]);
    const req = makeRequest('http://localhost:3000/api/projetos/2/anexos');
    const res = await getAnexos(req, makeCtx('2'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(0);
  });
});

describe('POST /api/projetos/[id]/anexos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockCriar.mockResolvedValue({
      id: 1,
      nome: 'foto.jpg',
      url: 'https://storage/foto.jpg',
      tipo: 'image/jpeg',
      projetoId: 1,
    });
  });

  it('returns 201 with created anexo', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/anexos', 'POST', {
      nome: 'foto.jpg',
      url: 'https://storage/foto.jpg',
      tipo: 'image/jpeg',
    });
    const res = await postAnexo(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.nome).toBe('foto.jpg');
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/anexos', 'POST', {
      nome: 'doc.pdf',
      url: 'https://storage/doc.pdf',
    });
    const res = await postAnexo(req, makeCtx('abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role (canUploadAttachments)', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/anexos', 'POST', {
      nome: 'doc.pdf',
      url: 'https://storage/doc.pdf',
    });

    await expect(postAnexo(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });

  it('allows USUARIO role with canUploadAttachments permission', async () => {
    mockRequireProjectPermission.mockResolvedValue(usuarioUser);
    const req = makeRequest('http://localhost:3000/api/projetos/1/anexos', 'POST', {
      nome: 'relatorio.pdf',
      url: 'https://storage/relatorio.pdf',
      tipo: 'application/pdf',
    });
    const res = await postAnexo(req, makeCtx('1'));

    expect(res.status).toBe(201);
  });
});
