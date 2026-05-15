/**
 * @jest-environment node
 *
 * Unit tests for PATCH /api/projetos/[id]/status
 */

import { NextRequest } from 'next/server';

const mockRequireProjectOwnershipPermission = jest.fn();
const mockRequireProjectPermission = jest.fn();
const mockRequireProjectAccess = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectOwnershipPermission: (...args: unknown[]) => mockRequireProjectOwnershipPermission(...args),
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectAccess: (...args: unknown[]) => mockRequireProjectAccess(...args),
}));

const mockAlterarStatus = jest.fn();

jest.mock('@/domains/projects/services/ProjectService', () => ({
  ProjectService: jest.fn().mockImplementation(() => ({
    alterarStatus: mockAlterarStatus,
  })),
}));

jest.mock('@/domains/projects/validators', () => ({
  alterarStatusProjetoSchema: {
    parse: jest.fn((v: unknown) => {
      const obj = v as Record<string, unknown>;
      if (!obj.novoStatus) throw new Error('Validation failed');
      return v;
    }),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    projeto: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { PATCH } from '@/app/api/projetos/[id]/status/route';
import { prisma } from '@/lib/prisma';

const mockFindUnique = prisma.projeto.findUnique as jest.Mock;

function makeRequest(url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };
const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe('PATCH /api/projetos/[id]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectOwnershipPermission.mockResolvedValue(adminUser);
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue({ id: 1, status: 'planejado', responsavelId: 1 });
  });

  it('returns 200 with updated project status', async () => {
    mockAlterarStatus.mockResolvedValue({ id: 1, status: 'em_execucao' });

    const req = makeRequest('http://localhost:3000/api/projetos/1/status', {
      novoStatus: 'em_execucao',
    });
    const res = await PATCH(req, makeContext('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('em_execucao');
    expect(json.success).toBe(true);
  });

  it('throws validation error for missing novoStatus', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/status', {});

    await expect(PATCH(req, makeContext('1'))).rejects.toThrow('Validation failed');
  });

  it('returns 404 when project not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = makeRequest('http://localhost:3000/api/projetos/999/status', {
      novoStatus: 'em_execucao',
    });
    const res = await PATCH(req, makeContext('999'));

    expect(res.status).toBe(404);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/status', {
      novoStatus: 'em_execucao',
    });

    await expect(PATCH(req, makeContext('1'))).rejects.toThrow('FORBIDDEN');
  });
});
