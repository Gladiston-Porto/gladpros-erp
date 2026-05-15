/**
 * GET /api/projetos/[id]/financeiro/billing-schedule
 * Retorna o cronograma de faturamento do projeto: planejado vs. executado por tipo.
 *
 * "Planejado" = invoices DRAFT ou SENT (emitidas mas ainda não pagas).
 * "Executado"  = invoices PAID ou PARTIALLY_PAID.
 * "Cancelado"  = invoices CANCELLED/VOID — excluídas do cronograma ativo.
 *
 * Requer canViewFinancials.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import type { InvoiceBillingType, InvoiceStatus } from '@prisma/client';

type BillingLineItem = {
  invoiceId: number;
  invoiceNumber: string;
  billingType: InvoiceBillingType;
  billingReference: string | null;
  status: InvoiceStatus;
  valorTotal: number;
  dueDate: string | null;
  paidAt: string | null;
  issuedAt: string;
};

type BillingTypeGroup = {
  billingType: InvoiceBillingType;
  label: string;
  planned: number;      // total ainda pendente (DRAFT + SENT)
  executed: number;     // total recebido (PAID + PARTIALLY_PAID)
  items: BillingLineItem[];
};

const BILLING_TYPE_LABELS: Record<InvoiceBillingType, string> = {
  DEPOSIT: 'Depósito / Entrada',
  PROGRESS: 'Medição / Progresso',
  MILESTONE: 'Marco Contratual',
  MATERIALS: 'Materiais',
  SERVICE_ORDER: 'Ordem de Serviço',
  FINAL: 'Faturamento Final',
};

const ACTIVE_STATUSES: InvoiceStatus[] = ['DRAFT', 'SENT', 'OVERDUE', 'PAID', 'PARTIALLY_PAID'];

export const GET = withErrorHandler(async (req: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
  const user = await requireProjectPermission(req, 'canViewFinancials');

  const { id } = await context.params;
  const projetoId = parseInt(id, 10);

  if (isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID do projeto inválido', success: false },
      { status: 400 },
    );
  }

  await requireProjectAccess(user, projetoId, 'canViewFinancials');

  const invoices = await prisma.invoice.findMany({
    where: {
      projetoId,
      status: { in: ACTIVE_STATUSES },
      deletadoEm: null,
    },
    select: {
      id: true,
      invoiceNumber: true,
      billingType: true,
      billingReference: true,
      status: true,
      totalAmount: true,
      dueDate: true,
      paidAt: true,
      issuedAt: true,
    },
    orderBy: { issuedAt: 'asc' },
    take: 200,
  });

  // Group by billing type
  const groupMap = new Map<InvoiceBillingType, BillingTypeGroup>();

  for (const inv of invoices) {
    const type = inv.billingType;
    if (!groupMap.has(type)) {
      groupMap.set(type, {
        billingType: type,
        label: BILLING_TYPE_LABELS[type],
        planned: 0,
        executed: 0,
        items: [],
      });
    }

    const group = groupMap.get(type)!;
    const valor = Number(inv.totalAmount ?? 0);

    const isPaid = inv.status === 'PAID' || inv.status === 'PARTIALLY_PAID';
    if (isPaid) {
      group.executed += valor;
    } else {
      group.planned += valor;
    }

    group.items.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber ?? `INV-${inv.id}`,
      billingType: type,
      billingReference: inv.billingReference,
      status: inv.status,
      valorTotal: valor,
      dueDate: inv.dueDate?.toISOString() ?? null,
      paidAt: inv.paidAt?.toISOString() ?? null,
      issuedAt: inv.issuedAt?.toISOString() ?? new Date(0).toISOString(),
    });
  }

  // Enforce display order: DEPOSIT → PROGRESS → MILESTONE → MATERIALS → SERVICE_ORDER → FINAL
  const ORDER: InvoiceBillingType[] = ['DEPOSIT', 'PROGRESS', 'MILESTONE', 'MATERIALS', 'SERVICE_ORDER', 'FINAL'];
  const groups: BillingTypeGroup[] = ORDER
    .filter(t => groupMap.has(t))
    .map(t => groupMap.get(t)!);

  // Totals
  const totalPlanned = groups.reduce((s, g) => s + g.planned, 0);
  const totalExecuted = groups.reduce((s, g) => s + g.executed, 0);
  const totalBillingSchedule = totalPlanned + totalExecuted;

  return NextResponse.json({
    data: {
      projetoId,
      totalPlanned: Number(totalPlanned.toFixed(2)),
      totalExecuted: Number(totalExecuted.toFixed(2)),
      totalBillingSchedule: Number(totalBillingSchedule.toFixed(2)),
      coveragePct: totalBillingSchedule > 0
        ? Number(((totalExecuted / totalBillingSchedule) * 100).toFixed(1))
        : 0,
      groups,
    },
    success: true,
  });
});
