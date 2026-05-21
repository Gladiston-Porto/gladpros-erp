/**
 * Prisma Finance Gateway — Real implementation
 * Integra o domain de projetos com o módulo financeiro via Invoice/InvoiceItem/InvoicePayment.
 * Substitui o MockFinanceGateway em produção — dados persistidos no banco MySQL.
 */
import { prisma } from '@/lib/prisma';
import { Prisma, type InvoiceBillingType } from '@prisma/client';
import { aggregateProjectCosts } from '@/shared/lib/services/project-finance';
import type {
  IFinanceGateway,
  GerarInvoiceDTO,
  Invoice,
  ItemInvoice,
  ListarInvoicesDTO,
  ListarInvoicesResponse,
  RegistrarPagamentoDTO,
  ResumoFinanceiroProjeto,
  RespostaFinanceira,
} from '../interfaces/finance-gateway.interface';

// Map gateway FormaPagamento to Prisma InvoicePayment_metodo
const METODO_MAP: Record<string, string> = {
  BOLETO: 'BANK_TRANSFER',
  PIX: 'BANK_TRANSFER',
  CARTAO_CREDITO: 'CARD',
  CARTAO_DEBITO: 'CARD',
  TRANSFERENCIA: 'BANK_TRANSFER',
  DINHEIRO: 'CASH',
  CHEQUE: 'CHECK',
};

const PROJECT_FINAL_INVOICE_READY_STATUS = 'concluido';

class ProjectInvoiceRuleError extends Error {}

function resolveBillingType(dados: GerarInvoiceDTO): InvoiceBillingType {
  if (dados.serviceOrderId) return 'SERVICE_ORDER';
  return (dados.billingType ?? 'FINAL') as InvoiceBillingType;
}

function resolveBillingReference(dados: GerarInvoiceDTO, billingType: InvoiceBillingType): string | null {
  if (billingType === 'SERVICE_ORDER') {
    if (!dados.serviceOrderId) {
      throw new ProjectInvoiceRuleError('Invoice de OS exige serviceOrderId');
    }
    return `so-${dados.serviceOrderId}`;
  }

  const reference = dados.billingReference?.trim();
  if ((billingType === 'MILESTONE' || billingType === 'MATERIALS') && !reference) {
    throw new ProjectInvoiceRuleError(`Invoice ${billingType} exige billingReference`);
  }

  return reference || null;
}

function buildActiveBillingKey(projetoId: number, billingType: InvoiceBillingType, billingReference: string | null): string {
  return `PROJECT:${projetoId}:${billingType}:${billingReference ?? 'NONE'}`;
}

