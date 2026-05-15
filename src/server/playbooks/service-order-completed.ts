/**
 * Playbook: serviceOrder.completed
 * Triggered when a service order transitions to COMPLETED
 * 
 * Steps:
 * 1. Validate the service order
 * 2. Generate invoice automatically (if not already existing)
 * 3. Notify client and assigned tech
 */
import { PlaybookStep, PlaybookContext } from './types';
import { prisma } from '@/lib/prisma';
import { getFinanceGateway } from '@/domains/projects/gateways';
import { NotificationService } from '@/shared/lib/notifications';
import { resolveUnitPrice } from '../services/serviceOrderTotals';

export interface ServiceOrderCompletedContext extends PlaybookContext {
  serviceOrderId: number;
  completedBy: number;
  // Populated by steps
  invoiceId?: number;
}

export function createServiceOrderCompletedSteps(ctx: ServiceOrderCompletedContext): PlaybookStep[] {
  return [
    {
      name: 'validate-service-order',
      async run() {
        const so = await prisma.serviceOrder.findUnique({
          where: { id: ctx.serviceOrderId },
          select: { id: true, status: true, ticketNumber: true },
        });
        if (!so) {
          throw new Error(`Service Order ${ctx.serviceOrderId} não encontrada`);
        }
        if (so.status !== 'COMPLETED') {
          throw new Error(`Service Order ${so.ticketNumber} não está com status COMPLETED (atual: ${so.status})`);
        }
      },
    },
    {
      name: 'generate-invoice',
      async run() {
        const so = await prisma.serviceOrder.findUnique({
          where: { id: ctx.serviceOrderId },
          select: {
            id: true,
            ticketNumber: true,
            projetoId: true,
            clienteId: true,
            invoiceId: true,
            estimatedHours: true,
            hourlyRate: true,
            materialSupply: true,
            materials: {
              where: { status: 'CONSUMED' },
              select: { quantityUsed: true, unitPrice: true, unitCostActual: true, unitCostEstimated: true },
            },
            workEntries: {
              select: { totalCost: true },
            },
          },
        });

        if (!so) return;

        // Skip if invoice already exists
        if (so.invoiceId) {
          ctx.invoiceId = so.invoiceId;
          return;
        }

        // C17: Standalone SOs (no projetoId) skip auto-invoice — notify creator explicitly
        // so they know to generate the invoice manually via POST /generate-invoice.
        if (!so.projetoId) {
          await prisma.serviceOrder.findUnique({
            where: { id: ctx.serviceOrderId },
            select: { createdById: true, ticketNumber: true },
          }).then(async (orderInfo) => {
            if (orderInfo?.createdById) {
              await NotificationService.create({
                userId: orderInfo.createdById,
                type: 'warning',
                title: 'Fatura pendente — OS standalone',
                message: `OS ${orderInfo.ticketNumber} foi concluída mas não tem projeto vinculado. Gere a fatura manualmente.`,
                data: { type: 'so_invoice_pending', serviceOrderId: ctx.serviceOrderId },
              }).catch(() => {});
            }
          }).catch(() => {});
          return;
        }

        // Calculate total from materials + labor
        let materialTotal = 0;
        if (so.materialSupply === 'COMPANY_PROVIDES') {
          for (const mat of so.materials) {
            materialTotal += Number(mat.quantityUsed ?? 0) * resolveUnitPrice(mat);
          }
        }

        let laborTotal = 0;
        for (const entry of so.workEntries) {
          laborTotal += Number(entry.totalCost ?? 0);
        }

        const total = materialTotal + laborTotal;
        const estimatedCost = so.estimatedHours && so.hourlyRate
          ? Number(so.estimatedHours) * Number(so.hourlyRate)
          : 0;

        if (total <= 0 && estimatedCost <= 0) return;

        const valorInvoice = total > 0 ? total : estimatedCost;
        if (valorInvoice <= 0) return;

        // Use finance gateway to create invoice
        const financeGateway = getFinanceGateway();
        const result = await financeGateway.gerarInvoice({
          projetoId: so.projetoId,
          billingType: 'SERVICE_ORDER',
          serviceOrderId: so.id,
          incluirProposta: false,
          incluirMateriais: false,
          descricao: `Ordem de Serviço ${so.ticketNumber}`,
          itensAdicionais: [
            ...(materialTotal > 0 ? [{
              descricao: 'Materiais consumidos',
              tipo: 'MATERIAL' as const,
              quantidade: 1,
              valorUnitario: materialTotal,
              valorTotal: materialTotal,
            }] : []),
            ...(laborTotal > 0 ? [{
              descricao: 'Mão de obra',
              tipo: 'MAO_DE_OBRA' as const,
              quantidade: 1,
              valorUnitario: laborTotal,
              valorTotal: laborTotal,
            }] : []),
            ...(total <= 0 && estimatedCost > 0 ? [{
              descricao: 'Serviço estimado',
              tipo: 'SERVICO' as const,
              quantidade: 1,
              valorUnitario: estimatedCost,
              valorTotal: estimatedCost,
            }] : []),
          ],
          dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usuarioId: ctx.completedBy,
        });

        if (result.sucesso && result.invoiceId) {
          ctx.invoiceId = Number(result.invoiceId);

          // Link invoice to service order
          await prisma.serviceOrder.update({
            where: { id: ctx.serviceOrderId },
            data: { invoiceId: ctx.invoiceId },
          });
        }
      },
    },
    {
      name: 'notify-completion',
      async run() {
        const so = await prisma.serviceOrder.findUnique({
          where: { id: ctx.serviceOrderId },
          select: {
            ticketNumber: true,
            assignedWorkerId: true,
            createdById: true,
            AssignedWorker: { select: { usuarioId: true } },
          },
        });

        if (!so) return;

        // Notify creator
        if (so.createdById) {
          await NotificationService.create({
            userId: so.createdById,
            type: 'success',
            title: 'Ordem de Serviço concluída',
            message: `OS ${so.ticketNumber} foi concluída${ctx.invoiceId ? `. Invoice #${ctx.invoiceId} gerada.` : ''}`,
            data: { type: 'so_completed', serviceOrderId: ctx.serviceOrderId, invoiceId: ctx.invoiceId },
          }).catch(() => {});
        }

        // Notify assigned worker (if different from completedBy)
        const workerUserId = so.AssignedWorker?.usuarioId;
        if (workerUserId && workerUserId !== ctx.completedBy) {
          await NotificationService.create({
            userId: workerUserId,
            type: 'info',
            title: 'OS concluída',
            message: `OS ${so.ticketNumber} que estava atribuída a você foi concluída`,
            data: { type: 'so_completed', serviceOrderId: ctx.serviceOrderId },
          }).catch(() => {});
        }
      },
    },
  ];
}
