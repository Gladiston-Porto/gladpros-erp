/**
 * Playbook: invoice.overdue
 * Triggered by a scheduled job or manual check when an invoice passes its due date
 * 
 * Steps:
 * 1. Validate the invoice is indeed overdue
 * 2. Update invoice status to OVERDUE
 * 3. Notify project responsible and admin
 */
import { PlaybookStep, PlaybookContext } from './types';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/shared/lib/notifications';

export interface InvoiceOverdueContext extends PlaybookContext {
  invoiceId: number;
  // Populated by steps
  projetoId?: number;
  empresaId?: number;
}

export function createInvoiceOverdueSteps(ctx: InvoiceOverdueContext): PlaybookStep[] {
  return [
    {
      name: 'validate-invoice',
      async run() {
        const invoice = await prisma.invoice.findUnique({
          where: { id: ctx.invoiceId },
          select: {
            id: true,
            status: true,
            dataVencimento: true,
            projetoId: true,
            valorTotal: true,
            saldo: true,
            empresaId: true,
          },
        });

        if (!invoice) {
          throw new Error(`Invoice ${ctx.invoiceId} não encontrada`);
        }

        // Already in a terminal state — skip
        if (['PAID', 'CANCELLED', 'OVERDUE'].includes(invoice.status)) {
          throw new Error(`Invoice ${ctx.invoiceId} já está ${invoice.status} — ignorando`);
        }

        // Not yet due
        if (invoice.dataVencimento && new Date(invoice.dataVencimento) > new Date()) {
          throw new Error(`Invoice ${ctx.invoiceId} ainda não está vencida`);
        }

        ctx.projetoId = invoice.projetoId ?? undefined;
        ctx.empresaId = invoice.empresaId;
      },
    },
    {
      name: 'mark-overdue',
      async run() {
        const result = await prisma.invoice.updateMany({
          where: {
            id: ctx.invoiceId,
            status: { notIn: ['PAID', 'CANCELLED', 'OVERDUE'] },
          },
          data: { status: 'OVERDUE' },
        });
        // If count === 0, the invoice status changed between validation and update (race condition)
        if (result.count === 0) {
          throw new Error(`Invoice ${ctx.invoiceId} não pode ser marcada OVERDUE — status mudou concorrentemente`);
        }
      },
    },
    {
      name: 'notify-overdue',
      async run() {
        const invoice = await prisma.invoice.findUnique({
          where: { id: ctx.invoiceId },
          select: {
            numeroInvoice: true,
            valorTotal: true,
            saldo: true,
            dataVencimento: true,
            projetoId: true,
          },
        });

        if (!invoice) return;

        const valor = Number(invoice.saldo ?? invoice.valorTotal ?? 0);
        const dataVenc = invoice.dataVencimento
          ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(invoice.dataVencimento))
          : 'N/A';
        const valorFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valor);

        // Fetch project info separately if linked
        let projeto: { numeroProjeto: string; titulo: string; responsavelId: number | null; criadoPor: number } | null = null;
        if (invoice.projetoId) {
          projeto = await prisma.projeto.findUnique({
            where: { id: invoice.projetoId },
            select: { numeroProjeto: true, titulo: true, responsavelId: true, criadoPor: true },
          });
        }

        const msg = `Invoice ${invoice.numeroInvoice ?? ctx.invoiceId} (${valorFormatted}) overdue since ${dataVenc}${projeto ? ` — Project ${projeto.numeroProjeto}` : ''}`;

        // Notify project responsible
        if (projeto?.responsavelId) {
          await NotificationService.create({
            userId: projeto.responsavelId,
            type: 'warning',
            title: 'Overdue Invoice',
            message: msg,
            data: { type: 'invoice_overdue', invoiceId: ctx.invoiceId, projetoId: ctx.projetoId },
          }).catch(() => {});
        }

        // Notify project creator as fallback
        if (projeto?.criadoPor && projeto.criadoPor !== projeto.responsavelId) {
          await NotificationService.create({
            userId: projeto.criadoPor,
            type: 'warning',
            title: 'Overdue Invoice',
            message: msg,
            data: { type: 'invoice_overdue', invoiceId: ctx.invoiceId, projetoId: ctx.projetoId },
          }).catch(() => {});
        }

        // Notify all admins — scoped to the same empresa as the invoice
        const admins = await prisma.usuario.findMany({
          where: { nivel: 'ADMIN', status: 'ATIVO', empresaId: ctx.empresaId },
          select: { id: true },
        });

        for (const admin of admins) {
          if (admin.id !== projeto?.responsavelId && admin.id !== projeto?.criadoPor) {
            await NotificationService.create({
              userId: admin.id,
              type: 'warning',
              title: 'Overdue Invoice',
              message: msg,
              data: { type: 'invoice_overdue', invoiceId: ctx.invoiceId, projetoId: ctx.projetoId },
            }).catch(() => {});
          }
        }
      },
    },
  ];
}