async function generateInvoiceNumber(offset = 0): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const last = await prisma.invoice.findFirst({
    where: { numeroInvoice: { startsWith: prefix } },
    orderBy: { numeroInvoice: 'desc' },
    select: { numeroInvoice: true },
  });

  let seq = 1;
  if (last) {
    const num = parseInt(last.numeroInvoice.substring(prefix.length), 10);
    if (!isNaN(num)) seq = num + 1 + offset;
  }

  return `${prefix}${String(seq).padStart(6, '0')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPrismaInvoiceToGateway(inv: any): Invoice {
  return {
    id: String(inv.id),
    numeroInvoice: inv.numeroInvoice,
    projetoId: inv.projetoId,
    numeroProjeto: inv.projeto?.numeroProjeto ?? '',
    clienteId: inv.clienteId,
    clienteNome: inv.cliente?.nomeCompleto ?? inv.cliente?.nomeFantasia ?? '',
    status: mapStatus(inv.status),
    descricao: inv.notas ?? '',
    dataEmissao: inv.dataEmissao,
    dataVencimento: inv.dataVencimento,
    dataPagamento: inv.dataPagamento ?? undefined,
    itens: (inv.itens ?? []).map(mapItem),
    subtotal: Number(inv.subtotal),
    desconto: Number(inv.descontoValor),
    valorTotal: Number(inv.valorTotal),
    valorPago: Number(inv.valorPago),
    formaPagamento: undefined,
    observacoes: inv.notas ?? undefined,
    criadoEm: inv.criadoEm,
    atualizadoEm: inv.atualizadoEm,
  };
}

function mapStatus(prismaStatus: string): Invoice['status'] {
  const map: Record<string, Invoice['status']> = {
    DRAFT: 'RASCUNHO',
    SENT: 'PENDENTE',
    VIEWED: 'PENDENTE',
    PARTIAL_PAID: 'PENDENTE',
    PAID: 'PAGO',
    OVERDUE: 'VENCIDO',
    CANCELLED: 'CANCELADO',
  };
  return map[prismaStatus] ?? 'PENDENTE';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(item: any): ItemInvoice {
  return {
    descricao: item.descricao,
    tipo: item.tipo === 'SERVICE' ? 'SERVICO' : item.tipo === 'MATERIAL' ? 'MATERIAL' : 'OUTROS',
    quantidade: Number(item.quantidade),
    valorUnitario: Number(item.precoUnitario),
    valorTotal: Number(item.subtotal),
    referenciaId: item.materialId ?? item.propostaEtapaId ?? undefined,
  };
}

export class PrismaFinanceGateway implements IFinanceGateway {
  async gerarInvoice(dados: GerarInvoiceDTO): Promise<RespostaFinanceira> {
    let billingType: InvoiceBillingType;
    let billingReference: string | null;
    try {
      billingType = resolveBillingType(dados);
      billingReference = resolveBillingReference(dados, billingType);
    } catch (error) {
      if (error instanceof ProjectInvoiceRuleError) {
        return { sucesso: false, mensagem: error.message };
      }
      throw error;
    }
    const activeBillingKey = buildActiveBillingKey(dados.projetoId, billingType, billingReference);

    const projeto = await prisma.projeto.findUnique({
      where: { id: dados.projetoId },
      include: {
        Cliente: true,
        Proposta: true,
        Materiais: {
          where: { repassarCustoCliente: true },
          select: { nome: true, unidade: true, quantidadeUtilizada: true, plannedQty: true, actualUnitCost: true, plannedUnitCost: true },
        },
      },
    });

    if (!projeto) {
      return { sucesso: false, mensagem: `Projeto ${dados.projetoId} não encontrado` };
    }

    if (billingType === 'FINAL' && projeto.status !== PROJECT_FINAL_INVOICE_READY_STATUS) {
      return {
        sucesso: false,
        mensagem: 'Invoice FINAL de projeto só pode ser gerada após o projeto estar concluído',
      };
    }

    if (dados.dataVencimento <= new Date()) {
      return {
        sucesso: false,
        mensagem: 'Data de vencimento da invoice deve ser futura',
      };
    }

    // Build invoice items with proper typing
    const itens: Array<{
      tipo: 'SERVICE' | 'MATERIAL' | 'OTHER';
      descricao: string;
      quantidade: number;
      unidade: string;
      precoUnitario: number;
      desconto: number;
      subtotal: number;
      ordem: number;
    }> = [];
    let subtotal = 0;
    let ordem = 0;

    if (dados.incluirProposta !== false && projeto.Proposta) {
      const valor = Number(projeto.Proposta.valorEstimado ?? projeto.valorEstimado ?? 0);
      if (valor > 0) {
        subtotal += valor;
        itens.push({
          tipo: 'SERVICE',
          descricao: `Serviços conforme proposta ${projeto.Proposta.numeroProposta}`,
          quantidade: 1,
          unidade: 'SV',
          precoUnitario: valor,
          desconto: 0,
          subtotal: valor,
          ordem: ordem++,
        });
      }
    }

    if (dados.incluirMateriais !== false && projeto.Materiais.length > 0) {
      for (const mat of projeto.Materiais) {
        const qty = Number(mat.quantidadeUtilizada ?? mat.plannedQty ?? 0);
        const unitCost = Number(mat.actualUnitCost ?? mat.plannedUnitCost ?? 0);
        if (qty > 0 && unitCost > 0) {
          const total = qty * unitCost;
          subtotal += total;
          itens.push({
            tipo: 'MATERIAL',
            descricao: mat.nome,
            quantidade: qty,
            unidade: mat.unidade ?? 'un',
            precoUnitario: unitCost,
            desconto: 0,
            subtotal: total,
            ordem: ordem++,
          });
        }
      }
    }

    if (dados.itensAdicionais) {
      for (const item of dados.itensAdicionais) {
        subtotal += item.valorTotal;
        const tipo = item.tipo === 'MATERIAL' ? 'MATERIAL' : 'SERVICE';
        itens.push({
          tipo,
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade: 'UN',
          precoUnitario: item.valorUnitario,
          desconto: 0,
          subtotal: item.valorTotal,
          ordem: ordem++,
        });
      }
    }

    if (itens.length === 0) {
      return {
        sucesso: false,
        mensagem: 'Invoice precisa ter ao menos um item faturável',
      };
    }

    let invoice: { id: number; numeroInvoice: string; valorTotal: Prisma.Decimal } | null = null;
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const numeroInvoice = await generateInvoiceNumber(attempt);
          invoice = await prisma.$transaction(async (tx) => {
      const [
        invoiceExistente,
        serviceOrderFaturada,
        serviceOrderDoProjeto,
        totalFaturadoAntes,
      ] = await Promise.all([
        tx.invoice.findFirst({
          where: {
            activeBillingKey,
          },
          select: { id: true, numeroInvoice: true },
        }),
        billingType === 'FINAL'
          ? tx.serviceOrder.findFirst({
              where: {
                projetoId: dados.projetoId,
                invoiceId: { not: null },
                Invoice: { status: { not: 'CANCELLED' } },
              },
              select: { id: true, ticketNumber: true, invoiceId: true },
            })
          : null,
        billingType === 'SERVICE_ORDER'
          ? tx.serviceOrder.findFirst({
              where: {
                id: dados.serviceOrderId!,
                projetoId: dados.projetoId,
              },
              select: {
                id: true,
                ticketNumber: true,
                invoiceId: true,
                Invoice: { select: { status: true, numeroInvoice: true } },
              },
            })
          : null,
        billingType === 'FINAL'
          ? tx.invoice.aggregate({
              where: {
                projetoId: dados.projetoId,
                status: { not: 'CANCELLED' },
              },
              _sum: { valorTotal: true },
            })
          : null,
      ]);

      if (invoiceExistente) {
        throw new ProjectInvoiceRuleError(`Já existe uma invoice ativa para este faturamento (${invoiceExistente.numeroInvoice})`);
      }

      if (serviceOrderFaturada) {
        throw new ProjectInvoiceRuleError(
          `Projeto possui OS já faturada (${serviceOrderFaturada.ticketNumber}). Gere a invoice FINAL somente após conciliar ou cancelar a invoice da OS.`
        );
      }

      if (billingType === 'SERVICE_ORDER') {
        if (!serviceOrderDoProjeto) {
          throw new ProjectInvoiceRuleError('Service Order não pertence ao projeto informado');
        }

        if (serviceOrderDoProjeto.invoiceId && serviceOrderDoProjeto.Invoice?.status !== 'CANCELLED') {
          throw new ProjectInvoiceRuleError(
            `OS ${serviceOrderDoProjeto.ticketNumber} já possui invoice ativa (${serviceOrderDoProjeto.Invoice?.numeroInvoice})`
          );
        }
      }

      const totalFaturadoAnterior = Number(totalFaturadoAntes?._sum.valorTotal ?? 0);
      const descontoBase = dados.descontoFixo ?? (dados.desconto ? (subtotal * dados.desconto) / 100 : 0);
      const descontoValor = billingType === 'FINAL' ? descontoBase + totalFaturadoAnterior : descontoBase;
      const descontoPercentual = dados.desconto ?? 0;
      const taxableBase = subtotal - descontoValor;
      if (taxableBase <= 0) {
        throw new ProjectInvoiceRuleError('Invoice FINAL não possui saldo faturável após considerar invoices anteriores');
      }
      const taxRate = 0.0825;
      const taxAmount = taxableBase * taxRate;
      const valorTotal = taxableBase + taxAmount;

      const created = await tx.invoice.create({
        data: {
          numeroInvoice,
          projetoId: dados.projetoId,
          clienteId: projeto.clienteId,
          dataVencimento: dados.dataVencimento,
          subtotal,
          descontoValor,
          descontoPercentual,
          taxRate,
          taxAmount,
          valorTotal,
          saldo: valorTotal,
          status: 'DRAFT',
          billingType,
          billingReference,
          activeBillingKey,
          notas: dados.descricao,
          termos: dados.observacoes,
          criadoPor: dados.usuarioId,
          empresaId: dados.empresaId,
          itens: { create: itens },
        },
        select: { id: true, numeroInvoice: true, valorTotal: true },
      });

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: dados.usuarioId,
          entidade: 'Invoice',
          entidadeId: String(created.id),
          acao: 'CREATE',
          diff: JSON.stringify({
            trigger: 'projetos-gerar-invoice',
            projetoId: dados.projetoId,
            billingType,
            billingReference,
            activeBillingKey,
            numeroInvoice,
            valorTotal,
          }),
        },
      });

      // Link the invoice back to the service order in the same transaction
      if (billingType === 'SERVICE_ORDER' && dados.serviceOrderId) {
        await tx.serviceOrder.update({
          where: { id: dados.serviceOrderId },
          data: { invoiceId: created.id },
        });
      }

      return created;
          });
          break;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002' &&
            attempt < 2
          ) {
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      if (error instanceof ProjectInvoiceRuleError) {
        return { sucesso: false, mensagem: error.message };
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { sucesso: false, mensagem: 'Já existe uma invoice ativa para este faturamento' };
      }
      throw error;
    }

    if (!invoice) {
      return { sucesso: false, mensagem: 'Não foi possível gerar número único para invoice' };
    }

    return {
      sucesso: true,
      invoiceId: String(invoice.id),
      numeroInvoice: invoice.numeroInvoice,
      mensagem: 'Invoice gerado com sucesso',
      detalhes: {
        valorTotal: Number(invoice.valorTotal),
        itens: itens.length,
        dataVencimento: dados.dataVencimento.toISOString(),
      },
    };
  }

  async buscarInvoice(invoiceId: string): Promise<Invoice | null> {
    const inv = await prisma.invoice.findUnique({
      where: { id: parseInt(invoiceId) },
      include: {
        itens: true,
        pagamentos: true,
        projeto: { select: { numeroProjeto: true } },
        cliente: { select: { nomeCompleto: true, nomeFantasia: true } },
      },
    });

    if (!inv) return null;
    return mapPrismaInvoiceToGateway(inv);
  }

  async listarInvoices(filtros: ListarInvoicesDTO): Promise<ListarInvoicesResponse> {
    const where: Prisma.InvoiceWhereInput = {
      empresaId: (() => {
        if (!filtros.empresaId) throw new Error('empresaId is required for listarInvoices');
        return filtros.empresaId;
      })(),
    };
    if (filtros.projetoId) where.projetoId = filtros.projetoId;
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.status) {
      const statusMap: Record<string, string> = {
        RASCUNHO: 'DRAFT',
        PENDENTE: 'SENT',
        PAGO: 'PAID',
        VENCIDO: 'OVERDUE',
        CANCELADO: 'CANCELLED',
      };
      where.status = (statusMap[filtros.status] ?? filtros.status) as import('@prisma/client').Invoice_status;
    }
    if (filtros.apenasVencidos) {
      where.status = 'OVERDUE';
    }

    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          itens: true,
          projeto: { select: { numeroProjeto: true } },
          cliente: { select: { nomeCompleto: true, nomeFantasia: true } },
        },
        skip: (pagina - 1) * limite,
        take: limite,
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    const data = items.map(mapPrismaInvoiceToGateway);

    const valorTotal = data.reduce((s, d) => s + d.valorTotal, 0);
    const valorPago = data.reduce((s, d) => s + d.valorPago, 0);

    return {
      data,
      paginacao: {
        paginaAtual: pagina,
        totalPaginas: Math.ceil(total / limite),
        totalItens: total,
        itensPorPagina: limite,
      },
      resumo: {
        valorTotal,
        valorPago,
        valorPendente: valorTotal - valorPago,
      },
    };
  }

  async registrarPagamento(dados: RegistrarPagamentoDTO): Promise<RespostaFinanceira> {
    const invoiceId = parseInt(dados.invoiceId);
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

    if (!invoice) {
      return { sucesso: false, mensagem: 'Invoice não encontrado' };
    }

    // Tenant isolation guard — reject if invoice belongs to a different empresa
    if (invoice.empresaId !== dados.empresaId) {
      return { sucesso: false, mensagem: 'Invoice não encontrado' };
    }

    if (invoice.status === 'CANCELLED' || invoice.status === 'PAID') {
      return { sucesso: false, mensagem: `Não é possível registrar pagamento — status: ${invoice.status}` };
    }

    const metodo = METODO_MAP[dados.formaPagamento] ?? 'OTHER';

    await prisma.invoicePayment.create({
      data: {
        invoiceId,
        valor: dados.valorPago,
        dataPagamento: dados.dataPagamento,
        metodoPagamento: metodo as 'BANK_TRANSFER' | 'CHECK' | 'CARD' | 'CASH' | 'STRIPE' | 'SQUARE' | 'OTHER',
        referencia: dados.comprovante,
        notas: dados.observacoes,
        criadoPor: dados.usuarioId,
      },
    });

    const novoValorPago = Number(invoice.valorPago) + dados.valorPago;
    const novoStatus = novoValorPago >= Number(invoice.valorTotal) ? 'PAID' : 'PARTIAL_PAID';

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        valorPago: novoValorPago,
        saldo: Number(invoice.valorTotal) - novoValorPago,
        status: novoStatus,
        dataPagamento: novoStatus === 'PAID' ? dados.dataPagamento : undefined,
        atualizadoPor: dados.usuarioId,
      },
    });

    return {
      sucesso: true,
      invoiceId: dados.invoiceId,
      mensagem: novoStatus === 'PAID' ? 'Invoice pago integralmente' : 'Pagamento parcial registrado',
    };
  }

  async cancelarInvoice(invoiceId: string, motivo: string, usuarioId: number, empresaId: number): Promise<RespostaFinanceira> {
    const id = parseInt(invoiceId);
    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      return { sucesso: false, mensagem: 'Invoice não encontrado' };
    }

    // Tenant isolation guard
    if (invoice.empresaId !== empresaId) {
      return { sucesso: false, mensagem: 'Invoice não encontrado' };
    }

    if (invoice.status === 'PAID') {
      return { sucesso: false, mensagem: 'Não é possível cancelar invoice já pago' };
    }

    await prisma.invoice.update({
      where: { id },
        data: {
          status: 'CANCELLED',
          activeBillingKey: null,
          notas: invoice.notas ? `${invoice.notas}\n\nCancelado: ${motivo}` : `Cancelado: ${motivo}`,
          atualizadoPor: usuarioId,
        },
    });

    return {
      sucesso: true,
      invoiceId,
      mensagem: 'Invoice cancelado com sucesso',
    };
  }

  async obterResumoFinanceiro(projetoId: number, empresaId: number): Promise<ResumoFinanceiroProjeto> {
    const projeto = await prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { numeroProjeto: true, valorEstimado: true },
    });

    const [invoiceAgg, invoicesByStatus, materialAgg, expenseAgg, costBreakdown] = await Promise.all([
      prisma.invoice.aggregate({
        where: { projetoId, empresaId, status: { not: 'CANCELLED' } },
        _sum: { valorTotal: true, valorPago: true },
        _count: { _all: true },
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: { projetoId, empresaId, status: { not: 'CANCELLED' } },
        _count: { _all: true },
      }),
      prisma.projetoMaterialEstoque.aggregate({
        where: { projetoId },
        _sum: { custoTotal: true },
      }),
      // Direct project expenses (paid, not linked to a service order to avoid double counting)
      prisma.expense.aggregate({
        where: {
          projetoId,
          serviceOrderId: null,
          status: { in: ['PAGA', 'APROVADA'] },
        },
        _sum: { valor: true },
      }),
      // Real labor cost from TimesheetEntry hours × worker rates (more accurate than ServiceOrder.laborTotal)
      aggregateProjectCosts(projetoId),
    ]);

    const invoiceCountByStatus = new Map(invoicesByStatus.map((item) => [item.status, item._count._all]));

    const valorOrcado = Number(projeto?.valorEstimado ?? 0);
    const valorMateriais = Number(materialAgg._sum.custoTotal ?? 0);
    // Use real labor cost from TimesheetEntry × worker rates (aggregateProjectCosts)
    // This is more accurate than ServiceOrder.laborTotal which requires manual input
    const valorMaoDeObra = costBreakdown.totalLabor;
    const valorDespesas = Number(expenseAgg._sum.valor ?? 0);
    const custoRealTotal = valorMateriais + valorMaoDeObra + valorDespesas;
    const valorFaturado = Number(invoiceAgg._sum.valorTotal ?? 0);
    const valorPago = Number(invoiceAgg._sum.valorPago ?? 0);
    const valorPendente = valorFaturado - valorPago;
    const margem = valorFaturado - custoRealTotal;
    const invoicesPagos = invoiceCountByStatus.get('PAID') ?? 0;

    return {
      projetoId,
      numeroProjeto: projeto?.numeroProjeto ?? '',
      valorOrcado,
      valorMateriais,
      valorMaoDeObra,
      valorDespesas,
      custoRealTotal,
      valorFaturado,
      valorPago,
      valorPendente,
      totalInvoices: invoiceAgg._count._all,
      invoicesPendentes: invoiceAgg._count._all - invoicesPagos,
      invoicesPagos,
      invoicesVencidos: invoiceCountByStatus.get('OVERDUE') ?? 0,
      margem,
      percentualMargem: valorFaturado > 0 ? (margem / valorFaturado) * 100 : 0,
      atualizadoEm: new Date(),
    };
  }

  async verificarConexao(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton factory — use this instead of instantiating directly
let _gateway: PrismaFinanceGateway | null = null;

export function getPrismaFinanceGateway(): PrismaFinanceGateway {
  if (!_gateway) {
    _gateway = new PrismaFinanceGateway();
  }
  return _gateway;
}
