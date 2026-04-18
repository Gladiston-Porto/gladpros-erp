/**
 * Mock Finance Gateway
 * Fase 7: Integração Financeira
 * 
 * Implementação mock do gateway financeiro para desenvolvimento/testes
 * Simula comportamento do futuro módulo financeiro real
 */

import {
  IFinanceGateway,
  GerarInvoiceDTO,
  RegistrarPagamentoDTO,
  ListarInvoicesDTO,
  Invoice,
  ListarInvoicesResponse,
  RespostaFinanceira,
  ResumoFinanceiroProjeto,
  StatusInvoice,
  ItemInvoice,
} from '../interfaces/finance-gateway.interface';

/**
 * Armazena invoices em memória para simulação
 */
const invoicesEmMemoria: Map<string, Invoice> = new Map();
let contadorInvoices = 1;

/**
 * Máscara documento (CNPJ/CPF)
 */
function mascararDocumento(documento: string): string {
  if (documento.length === 14) {
    // CNPJ: XX.XXX.XXX/XXXX-XX → XX.***.***/****.XX
    return `${documento.slice(0, 2)}.***.***/****.${documento.slice(-2)}`;
  } else if (documento.length === 11) {
    // CPF: XXX.XXX.XXX-XX → XXX.***.***-XX
    return `${documento.slice(0, 3)}.***.***-${documento.slice(-2)}`;
  }
  return '***';
}

/**
 * Implementação mock do gateway financeiro
 */
export class MockFinanceGateway implements IFinanceGateway {
  private latenciaMs: number;

  constructor(latenciaMs: number = 150) {
    this.latenciaMs = latenciaMs;
  }

