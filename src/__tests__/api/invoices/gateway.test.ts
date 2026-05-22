/**
 * Integration Tests — Fluxo Projeto → Invoice (PrismaFinanceGateway)
 *
 * Cobre o fluxo completo:
 *   gerarInvoice()         → cria Invoice + AuditLog em $transaction
 *   obterResumoFinanceiro()→ agrega valores de invoices de um projeto
 *   listarInvoices()       → filtra por projetoId, retorna {data, paginacao, resumo}
 *
 * Usa mocks do Prisma para rodar sem banco real.
 */

// ── Mock Prisma (factory com jest.fn() inline — evita hoisting problem) ──────
jest.mock('@/lib/prisma', () => ({
  prisma: {
    projeto: { findUnique: jest.fn() },
    serviceOrder: { findFirst: jest.fn(), aggregate: jest.fn() },
    expense: { aggregate: jest.fn(), findMany: jest.fn() },
    timesheetEntry: { findMany: jest.fn() },
    invoice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    projetoMaterialEstoque: { findMany: jest.fn(), aggregate: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { PrismaFinanceGateway } from '@/domains/projects/gateways/prisma-finance.gateway';

// Typed alias for convenience
const mockPrisma = prisma as {
  projeto: { findUnique: jest.Mock };
  serviceOrder: { findFirst: jest.Mock; aggregate: jest.Mock };
  expense: { aggregate: jest.Mock; findMany: jest.Mock };
  timesheetEntry: { findMany: jest.Mock };
  invoice: { findFirst: jest.Mock; findMany: jest.Mock; aggregate: jest.Mock; groupBy: jest.Mock; count: jest.Mock };
  projetoMaterialEstoque: { findMany: jest.Mock; aggregate: jest.Mock };
  $transaction: jest.Mock;
};

// ── Test data ─────────────────────────────────────────────────────────────────
// gerarInvoice: Prisma includes `Materiais: { where: { repassarCustoCliente: true } }`
// so the mock returns only materials that pass the filter
const mockProjeto = {
  id: 1,
  numeroProjeto: 'P-2026-001',
  titulo: 'Reforma Elétrica',
  clienteId: 10,
  status: 'concluido',
  valorEstimado: 5000,
  Cliente: { nomeCompleto: 'Test Client' },
  Proposta: { numeroProposta: 'PR-001', valorEstimado: 1000 },
  Materiais: [
    // Only materials with repassarCustoCliente=true are returned by the query
    {
      nome: 'Cabo elétrico 10mm',
      unidade: 'M',
      quantidadeUtilizada: 50,
      plannedQty: 50,
      actualUnitCost: 8.5,
      plannedUnitCost: 8.0,
    },
  ],
};

 
const _mockProjetoNoMateriais = {
  ...mockProjeto,
  Materiais: [],
  Proposta: null,
};



// ── Tests ─────────────────────────────────────────────────────────────────────
describe('PrismaFinanceGateway — fluxo projeto → invoice', () => {
  let gateway: PrismaFinanceGateway;
  let capturedTx: {
    invoice: { create: jest.Mock; findFirst: jest.Mock; aggregate: jest.Mock };
    serviceOrder: { findFirst: jest.Mock };
    auditLog: { create: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new PrismaFinanceGateway();

    // gerarNumeroInvoice: findFirst returns null → generates INV-<year>-000001
    mockPrisma.invoice.findFirst.mockResolvedValue(null);

    // $transaction: execute callback, capture tx for assertions
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof capturedTx) => Promise<unknown>) => {
        capturedTx = {
          invoice: {
            findFirst: jest.fn().mockResolvedValue(null),
            aggregate: jest.fn().mockResolvedValue({ _sum: { valorTotal: null } }),
            create: jest.fn().mockResolvedValue({
              id: 99,
              numeroInvoice: `INV-${new Date().getFullYear()}-000001`,
              valorTotal: 1082.5,
            }),
          },
          serviceOrder: { findFirst: jest.fn().mockResolvedValue(null) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(capturedTx);
      },
    );

    // obterResumoFinanceiro uses projetoMaterialEstoque
    mockPrisma.projetoMaterialEstoque.findMany.mockResolvedValue([]);
  });

  // ── gerarInvoice ────────────────────────────────────────────────────────────
  describe('gerarInvoice()', () => {
    const baseArgs = {
      projetoId: 1,
      descricao: 'Serviços de reforma elétrica',
      dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usuarioId: 1,
    };

    it('deve buscar projeto com materiais antes de criar invoice', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(mockProjeto);

      await gateway.gerarInvoice(baseArgs);

      expect(mockPrisma.projeto.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it('deve filtrar materiais com repassarCustoCliente=true via query Prisma include', async () => {
      // The gateway passes `where: { repassarCustoCliente: true }` to the include
      // Mock projeto with one material (simulating the Prisma filter applied)
      mockPrisma.projeto.findUnique.mockResolvedValue(mockProjeto);

      await gateway.gerarInvoice(baseArgs);

      const includeArg = mockPrisma.projeto.findUnique.mock.calls[0][0];
      expect(includeArg.include.Materiais).toMatchObject({
        where: { repassarCustoCliente: true },
      });
    });

    it('deve calcular taxRate = 0.0825 (TX 8.25%)', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(mockProjeto);

      await gateway.gerarInvoice(baseArgs);

      const createCall = capturedTx.invoice.create.mock.calls[0][0];
      expect(Number(createCall.data.taxRate)).toBeCloseTo(0.0825, 4);
    });

    it('deve criar AuditLog na mesma transação com entidade Invoice', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(mockProjeto);

      await gateway.gerarInvoice({ ...baseArgs, usuarioId: 2 });

      expect(capturedTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entidade: 'Invoice',
            acao: 'CREATE',
            userId: 2,
          }),
        }),
      );
    });

    it('deve retornar sucesso=false se projeto não existir', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(null);

      const result = await gateway.gerarInvoice({ ...baseArgs, projetoId: 999 });
      expect(result.sucesso).toBe(false);
    });

    it('deve bloquear invoice FINAL antes do projeto estar concluído', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue({
        ...mockProjeto,
        status: 'em_execucao',
      });

      const result = await gateway.gerarInvoice(baseArgs);

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('FINAL');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('deve permitir invoice PROGRESS antes do projeto estar concluído', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue({
        ...mockProjeto,
        status: 'em_execucao',
      });

      const result = await gateway.gerarInvoice({
        ...baseArgs,
        billingType: 'PROGRESS',
        billingReference: 'payapp-001',
      });

      expect(result.sucesso).toBe(true);
      const createCall = capturedTx.invoice.create.mock.calls[0][0];
      expect(createCall.data.billingType).toBe('PROGRESS');
      expect(createCall.data.billingReference).toBe('payapp-001');
      expect(createCall.data.activeBillingKey).toBe('PROJECT:1:PROGRESS:payapp-001');
    });

    it('deve bloquear invoice de projeto se alguma OS vinculada já foi faturada', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrisma.$transaction.mockImplementationOnce(
        async (cb: (tx: typeof capturedTx) => Promise<unknown>) => {
          capturedTx = {
            invoice: {
              findFirst: jest.fn().mockResolvedValue(null),
              aggregate: jest.fn().mockResolvedValue({ _sum: { valorTotal: null } }),
              create: jest.fn(),
            },
            serviceOrder: {
              findFirst: jest.fn().mockResolvedValue({
                id: 8,
                ticketNumber: 'OS-0008',
                invoiceId: 77,
              }),
            },
            auditLog: { create: jest.fn() },
          };
          return cb(capturedTx);
        },
      );

      const result = await gateway.gerarInvoice(baseArgs);

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('OS já faturada');
      expect(capturedTx.invoice.create).not.toHaveBeenCalled();
    });

    it('deve bloquear invoice duplicada ativa para o mesmo projeto', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrisma.$transaction.mockImplementationOnce(
        async (cb: (tx: typeof capturedTx) => Promise<unknown>) => {
          capturedTx = {
            invoice: {
              findFirst: jest.fn().mockResolvedValue({
                id: 55,
                numeroInvoice: 'INV-2026-00055',
              }),
              aggregate: jest.fn().mockResolvedValue({ _sum: { valorTotal: null } }),
              create: jest.fn(),
            },
            serviceOrder: { findFirst: jest.fn().mockResolvedValue(null) },
            auditLog: { create: jest.fn() },
          };
          return cb(capturedTx);
        },
      );

      const result = await gateway.gerarInvoice(baseArgs);

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('Já existe uma invoice ativa');
      expect(capturedTx.invoice.create).not.toHaveBeenCalled();
    });

    it('deve bloquear invoice MATERIALS sem billingReference', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(mockProjeto);

      const result = await gateway.gerarInvoice({
        ...baseArgs,
        billingType: 'MATERIALS',
      });

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('billingReference');
      expect(mockPrisma.projeto.findUnique).not.toHaveBeenCalled();
    });

    it('deve bloquear billing SERVICE_ORDER se a OS já possui invoice ativa', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(mockProjeto);
      mockPrisma.$transaction.mockImplementationOnce(
        async (cb: (tx: typeof capturedTx) => Promise<unknown>) => {
          capturedTx = {
            invoice: {
              findFirst: jest.fn().mockResolvedValue(null),
              aggregate: jest.fn().mockResolvedValue({ _sum: { valorTotal: null } }),
              create: jest.fn(),
            },
            serviceOrder: {
              findFirst: jest.fn().mockResolvedValue({
                id: 8,
                ticketNumber: 'OS-0008',
                invoiceId: 77,
                Invoice: { status: 'SENT', numeroInvoice: 'INV-2026-00077' },
              }),
            },
            auditLog: { create: jest.fn() },
          };
          return cb(capturedTx);
        },
      );

      const result = await gateway.gerarInvoice({
        ...baseArgs,
        billingType: 'SERVICE_ORDER',
        serviceOrderId: 8,
        incluirProposta: false,
        incluirMateriais: false,
        itensAdicionais: [{ descricao: 'OS', tipo: 'SERVICO', quantidade: 1, valorUnitario: 100, valorTotal: 100 }],
      });

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('já possui invoice ativa');
      expect(capturedTx.invoice.create).not.toHaveBeenCalled();
    });

    it('deve bloquear invoice sem itens faturáveis', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue({
        ...mockProjeto,
        Proposta: null,
        Materiais: [],
      });

      const result = await gateway.gerarInvoice({
        ...baseArgs,
        incluirProposta: false,
        incluirMateriais: false,
        itensAdicionais: [],
      });

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('ao menos um item');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('deve retornar sucesso=true e numeroInvoice ao criar com sucesso', async () => {
      mockPrisma.projeto.findUnique.mockResolvedValue(mockProjeto);

      const result = await gateway.gerarInvoice(baseArgs);

      expect(result.sucesso).toBe(true);
      expect(result.numeroInvoice).toMatch(/^INV-/);
    });
  });

  // ── obterResumoFinanceiro ───────────────────────────────────────────────────
  describe('obterResumoFinanceiro()', () => {
    const mockInvoices = [
      { status: 'PAID', valorTotal: 2000, valorPago: 2000 },
      { status: 'SENT', valorTotal: 1500, valorPago: 0 },
      { status: 'OVERDUE', valorTotal: 800, valorPago: 0 },
    ];

    beforeEach(() => {
      mockPrisma.projeto.findUnique.mockResolvedValue({
        numeroProjeto: 'P-2026-001',
        valorEstimado: 5000,
      });
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { valorTotal: 4300, valorPago: 2000 },
        _count: { _all: mockInvoices.length },
      });
      mockPrisma.invoice.groupBy.mockResolvedValue([
        { status: 'PAID', _count: { _all: 1 } },
        { status: 'SENT', _count: { _all: 1 } },
        { status: 'OVERDUE', _count: { _all: 1 } },
      ]);
      mockPrisma.projetoMaterialEstoque.aggregate.mockResolvedValue({ _sum: { custoTotal: 0 } });
      mockPrisma.serviceOrder.aggregate.mockResolvedValue({ _sum: { laborTotal: 0 } });
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { valor: 0 }, _count: 0 });
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.timesheetEntry.findMany.mockResolvedValue([]);
    });

    it('deve calcular totalInvoices corretamente', async () => {
      const resumo = await gateway.obterResumoFinanceiro(1);
      expect(resumo.totalInvoices).toBe(3);
    });

    it('deve separar invoices por status (pagas e vencidas)', async () => {
      const resumo = await gateway.obterResumoFinanceiro(1);
      expect(resumo.invoicesPagos).toBe(1);
      expect(resumo.invoicesVencidos).toBe(1);
    });

    it('deve calcular valorFaturado como soma de valorTotal', async () => {
      const resumo = await gateway.obterResumoFinanceiro(1);
      expect(Number(resumo.valorFaturado)).toBeCloseTo(4300, 0);
    });

    it('deve calcular valorPago como soma de valorPago', async () => {
      const resumo = await gateway.obterResumoFinanceiro(1);
      expect(Number(resumo.valorPago)).toBeCloseTo(2000, 0);
    });

    it('deve retornar numeroProjeto do projeto', async () => {
      const resumo = await gateway.obterResumoFinanceiro(1);
      expect(resumo.numeroProjeto).toBe('P-2026-001');
    });
  });

  // ── listarInvoices ──────────────────────────────────────────────────────────
  describe('listarInvoices()', () => {
    it('deve filtrar por projetoId quando fornecido', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      await gateway.listarInvoices({ empresaId: 1, projetoId: 1 });

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projetoId: 1 }),
        }),
      );
    });

    it('deve filtrar por clienteId quando fornecido', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      await gateway.listarInvoices({ empresaId: 1, clienteId: 10 });

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clienteId: 10 }),
        }),
      );
    });

    it('deve retornar data vazio quando não há invoices', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      const result = await gateway.listarInvoices({ empresaId: 1, projetoId: 999 });
      expect(result.data).toEqual([]);
      expect(result.paginacao.totalItens).toBe(0);
    });

    it('deve retornar invoices mapeadas em result.data', async () => {
      const fakeInvoices = [
        { id: 1, status: 'DRAFT', valorTotal: 100, valorPago: 0, descontoValor: 0, subtotal: 100, itens: [] },
        { id: 2, status: 'PAID', valorTotal: 200, valorPago: 200, descontoValor: 0, subtotal: 200, itens: [] },
      ];
      mockPrisma.invoice.findMany.mockResolvedValue(fakeInvoices);
      mockPrisma.invoice.count.mockResolvedValue(2);

      const result = await gateway.listarInvoices({ empresaId: 1, projetoId: 1 });
      expect(result.data).toHaveLength(2);
      expect(result.paginacao.totalItens).toBe(2);
    });
  });
});
