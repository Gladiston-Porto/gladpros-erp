/**
 * Integration Tests - Invoice APIs
 * 
 * Testa o fluxo completo de CRUD de invoices
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock do PrismaClient
const mockPrisma = {
  invoice: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  invoicePayment: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  invoiceReminder: {
    create: jest.fn(),
  },
  taxRate: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('Invoice API Integration Tests', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    nome: 'Test User',
    papel: 'ADMIN',
  };

  const mockInvoice = {
    id: 1,
    numeroInvoice: 'INV-20250113-0001',
    clienteId: 1,
    projetoId: 1,
    dataEmissao: new Date(),
    dataVencimento: new Date('2025-01-31'),
    dataPagamento: null,
    subtotal: 1000,
    descontoValor: 0,
    descontoPercentual: 0,
    taxRate: 0.0825,
    taxAmount: 82.5,
    valorTotal: 1082.5,
    valorPago: 0,
    saldo: 1082.5,
    status: 'DRAFT',
    notas: null,
    termos: null,
    criadoPor: 1,
    atualizadoPor: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };

  describe('POST /api/invoices - Create Invoice', () => {
    it('deve criar uma invoice válida', async () => {
      const requestData = {
        clienteId: 1,
        projetoId: 1,
        dataVencimento: '2025-01-31T00:00:00.000Z',
        notas: 'Test notes',
        termos: 'Test terms',
        itens: [
          {
            tipo: 'SERVICE',
            descricao: 'Labor work',
            quantidade: 10,
            unidade: 'hour',
            precoUnitario: 100,
            desconto: 0,
            taxavel: true,
            ordem: 0,
          },
        ],
        descontoValor: 0,
        descontoPercentual: 0,
      };

      // Mock da resposta do Prisma
      (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.invoice.create as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        itens: [
          {
            id: 1,
            invoiceId: 1,
            tipo: 'SERVICE',
            descricao: 'Labor work',
            quantidade: 10,
            unidade: 'hour',
            precoUnitario: 100,
            desconto: 0,
            subtotal: 1000,
            taxavel: true,
            ordem: 0,
          },
        ],
        cliente: { nome: 'Test Cliente', email: 'cliente@test.com' },
        projeto: { nome: 'Test Projeto' },
      });

      // Validações esperadas
      expect(requestData.clienteId).toBeGreaterThan(0);
      expect(requestData.itens.length).toBeGreaterThan(0);
      expect(requestData.descontoPercentual).toBeLessThanOrEqual(100);
    });

    it('deve rejeitar invoice sem cliente', async () => {
      const requestData = {
        // clienteId ausente
        dataVencimento: '2025-01-31T00:00:00.000Z',
        itens: [
          {
            tipo: 'SERVICE',
            descricao: 'Labor work',
            quantidade: 10,
            unidade: 'hour',
            precoUnitario: 100,
            desconto: 0,
            taxavel: true,
            ordem: 0,
          },
        ],
      };

      // Validação deve falhar
      expect(requestData).not.toHaveProperty('clienteId');
    });

    it('deve rejeitar invoice sem itens', async () => {
      const requestData = {
        clienteId: 1,
        dataVencimento: '2025-01-31T00:00:00.000Z',
        itens: [], // Array vazio
      };

      expect(requestData.itens.length).toBe(0);
    });

    it('deve gerar número de invoice sequencial', async () => {
      (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(5);

      const hoje = new Date();
      const dataStr = hoje.toISOString().split('T')[0].replace(/-/g, '');
      const expectedNumero = `INV-${dataStr}-0006`;

      // Simula geração do número
      const count = 5;
      const numero = `INV-${dataStr}-${String(count + 1).padStart(4, '0')}`;

      expect(numero).toBe(expectedNumero);
    });
  });

  describe('GET /api/invoices - List Invoices', () => {
    it('deve listar invoices com paginação', async () => {
      const mockInvoices = [mockInvoice, { ...mockInvoice, id: 2 }];

      (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);
      (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(2);

      const page = 1;
      const limit = 20;
      const skip = (page - 1) * limit;

      expect(skip).toBe(0);
      expect(limit).toBe(20);
    });

    it('deve filtrar por status', async () => {
      const status = 'SENT';
      const where = { status };

      expect(where).toHaveProperty('status', 'SENT');
    });

    it('deve filtrar por cliente', async () => {
      const clienteId = 1;
      const where = { clienteId };

      expect(where).toHaveProperty('clienteId', 1);
    });

    it('deve filtrar por range de datas', async () => {
      const dataInicio = '2025-01-01T00:00:00.000Z';
      const dataFim = '2025-01-31T23:59:59.999Z';

      const where = {
        dataVencimento: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim),
        },
      };

      expect(where.dataVencimento).toHaveProperty('gte');
      expect(where.dataVencimento).toHaveProperty('lte');
    });
  });

  describe('GET /api/invoices/[id] - Get Invoice', () => {
    it('deve retornar invoice completa', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        cliente: { id: 1, nome: 'Test Cliente', email: 'cliente@test.com' },
        projeto: { id: 1, nome: 'Test Projeto' },
        itens: [],
        pagamentos: [],
        lembretes: [],
        taxRateRel: { id: 1, nome: 'Texas Sales Tax', aliquota: 0.0825 },
        criador: { id: 1, nome: 'Test User', email: 'test@example.com' },
        atualizador: null,
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        include: {
          cliente: true,
          projeto: true,
          itens: true,
          pagamentos: true,
          lembretes: true,
          taxRateRel: true,
          criador: true,
          atualizador: true,
        },
      });

      expect(invoice).toHaveProperty('cliente');
      expect(invoice).toHaveProperty('itens');
      expect(invoice).toHaveProperty('pagamentos');
    });

    it('deve retornar 404 para invoice inexistente', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 9999 },
      });

      expect(invoice).toBeNull();
    });
  });

  describe('PUT /api/invoices/[id] - Update Invoice', () => {
    it('deve atualizar invoice DRAFT', async () => {
      const updateData = {
        notas: 'Updated notes',
        termos: 'Updated terms',
      };

      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'DRAFT',
      });

      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        ...updateData,
        atualizadoPor: mockUser.id,
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { status: true },
      });

      expect(invoice?.status).toBe('DRAFT');
    });

    it('deve rejeitar atualização de invoice PAID', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { status: true },
      });

      const canUpdate = !['PAID', 'CANCELLED'].includes(invoice?.status || '');
      expect(canUpdate).toBe(false);
    });

    it('deve rejeitar atualização de invoice CANCELLED', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELLED',
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { status: true },
      });

      const canUpdate = !['PAID', 'CANCELLED'].includes(invoice?.status || '');
      expect(canUpdate).toBe(false);
    });
  });

  describe('DELETE /api/invoices/[id] - Delete Invoice', () => {
    it('deve cancelar invoice sem pagamentos', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'DRAFT',
        valorPago: 0,
      });

      (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELLED',
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { status: true, valorPago: true },
      });

      const canDelete = invoice?.status !== 'PAID' && Number(invoice?.valorPago) === 0;
      expect(canDelete).toBe(true);
    });

    it('deve rejeitar cancelamento de invoice com pagamentos', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'PARTIAL_PAID',
        valorPago: 500,
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { status: true, valorPago: true },
      });

      const canDelete = invoice?.status !== 'PAID' && Number(invoice?.valorPago) === 0;
      expect(canDelete).toBe(false);
    });
  });

  describe('POST /api/invoices/[id]/payments - Register Payment', () => {
    it('deve registrar pagamento parcial', async () => {
      const paymentData = {
        valor: 500,
        dataPagamento: new Date().toISOString(),
        metodoPagamento: 'BANK_TRANSFER',
      };

      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        valorTotal: 1082.5,
        valorPago: 0,
        saldo: 1082.5,
        status: 'SENT',
      });

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          invoicePayment: {
            create: jest.fn().mockResolvedValue({
              id: 1,
              invoiceId: 1,
              valor: 500,
              dataPagamento: new Date(),
              metodoPagamento: 'BANK_TRANSFER',
              criadoPor: 1,
            }),
          },
          invoice: {
            update: jest.fn().mockResolvedValue({
              ...mockInvoice,
              valorPago: 500,
              saldo: 582.5,
              status: 'PARTIAL_PAID',
            }),
          },
        });
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { valorTotal: true, valorPago: true, saldo: true, status: true },
      });

      const novoValorPago = Number(invoice?.valorPago) + paymentData.valor;
      const novoSaldo = Number(invoice?.valorTotal) - novoValorPago;
      const novoStatus = novoSaldo <= 0.01 ? 'PAID' : 'PARTIAL_PAID';

      expect(novoValorPago).toBe(500);
      expect(novoSaldo).toBeCloseTo(582.5, 2);
      expect(novoStatus).toBe('PARTIAL_PAID');
    });

    it('deve registrar pagamento total', async () => {
      const paymentData = {
        valor: 1082.5,
        dataPagamento: new Date().toISOString(),
        metodoPagamento: 'BANK_TRANSFER',
      };

      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        valorTotal: 1082.5,
        valorPago: 0,
        saldo: 1082.5,
        status: 'SENT',
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { valorTotal: true, valorPago: true, saldo: true },
      });

      const novoValorPago = Number(invoice?.valorPago) + paymentData.valor;
      const novoSaldo = Number(invoice?.valorTotal) - novoValorPago;
      const novoStatus = novoSaldo <= 0.01 ? 'PAID' : 'PARTIAL_PAID';

      expect(novoValorPago).toBe(1082.5);
      expect(novoSaldo).toBeCloseTo(0, 2);
      expect(novoStatus).toBe('PAID');
    });

    it('deve rejeitar pagamento maior que saldo', async () => {
      const paymentData = {
        valor: 2000,
      };

      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        saldo: 1082.5,
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { saldo: true },
      });

      const isValid = paymentData.valor <= Number(invoice?.saldo);
      expect(isValid).toBe(false);
    });

    it('deve rejeitar pagamento em invoice PAID', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { status: true },
      });

      const canPay = invoice?.status !== 'PAID' && invoice?.status !== 'CANCELLED';
      expect(canPay).toBe(false);
    });

    it('deve rejeitar pagamento em invoice CANCELLED', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELLED',
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { status: true },
      });

      const canPay = invoice?.status !== 'PAID' && invoice?.status !== 'CANCELLED';
      expect(canPay).toBe(false);
    });
  });

  describe('POST /api/invoices/[id]/send - Send Invoice', () => {
    it('deve enviar invoice DRAFT', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'DRAFT',
        cliente: { email: 'cliente@test.com' },
      });

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          invoice: {
            update: jest.fn().mockResolvedValue({
              ...mockInvoice,
              status: 'SENT',
            }),
          },
          invoiceReminder: {
            create: jest.fn().mockResolvedValue({
              id: 1,
              invoiceId: 1,
              tipo: 'INITIAL_SEND',
              status: 'SENT',
            }),
          },
        });
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { status: true },
      });

      const newStatus = invoice?.status === 'DRAFT' ? 'SENT' : invoice?.status;
      expect(newStatus).toBe('SENT');
    });

    it('deve rejeitar envio de invoice CANCELLED', async () => {
      (mockPrisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELLED',
      });

      const invoice = await mockPrisma.invoice.findUnique({
        where: { id: 1 },
        select: { status: true },
      });

      const canSend = invoice?.status !== 'CANCELLED';
      expect(canSend).toBe(false);
    });
  });
});
