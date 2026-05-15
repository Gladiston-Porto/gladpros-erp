/**
 * Tests — register-handlers.ts
 *
 * Validates that project.statusChanged and project.completed
 * handlers write the correct AuditLog records and handle
 * DB failures gracefully (never crash the main flow).
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/server/events/event-bus', () => ({
  eventBus: {
    on: jest.fn(),
    emit: jest.fn(),
  },
}));

// Playbook deps — not under test here, stub everything
jest.mock('@/server/playbooks/runner', () => ({
  PlaybookRunner: jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue({ ok: true, steps: [] }),
  })),
}));
jest.mock('@/server/playbooks/proposal-approved', () => ({
  createProposalApprovedSteps: jest.fn().mockReturnValue([]),
}));
jest.mock('@/server/playbooks/project-created', () => ({
  createProjectCreatedSteps: jest.fn().mockReturnValue([]),
}));
jest.mock('@/server/playbooks/service-order-completed', () => ({
  createServiceOrderCompletedSteps: jest.fn().mockReturnValue([]),
}));
jest.mock('@/server/playbooks/invoice-overdue', () => ({
  createInvoiceOverdueSteps: jest.fn().mockReturnValue([]),
}));

import { prisma } from '@/lib/prisma';
import { eventBus } from '@/server/events/event-bus';
import { registerEventHandlers } from '@/server/events/register-handlers';

const mockAuditCreate = prisma.auditLog.create as jest.Mock;
const mockOn = eventBus.on as jest.Mock;

// Capture handlers as they're registered
type HandlerFn = (event: unknown) => Promise<void>;
const registeredHandlers: Record<string, HandlerFn> = {};

beforeEach(() => {
  jest.clearAllMocks();
  mockOn.mockImplementation((name: string, handler: HandlerFn) => {
    registeredHandlers[name] = handler;
  });
  // Re-register handlers fresh for each test
  registerEventHandlers();
});

function makeEvent(name: string, payload: Record<string, unknown>) {
  return {
    id: 'test-event-id',
    name,
    aggregateType: 'project',
    aggregateId: '42',
    occurredAt: new Date('2025-01-01T00:00:00Z'),
    payload,
  };
}

describe('registerEventHandlers — project.statusChanged', () => {
  it('registers a handler for project.statusChanged', () => {
    expect(registeredHandlers['project.statusChanged']).toBeDefined();
  });

  it('writes AuditLog with correct fields on status change', async () => {
    mockAuditCreate.mockResolvedValueOnce({ id: 'audit_1' });

    await registeredHandlers['project.statusChanged'](
      makeEvent('project.statusChanged', {
        projetoId: 42,
        oldStatus: 'EM_ANDAMENTO',
        newStatus: 'CONCLUIDO',
        changedBy: 7,
      }),
    );

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const { data } = mockAuditCreate.mock.calls[0][0];
    expect(data.userId).toBe(7);
    expect(data.entidade).toBe('Projeto');
    expect(data.entidadeId).toBe('42');
    expect(data.acao).toBe('STATUS_ALTERADO');
    const diff = JSON.parse(data.diff);
    expect(diff.oldStatus).toBe('EM_ANDAMENTO');
    expect(diff.newStatus).toBe('CONCLUIDO');
    expect(data.id).toMatch(/^audit_/);
  });

  it('does NOT throw when AuditLog.create fails (graceful degradation)', async () => {
    mockAuditCreate.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(
      registeredHandlers['project.statusChanged'](
        makeEvent('project.statusChanged', {
          projetoId: 99,
          oldStatus: 'PENDENTE',
          newStatus: 'EM_ANDAMENTO',
          changedBy: 1,
        }),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('registerEventHandlers — project.completed', () => {
  it('registers a handler for project.completed', () => {
    expect(registeredHandlers['project.completed']).toBeDefined();
  });

  it('writes AuditLog with PROJETO_CONCLUIDO on project completion', async () => {
    mockAuditCreate.mockResolvedValueOnce({ id: 'audit_2' });

    await registeredHandlers['project.completed'](
      makeEvent('project.completed', {
        projetoId: 55,
        completedBy: 3,
      }),
    );

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const { data } = mockAuditCreate.mock.calls[0][0];
    expect(data.userId).toBe(3);
    expect(data.entidade).toBe('Projeto');
    expect(data.entidadeId).toBe('55');
    expect(data.acao).toBe('PROJETO_CONCLUIDO');
    const diff = JSON.parse(data.diff);
    expect(diff.completedAt).toBeDefined();
  });

  it('does NOT throw when AuditLog.create fails (graceful degradation)', async () => {
    mockAuditCreate.mockRejectedValueOnce(new Error('timeout'));

    await expect(
      registeredHandlers['project.completed'](
        makeEvent('project.completed', { projetoId: 1, completedBy: 1 }),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('registerEventHandlers — registration count', () => {
  it('registers handlers for all expected events', () => {
    const registeredNames = mockOn.mock.calls.map((c: [string]) => c[0]);
    expect(registeredNames).toContain('proposal.approved');
    expect(registeredNames).toContain('project.created');
    expect(registeredNames).toContain('project.statusChanged');
    expect(registeredNames).toContain('project.completed');
    expect(registeredNames).toContain('serviceOrder.completed');
    expect(registeredNames).toContain('invoice.overdue');
  });
});
