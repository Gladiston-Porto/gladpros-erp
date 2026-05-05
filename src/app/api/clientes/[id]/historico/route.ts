import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientePermission } from '@/shared/lib/rbac'
import { clienteParamsSchema } from '@/shared/lib/validations/cliente'
import { withErrorHandler } from '@/lib/api/error-handler'
import { can, type Role } from '@/shared/lib/rbac-core'

/**
 * GET /api/clientes/[id]/historico
 * Retorna o histórico de trabalho vinculado ao cliente:
 * - Ordens de Serviço
 * - Propostas
 * - Projetos
 * - Faturas (Invoice)
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => {
  const user = await requireClientePermission(request, 'canRead')
  const canViewFinancial = can(user.role as Role, 'invoices', 'read') || can(user.role as Role, 'financeiro', 'read')
  const EMPRESA_ID = 1 // single-tenant: GladPros

  const { id } = clienteParamsSchema.parse(await ctx.params)

  // Verificar se o cliente existe
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!cliente) {
    return NextResponse.json({ error: 'Not Found', message: 'Cliente não encontrado', success: false }, { status: 404 })
  }

  // Buscar todos os dados vinculados em paralelo
  const [serviceOrders, propostas, projetos, invoices, warrantyTickets, revenues, invoicePayments] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: { clienteId: id },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        scheduledDate: true,
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),

    prisma.proposta.findMany({
      where: { clienteId: id, deletedAt: null },
      select: {
        id: true,
        numeroProposta: true,
        tipoServico: true,
        status: true,
        valorEstimado: true,
        moeda: true,
        dataCriacao: true,
        criadoEm: true,
      },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    }),

    prisma.projeto.findMany({
      where: { clienteId: id },
      select: {
        id: true,
        titulo: true,
        status: true,
        valorEstimado: true,
        criadoEm: true,
      },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    }),

    prisma.invoice.findMany({
      where: { clienteId: id },
      select: {
        id: true,
        numeroInvoice: true,
        status: true,
        valorTotal: true,
        dataEmissao: true,
        dataVencimento: true,
        dataPagamento: true,
      },
      orderBy: { dataEmissao: 'desc' },
      take: 50,
    }),

    prisma.warrantyTicket.findMany({
      where: { clienteId: id },
      select: {
        id: true,
        title: true,
        status: true,
        reportedAt: true,
        resolvedAt: true,
        costToRepair: true,
        coveredByWarranty: true,
        warrantyExpiresAt: true,
        serviceOrderCreatedId: true,
      },
      orderBy: { reportedAt: 'desc' },
      take: 50,
    }),

    canViewFinancial
      ? prisma.revenue.findMany({
          where: { clienteId: id, empresaId: EMPRESA_ID },
          select: {
            id: true,
            descricao: true,
            valor: true,
            status: true,
            tipo: true,
            dataEmissao: true,
            dataVencimento: true,
            dataPagamento: true,
            categoria: {
              select: {
                nome: true,
              },
            },
          },
          orderBy: { dataEmissao: 'desc' },
          take: 50,
        })
      : Promise.resolve([]),

    canViewFinancial
      ? prisma.invoicePayment.findMany({
          where: {
            invoice: {
              clienteId: id,
            },
          },
          select: {
            id: true,
            invoiceId: true,
            valor: true,
            dataPagamento: true,
            metodoPagamento: true,
            referencia: true,
            invoice: {
              select: {
                numeroInvoice: true,
              },
            },
          },
          orderBy: { dataPagamento: 'desc' },
          take: 50,
        })
      : Promise.resolve([]),
  ])

  const totalInvoiceValue = invoices.reduce((sum, inv) => sum + Number(inv.valorTotal), 0)
  const paidInvoiceValue = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + Number(inv.valorTotal), 0)
  const outstandingInvoiceValue = invoices
    .filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + Number(inv.valorTotal), 0)
  const projectPipelineValue = projetos.reduce((sum, proj) => sum + Number(proj.valorEstimado ?? 0), 0)
  const activeWarrantyTickets = warrantyTickets.filter((ticket) => ticket.status !== 'RESOLVED' && ticket.status !== 'DENIED').length
  const totalRevenueValue = revenues.reduce((sum, revenue) => sum + Number(revenue.valor), 0)
  const receivedRevenueValue = revenues
    .filter((revenue) => revenue.status === 'RECEBIDA')
    .reduce((sum, revenue) => sum + Number(revenue.valor), 0)
  const outstandingRevenueValue = revenues
    .filter((revenue) => revenue.status === 'PENDENTE' || revenue.status === 'VENCIDA')
    .reduce((sum, revenue) => sum + Number(revenue.valor), 0)
  const invoicePaymentsValue = invoicePayments.reduce((sum, payment) => sum + Number(payment.valor), 0)

  return NextResponse.json({
    success: true,
    data: {
      serviceOrders: serviceOrders.map((os) => ({
        id: os.id,
        ticketNumber: os.ticketNumber,
        title: os.title,
        status: os.status,
        scheduledDate: os.scheduledDate?.toISOString() ?? null,
        total: os.total ? Number(os.total) : 0,
        criadoEm: os.createdAt.toISOString(),
      })),
      propostas: propostas.map((p) => ({
        id: p.id,
        numeroProposta: p.numeroProposta,
        tipoServico: p.tipoServico,
        status: p.status,
        valorEstimado: p.valorEstimado ? Number(p.valorEstimado) : null,
        moeda: p.moeda,
        criadoEm: p.criadoEm.toISOString(),
      })),
      projetos: projetos.map((proj) => ({
        id: proj.id,
        titulo: proj.titulo,
        status: proj.status,
        valorEstimado: proj.valorEstimado ? Number(proj.valorEstimado) : null,
        criadoEm: proj.criadoEm.toISOString(),
      })),
      invoices: invoices.map((inv) => ({
        id: inv.id,
        numeroInvoice: inv.numeroInvoice,
        status: inv.status,
        valorTotal: Number(inv.valorTotal),
        dataEmissao: inv.dataEmissao.toISOString(),
        dataVencimento: inv.dataVencimento.toISOString(),
        dataPagamento: inv.dataPagamento?.toISOString() ?? null,
      })),
      warrantyTickets: warrantyTickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        reportedAt: ticket.reportedAt.toISOString(),
        resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
        costToRepair: ticket.costToRepair ? Number(ticket.costToRepair) : null,
        coveredByWarranty: ticket.coveredByWarranty,
        warrantyExpiresAt: ticket.warrantyExpiresAt?.toISOString() ?? null,
        serviceOrderCreatedId: ticket.serviceOrderCreatedId,
      })),
      revenues: canViewFinancial
        ? revenues.map((revenue) => ({
            id: revenue.id,
            descricao: revenue.descricao,
            categoria: revenue.categoria.nome,
            status: revenue.status,
            tipo: revenue.tipo,
            valor: Number(revenue.valor),
            dataEmissao: revenue.dataEmissao.toISOString(),
            dataVencimento: revenue.dataVencimento.toISOString(),
            dataPagamento: revenue.dataPagamento?.toISOString() ?? null,
          }))
        : [],
      invoicePayments: canViewFinancial
        ? invoicePayments.map((payment) => ({
            id: payment.id,
            invoiceId: payment.invoiceId,
            invoiceNumber: payment.invoice.numeroInvoice,
            valor: Number(payment.valor),
            dataPagamento: payment.dataPagamento.toISOString(),
            metodoPagamento: payment.metodoPagamento,
            referencia: payment.referencia ?? null,
          }))
        : [],
      totais: {
        serviceOrders: serviceOrders.length,
        propostas: propostas.length,
        projetos: projetos.length,
        invoices: invoices.length,
        warrantyTickets: warrantyTickets.length,
        revenues: canViewFinancial ? revenues.length : 0,
        invoicePayments: canViewFinancial ? invoicePayments.length : 0,
      },
      permissions: {
        canViewFinancial,
      },
      metrics: {
        lifetimeValue: paidInvoiceValue,
        outstandingValue: outstandingInvoiceValue,
        totalInvoiceValue,
        projectPipelineValue,
        activeWarrantyTickets,
        totalRevenueValue: canViewFinancial ? totalRevenueValue : undefined,
        receivedRevenueValue: canViewFinancial ? receivedRevenueValue : undefined,
        outstandingRevenueValue: canViewFinancial ? outstandingRevenueValue : undefined,
        invoicePaymentsValue: canViewFinancial ? invoicePaymentsValue : undefined,
      },
    },
  })
})