  /**
   * Simula latência de rede
   */
  private async simularLatencia(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.latenciaMs));
  }

  /**
   * Gera número de invoice
   */
  private gerarNumeroInvoice(): string {
    const ano = new Date().getFullYear();
    const numero = String(contadorInvoices++).padStart(6, '0');
    return `INV-${ano}-${numero}`;
  }

  /**
   * Gera um novo invoice
   */
  async gerarInvoice(dados: GerarInvoiceDTO): Promise<RespostaFinanceira> {
    await this.simularLatencia();

    const invoiceId = `FIN-${Date.now()}-${contadorInvoices}`;
    const numeroInvoice = this.gerarNumeroInvoice();

    // Simula busca de dados do projeto (mock)
    const itens: ItemInvoice[] = [];

    // Adiciona itens da proposta
    if (dados.incluirProposta) {
      itens.push({
        descricao: 'Serviços conforme proposta',
        tipo: 'SERVICO',
        quantidade: 1,
        valorUnitario: 5000.00,
        valorTotal: 5000.00,
        observacao: 'Valor base da proposta',
      });
    }

    // Adiciona materiais
    if (dados.incluirMateriais) {
      itens.push({
        descricao: 'Materiais utilizados no projeto',
        tipo: 'MATERIAL',
        quantidade: 1,
        valorUnitario: 1500.00,
        valorTotal: 1500.00,
        observacao: 'Materiais consolidados',
      });
    }

    // Adiciona itens customizados
    if (dados.itensAdicionais) {
      itens.push(...dados.itensAdicionais);
    }

    // Calcula totais
    const subtotal = itens.reduce((acc, item) => acc + item.valorTotal, 0);
    let desconto = 0;

    if (dados.descontoFixo) {
      desconto = dados.descontoFixo;
    } else if (dados.desconto) {
      desconto = subtotal * (dados.desconto / 100);
    }

    const valorTotal = subtotal - desconto;

    const invoice: Invoice = {
      id: invoiceId,
      numeroInvoice,
      projetoId: dados.projetoId,
      numeroProjeto: `PROJ-${String(dados.projetoId).padStart(4, '0')}`,
      clienteId: 1, // Mock
      clienteNome: 'Cliente Mock LTDA',
      clienteDocumento: mascararDocumento('12345678000199'),
      status: 'PENDENTE',
      descricao: dados.descricao,
      dataEmissao: new Date(),
      dataVencimento: dados.dataVencimento,
      itens,
      subtotal,
      desconto,
      valorTotal,
      valorPago: 0,
      formaPagamento: dados.formaPagamento,
      observacoes: dados.observacoes,
      urlPagamento: `https://mock-payment.com/invoice/${invoiceId}`,
      criadoEm: new Date(),
    };

    invoicesEmMemoria.set(invoiceId, invoice);

    return {
      sucesso: true,
      invoiceId,
      numeroInvoice,
      mensagem: `Invoice ${numeroInvoice} gerado com sucesso`,
      detalhes: {
        valorTotal,
        itens: itens.length,
        dataVencimento: dados.dataVencimento.toISOString(),
      },
      url: invoice.urlPagamento,
    };
  }

  /**
   * Busca invoice por ID
   */
  async buscarInvoice(invoiceId: string): Promise<Invoice | null> {
    await this.simularLatencia();
    return invoicesEmMemoria.get(invoiceId) || null;
  }

  /**
   * Lista invoices com filtros
   */
  async listarInvoices(filtros: ListarInvoicesDTO): Promise<ListarInvoicesResponse> {
    await this.simularLatencia();

    const pagina = filtros.pagina || 1;
    const limite = filtros.limite || 20;

    // Filtra invoices
    let invoices = Array.from(invoicesEmMemoria.values());

    if (filtros.projetoId) {
      invoices = invoices.filter(i => i.projetoId === filtros.projetoId);
    }

    if (filtros.clienteId) {
      invoices = invoices.filter(i => i.clienteId === filtros.clienteId);
    }

    if (filtros.status) {
      invoices = invoices.filter(i => i.status === filtros.status);
    }

    if (filtros.dataEmissaoInicio) {
      invoices = invoices.filter(i => i.dataEmissao >= filtros.dataEmissaoInicio!);
    }

    if (filtros.dataEmissaoFim) {
      invoices = invoices.filter(i => i.dataEmissao <= filtros.dataEmissaoFim!);
    }

    if (filtros.apenasVencidos) {
      const hoje = new Date();
      invoices = invoices.filter(i => 
        i.dataVencimento < hoje && 
        i.status === 'PENDENTE'
      );
    }

    // Ordena por data de emissão (mais recentes primeiro)
    invoices.sort((a, b) => b.dataEmissao.getTime() - a.dataEmissao.getTime());

    // Calcula resumo
    const valorTotal = invoices.reduce((acc, i) => acc + i.valorTotal, 0);
    const valorPago = invoices.reduce((acc, i) => acc + i.valorPago, 0);
    const valorPendente = valorTotal - valorPago;

    // Paginação
    const total = invoices.length;
    const inicio = (pagina - 1) * limite;
    const fim = inicio + limite;
    const invoicesPaginados = invoices.slice(inicio, fim);

    return {
      data: invoicesPaginados,
      paginacao: {
        paginaAtual: pagina,
        totalPaginas: Math.ceil(total / limite),
        totalItens: total,
        itensPorPagina: limite,
      },
      resumo: {
        valorTotal,
        valorPago,
        valorPendente,
      },
    };
  }

  /**
   * Registra pagamento de invoice
   */
  async registrarPagamento(dados: RegistrarPagamentoDTO): Promise<RespostaFinanceira> {
    await this.simularLatencia();

    const invoice = invoicesEmMemoria.get(dados.invoiceId);

    if (!invoice) {
      return {
        sucesso: false,
        mensagem: `Invoice ${dados.invoiceId} não encontrado`,
      };
    }

    if (invoice.status === 'PAGO') {
      return {
        sucesso: false,
        mensagem: 'Invoice já foi pago anteriormente',
      };
    }

    if (invoice.status === 'CANCELADO') {
      return {
        sucesso: false,
        mensagem: 'Invoice cancelado não pode receber pagamento',
      };
    }

    // Atualiza invoice
    invoice.valorPago += dados.valorPago;
    invoice.formaPagamento = dados.formaPagamento;
    invoice.dataPagamento = dados.dataPagamento;
    invoice.atualizadoEm = new Date();

    // Se pagou o valor total, marca como pago
    if (invoice.valorPago >= invoice.valorTotal) {
      invoice.status = 'PAGO';
    }

    invoicesEmMemoria.set(dados.invoiceId, invoice);

    return {
      sucesso: true,
      invoiceId: dados.invoiceId,
      numeroInvoice: invoice.numeroInvoice,
      mensagem: `Pagamento de $ ${dados.valorPago.toFixed(2)} registrado com sucesso`,
      detalhes: {
        valorPago: invoice.valorPago,
        valorTotal: invoice.valorTotal,
        status: invoice.status,
        formaPagamento: dados.formaPagamento,
      },
    };
  }

  /**
   * Cancela um invoice
   */
  async cancelarInvoice(invoiceId: string, motivo: string, usuarioId: number): Promise<RespostaFinanceira> {
    await this.simularLatencia();

    const invoice = invoicesEmMemoria.get(invoiceId);

    if (!invoice) {
      return {
        sucesso: false,
        mensagem: `Invoice ${invoiceId} não encontrado`,
      };
    }

    if (invoice.status === 'PAGO') {
      return {
        sucesso: false,
        mensagem: 'Invoice pago não pode ser cancelado. Use estorno.',
      };
    }

    if (invoice.status === 'CANCELADO') {
      return {
        sucesso: false,
        mensagem: 'Invoice já foi cancelado anteriormente',
      };
    }

    // Cancela invoice
    invoice.status = 'CANCELADO';
    invoice.observacoes = `${invoice.observacoes || ''}\nCancelado: ${motivo}`;
    invoice.atualizadoEm = new Date();

    invoicesEmMemoria.set(invoiceId, invoice);

    return {
      sucesso: true,
      invoiceId,
      numeroInvoice: invoice.numeroInvoice,
      mensagem: `Invoice ${invoice.numeroInvoice} cancelado com sucesso`,
      detalhes: {
        motivo,
        canceladoPor: usuarioId,
      },
    };
  }

  /**
   * Obtém resumo financeiro de um projeto
   */
  async obterResumoFinanceiro(projetoId: number): Promise<ResumoFinanceiroProjeto> {
    await this.simularLatencia();

    const invoices = Array.from(invoicesEmMemoria.values())
      .filter(i => i.projetoId === projetoId);

    const valorOrcado = 10000.00; // Mock da proposta
    const valorMateriais = 2500.00; // Mock dos materiais

    const valorFaturado = invoices.reduce((acc, i) => acc + i.valorTotal, 0);
    const valorPago = invoices.reduce((acc, i) => acc + i.valorPago, 0);
    const valorPendente = valorFaturado - valorPago;

    const totalInvoices = invoices.length;
    const invoicesPendentes = invoices.filter(i => i.status === 'PENDENTE').length;
    const invoicesPagos = invoices.filter(i => i.status === 'PAGO').length;
    const invoicesVencidos = invoices.filter(i => 
      i.status === 'PENDENTE' && i.dataVencimento < new Date()
    ).length;

    const margem = valorFaturado - valorMateriais;
    const percentualMargem = valorFaturado > 0 
      ? (margem / valorFaturado) * 100 
      : 0;

    return {
      projetoId,
      numeroProjeto: `PROJ-${String(projetoId).padStart(4, '0')}`,
      valorOrcado,
      valorMateriais,
      valorFaturado,
      valorPago,
      valorPendente,
      totalInvoices,
      invoicesPendentes,
      invoicesPagos,
      invoicesVencidos,
      margem,
      percentualMargem,
      atualizadoEm: new Date(),
    };
  }

  /**
   * Verifica conexão (sempre retorna true no mock)
   */
  async verificarConexao(): Promise<boolean> {
    await this.simularLatencia();
    return true;
  }
}

// Singleton para uso global
let financeGatewayInstance: MockFinanceGateway | null = null;

/**
 * Cria uma nova instância do gateway financeiro
 */
export function createFinanceGateway(latenciaMs: number = 150): IFinanceGateway {
  return new MockFinanceGateway(latenciaMs);
}

/**
 * Obtém instância singleton do gateway financeiro
 */
export function getFinanceGateway(): IFinanceGateway {
  if (!financeGatewayInstance) {
    financeGatewayInstance = new MockFinanceGateway();
  }
  return financeGatewayInstance;
}

/**
 * Reseta o gateway (útil para testes)
 */
export function resetFinanceGateway(): void {
  financeGatewayInstance = null;
  invoicesEmMemoria.clear();
  contadorInvoices = 1;
}

/**
 * Obtém invoices em memória (útil para testes)
 */
export function getInvoicesEmMemoria(): Map<string, Invoice> {
  return invoicesEmMemoria;
}
