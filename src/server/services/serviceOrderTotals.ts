import { prisma } from '@/lib/prisma';
import { computeMarginStatus, fireMarginAlertsIfNeeded } from '@/shared/services/marginService';

/**
 * Resolve o preço unitário de faturamento de um material.
 * Prioridade: unitPrice (preço de fatura) > unitCostActual (custo real) > unitCostEstimated (estimativa).
 * Centralizado aqui para evitar divergência entre o playbook e a rota manual de fatura.
 */
export function resolveUnitPrice(mat: {
    unitPrice?: { toNumber?: () => number } | number | null;
    unitCostActual?: { toNumber?: () => number } | number | null;
    unitCostEstimated?: { toNumber?: () => number } | number | null;
}): number {
    return Number(mat.unitPrice ?? mat.unitCostActual ?? mat.unitCostEstimated ?? 0);
}

/**
 * Recalculate and persist all cost totals for a ServiceOrder.
 *
 * total = laborTotal + materialTotal — always derived from both components,
 * never written as a partial update to avoid wiping either side.
 *
 * Call this after any operation that changes materials or work entries.
 */
export async function recalculateTotals(serviceOrderId: number): Promise<void> {
    const so = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        select: {
            workEntries: { select: { totalCost: true } },
            materials: {
                where: { status: { in: ['RESERVED', 'CONSUMED'] } },
                select: {
                    status: true,
                    unitPrice: true,
                    unitCostActual: true,
                    unitCostEstimated: true,
                    quantityUsed: true,
                    quantityPlanned: true,
                },
            },
        },
    });

    if (!so) return;

    const laborTotal = so.workEntries.reduce(
        (sum, e) => sum + Number(e.totalCost || 0),
        0
    );

    let materialTotal = 0;
    for (const mat of so.materials) {
        const cost = resolveUnitPrice(mat);
        const qty =
            mat.status === 'CONSUMED'
                ? Number(mat.quantityUsed ?? mat.quantityPlanned)
                : Number(mat.quantityPlanned);
        materialTotal += cost * qty;
    }

    // Compute marginStatus if agreedClientPrice is set
    let marginStatus = 'OK';
    const so2 = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        select: { agreedClientPrice: true, ticketNumber: true },
    });
    if (so2?.agreedClientPrice) {
        const result = computeMarginStatus(Number(so2.agreedClientPrice), materialTotal, laborTotal);
        if (result) marginStatus = result.status;
    }

    await prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
            laborTotal,
            materialTotal,
            total: laborTotal + materialTotal,
            marginStatus,
        },
    });

    // Fire alerts/notifications for actionable statuses (non-blocking)
    if (so2?.agreedClientPrice && (marginStatus === 'ALERT' || marginStatus === 'CRITICAL' || marginStatus === 'LOSS')) {
        fireMarginAlertsIfNeeded(serviceOrderId, Number(so2.agreedClientPrice), materialTotal, laborTotal, so2.ticketNumber ?? undefined).catch(() => {/* non-blocking */});
    }
}
