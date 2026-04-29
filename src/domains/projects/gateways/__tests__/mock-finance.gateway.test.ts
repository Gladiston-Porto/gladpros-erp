/**
 * Testes Unitários - Mock Finance Gateway
 * Fase 7: Testes da integração financeira
 */

import {
  MockFinanceGateway,
  resetFinanceGateway,
  getInvoicesEmMemoria,
} from '../mock-finance.gateway';
import { GerarInvoiceDTO, RegistrarPagamentoDTO } from '../../interfaces/finance-gateway.interface';

describe('MockFinanceGateway', () => {
  let gateway: MockFinanceGateway;

  beforeEach(() => {
    resetFinanceGateway();
    gateway = new MockFinanceGateway(0); // Sem latência nos testes
  });

  describe('gerarInvoice', () => {
    it('deve gerar invoice com proposta e materiais', async () => {
      const dto: GerarInvoiceDTO = {
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice de teste',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: true,
        formaPagamento: 'PIX',
      };

      const resultado = await gateway.gerarInvoice(dto);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.invoiceId).toBeDefined();
      expect(resultado.numeroInvoice).toMatch(/^INV-\d{4}-\d{6}$/);
      expect(resultado.mensagem).toContain('gerado com sucesso');
      expect(resultado.url).toContain('mock-payment.com');
    });

    it('deve calcular valores corretamente com desconto percentual', async () => {
      const dto: GerarInvoiceDTO = {
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice com desconto',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: true,
        desconto: 10, // 10%
        formaPagamento: 'BOLETO',
      };

      const resultado = await gateway.gerarInvoice(dto);
      const invoice = await gateway.buscarInvoice(resultado.invoiceId!);

      expect(invoice).not.toBeNull();
      expect(invoice!.subtotal).toBe(6500); // 5000 + 1500
      expect(invoice!.desconto).toBe(650); // 10% de 6500
      expect(invoice!.valorTotal).toBe(5850); // 6500 - 650
    });

    it('deve calcular valores corretamente com desconto fixo', async () => {
      const dto: GerarInvoiceDTO = {
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice com desconto fixo',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: true,
        descontoFixo: 500,
        formaPagamento: 'CARTAO_CREDITO',
      };

      const resultado = await gateway.gerarInvoice(dto);
      const invoice = await gateway.buscarInvoice(resultado.invoiceId!);

      expect(invoice).not.toBeNull();
      expect(invoice!.subtotal).toBe(6500);
      expect(invoice!.desconto).toBe(500);
      expect(invoice!.valorTotal).toBe(6000);
    });

    it('deve adicionar itens customizados', async () => {
      const dto: GerarInvoiceDTO = {
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice customizado',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: false,
        incluirMateriais: false,
        itensAdicionais: [
          {
            descricao: 'Item custom 1',
            tipo: 'SERVICO',
            quantidade: 2,
            valorUnitario: 100,
            valorTotal: 200,
          },
          {
            descricao: 'Item custom 2',
            tipo: 'OUTROS',
            quantidade: 1,
            valorUnitario: 50,
            valorTotal: 50,
          },
        ],
        formaPagamento: 'PIX',
      };

      const resultado = await gateway.gerarInvoice(dto);
      const invoice = await gateway.buscarInvoice(resultado.invoiceId!);

      expect(invoice).not.toBeNull();
      expect(invoice!.itens).toHaveLength(2);
      expect(invoice!.subtotal).toBe(250);
      expect(invoice!.valorTotal).toBe(250);
    });

    it('deve mascarar documento do cliente', async () => {
      const dto: GerarInvoiceDTO = {
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice teste',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: false,
        formaPagamento: 'PIX',
      };

      const resultado = await gateway.gerarInvoice(dto);
      const invoice = await gateway.buscarInvoice(resultado.invoiceId!);

      expect(invoice).not.toBeNull();
      expect(invoice!.clienteDocumento).toContain('***');
      expect(invoice!.clienteDocumento).not.toContain('12345678000199');
    });
  });

  describe('registrarPagamento', () => {
    it('deve registrar pagamento parcial', async () => {
      // Cria invoice primeiro
      const dto: GerarInvoiceDTO = {
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice teste',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: true,
        formaPagamento: 'PIX',
      };

      const resultadoCriacao = await gateway.gerarInvoice(dto);

      // Registra pagamento parcial
      const pagamentoDto: RegistrarPagamentoDTO = {
        invoiceId: resultadoCriacao.invoiceId!,
        valorPago: 3000,
        formaPagamento: 'PIX',
        dataPagamento: new Date(),
        usuarioId: 1,
      };

      const resultado = await gateway.registrarPagamento(pagamentoDto);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.mensagem).toContain('$ 3000.00');

      const invoice = await gateway.buscarInvoice(resultadoCriacao.invoiceId!);
      expect(invoice!.valorPago).toBe(3000);
      expect(invoice!.status).toBe('PENDENTE'); // Ainda pendente (pagamento parcial)
    });

    it('deve marcar como pago ao receber valor total', async () => {
      // Cria invoice
      const dto: GerarInvoiceDTO = {
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice teste',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: true,
        formaPagamento: 'PIX',
      };

      const resultadoCriacao = await gateway.gerarInvoice(dto);
      const invoice = await gateway.buscarInvoice(resultadoCriacao.invoiceId!);

      // Paga valor total
      const pagamentoDto: RegistrarPagamentoDTO = {
        invoiceId: resultadoCriacao.invoiceId!,
        valorPago: invoice!.valorTotal,
        formaPagamento: 'PIX',
        dataPagamento: new Date(),
        usuarioId: 1,
      };

      const resultado = await gateway.registrarPagamento(pagamentoDto);

      expect(resultado.sucesso).toBe(true);

      const invoiceAtualizado = await gateway.buscarInvoice(resultadoCriacao.invoiceId!);
      expect(invoiceAtualizado!.status).toBe('PAGO');
      expect(invoiceAtualizado!.dataPagamento).toBeDefined();
    });

    it('deve falhar ao tentar pagar invoice já pago', async () => {
      // Cria e paga invoice
      const dto: GerarInvoiceDTO = {
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice teste',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: false,
        formaPagamento: 'PIX',
      };

      const resultadoCriacao = await gateway.gerarInvoice(dto);
      const invoice = await gateway.buscarInvoice(resultadoCriacao.invoiceId!);

      await gateway.registrarPagamento({
        invoiceId: resultadoCriacao.invoiceId!,
        valorPago: invoice!.valorTotal,
        formaPagamento: 'PIX',
        dataPagamento: new Date(),
        usuarioId: 1,
      });

      // Tenta pagar novamente
      const resultado = await gateway.registrarPagamento({
        invoiceId: resultadoCriacao.invoiceId!,
        valorPago: 100,
        formaPagamento: 'PIX',
        dataPagamento: new Date(),
        usuarioId: 1,
      });

      expect(resultado.sucesso).toBe(false);
      expect(resultado.mensagem).toContain('já foi pago');
    });

    it('deve falhar ao tentar pagar invoice inexistente', async () => {
      const resultado = await gateway.registrarPagamento({
        invoiceId: 'INVALID-ID',
        valorPago: 100,
        formaPagamento: 'PIX',
        dataPagamento: new Date(),
        usuarioId: 1,
      });

      expect(resultado.sucesso).toBe(false);
      expect(resultado.mensagem).toContain('não encontrado');
    });
  });

  describe('cancelarInvoice', () => {
    it('deve cancelar invoice pendente', async () => {
      // Cria invoice
      const dto: GerarInvoiceDTO = {
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice teste',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: false,
        formaPagamento: 'PIX',
      };

      const resultadoCriacao = await gateway.gerarInvoice(dto);

      // Cancela
      const resultado = await gateway.cancelarInvoice(
        resultadoCriacao.invoiceId!,
        'Cancelado por solicitação do cliente',
        1
      );

      expect(resultado.sucesso).toBe(true);
      expect(resultado.mensagem).toContain('cancelado com sucesso');

      const invoice = await gateway.buscarInvoice(resultadoCriacao.invoiceId!);
      expect(invoice!.status).toBe('CANCELADO');
      expect(invoice!.observacoes).toContain('Cancelado');
    });

    it('deve falhar ao cancelar invoice já pago', async () => {
      // Cria e paga invoice
      const dto: GerarInvoiceDTO = {
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice teste',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: false,
        formaPagamento: 'PIX',
      };

      const resultadoCriacao = await gateway.gerarInvoice(dto);
      const invoice = await gateway.buscarInvoice(resultadoCriacao.invoiceId!);

      await gateway.registrarPagamento({
        invoiceId: resultadoCriacao.invoiceId!,
        valorPago: invoice!.valorTotal,
        formaPagamento: 'PIX',
        dataPagamento: new Date(),
        usuarioId: 1,
      });

      // Tenta cancelar
      const resultado = await gateway.cancelarInvoice(
        resultadoCriacao.invoiceId!,
        'Teste',
        1
      );

      expect(resultado.sucesso).toBe(false);
      expect(resultado.mensagem).toContain('pago não pode ser cancelado');
    });
  });

  describe('listarInvoices', () => {
    beforeEach(async () => {
      // Cria alguns invoices para teste
      await gateway.gerarInvoice({
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice 1',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: false,
        formaPagamento: 'PIX',
      });

      await gateway.gerarInvoice({
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice 2',
        dataVencimento: new Date('2025-03-01'),
        incluirProposta: true,
        incluirMateriais: true,
        formaPagamento: 'BOLETO',
      });

      await gateway.gerarInvoice({
        projetoId: 2,
        usuarioId: 1,
        descricao: 'Invoice 3',
        dataVencimento: new Date('2025-01-01'),
        incluirProposta: false,
        incluirMateriais: true,
        formaPagamento: 'CARTAO_CREDITO',
      });
    });

    it('deve listar todos os invoices', async () => {
      const resultado = await gateway.listarInvoices({});

      expect(resultado.data).toHaveLength(3);
      expect(resultado.paginacao.totalItens).toBe(3);
      expect(resultado.resumo.valorTotal).toBeGreaterThan(0);
    });

    it('deve filtrar por projeto', async () => {
      const resultado = await gateway.listarInvoices({ projetoId: 1 });

      expect(resultado.data).toHaveLength(2);
      expect(resultado.data.every(i => i.projetoId === 1)).toBe(true);
    });

    it('deve aplicar paginação', async () => {
      const resultado = await gateway.listarInvoices({ pagina: 1, limite: 2 });

      expect(resultado.data).toHaveLength(2);
      expect(resultado.paginacao.paginaAtual).toBe(1);
      expect(resultado.paginacao.totalPaginas).toBe(2);
    });
  });

  describe('obterResumoFinanceiro', () => {
    it('deve retornar resumo financeiro do projeto', async () => {
      // Cria invoices para projeto
      await gateway.gerarInvoice({
        projetoId: 1,
        usuarioId: 1,
        descricao: 'Invoice 1',
        dataVencimento: new Date('2025-02-01'),
        incluirProposta: true,
        incluirMateriais: true,
        formaPagamento: 'PIX',
      });

      const resumo = await gateway.obterResumoFinanceiro(1);

      expect(resumo.projetoId).toBe(1);
      expect(resumo.valorOrcado).toBeGreaterThan(0);
      expect(resumo.valorFaturado).toBeGreaterThan(0);
      expect(resumo.totalInvoices).toBe(1);
      expect(resumo.margem).toBeGreaterThan(0);
      expect(resumo.percentualMargem).toBeGreaterThan(0);
    });
  });

  describe('verificarConexao', () => {
    it('deve sempre retornar true no mock', async () => {
      const resultado = await gateway.verificarConexao();
      expect(resultado).toBe(true);
    });
  });
});
