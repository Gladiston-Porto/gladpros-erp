/**
 * @jest-environment node
 *
 * Unit tests for PATCH /api/projetos/[id]/health/alerts/[alertId]
 * Covers: auth, RBAC (requires financeiro.update), validation, 404, success.
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

const mockUpdateAlert = jest.fn();

jest.mock('@/domains/projects/services/project-health-alert.service', () => ({
  updateProjectHealthAlertStatus: (...args: unknown[]) => mockUpdateAlert(...args),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { PATCH } from '@/app/api/projetos/[id]/health/alerts/[alertId]/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };
const makeCtx = (id: string, alertId: string) => ({ params: Promise.resolve({ id, alertId }) });

function makeReq(body: unknown) {
  return new NextRequest(
    new URL('http://localhost:3000/api/projetos/42/health/alerts/7'),
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

describe('PATCH /api/projetos/[id]/health/alerts/[alertId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockRequireProjectAccess.mockResolvedValue(undefined);
    mockCan.mockReturnValue(true);
    mockUpdateAlert.mockResolvedValue({ count: 1 });
  });

  it('returns 200 when alert is acknowledged successfully', async () => {
    const res = await PATCH(makeReq({ status: 'ACKNOWLEDGED' }), makeCtx('42', '7'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.updated).toBe(1);
    expect(mockUpdateAlert).toHaveBeenCalledWith(42, 7, 'ACKNOWLEDGED', 1);
  });

  it('returns 200 when alert is resolved successfully', async () => {
    const res = await PATCH(makeReq({ status: 'RESOLVED' }), makeCtx('42', '7'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.updated).toBe(1);
  });

  it('returns 400 for invalid status value', async () => {
    const res = await PATCH(makeReq({ status: 'DISMISSED' }), makeCtx('42', '7'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 for invalid project ID', async () => {
    const res = await PATCH(makeReq({ status: 'ACKNOWLEDGED' }), makeCtx('abc', '7'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 for invalid alert ID', async () => {
    const res = await PATCH(makeReq({ status: 'ACKNOWLEDGED' }), makeCtx('42', 'abc'));
    expect(res.status).toBe(400);
  });

  it('returns 403 when user lacks financeiro.update permission', async () => {
    mockCan.mockReturnValue(false);
    const res = await PATCH(makeReq({ status: 'ACKNOWLEDGED' }), makeCtx('42', '7'));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 404 when alert not found for project', async () => {
    mockUpdateAlert.mockResolvedValue({ count: 0 });
    const res = await PATCH(makeReq({ status: 'RESOLVED' }), makeCtx('42', '999'));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
