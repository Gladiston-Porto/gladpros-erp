import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { recalculateTotals } from '@/server/services/serviceOrderTotals';
import { randomUUID } from 'crypto';

const correctCostSchema = z.object({
    unitCostActual: z.coerce.number().positive({ message: 'Custo unitário deve ser maior que zero' }),
    reason: z.string().min(3, { message: 'Motivo obrigatório (mínimo 3 caracteres)' }),
});

/**
 * POST /api/service-orders/[id]/materials/[materialId]/correct-cost
 *
 * Allows ADMIN or FINANCEIRO to correct the unitCostActual of a CONSUMED field
 * purchase after entry. Creates an AuditLog with old/new values and reason.
 * Recalculates OS totals and margin after correction.
 *
 * This mirrors how large ERPs handle cost corrections: the record is not deleted
 * or re-opened — it is corrected in-place with a full audit trail.
 */
export const POST = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string; materialId: string }> }
) => {
    const user = await requireUser(request as NextRequest);

    // Only ADMIN and FINANCEIRO can correct costs after entry
    if (!can(user.role as Role, 'financeiro', 'update')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Apenas ADMIN ou FINANCEIRO podem corrigir custos após lançamento', success: false },
            { status: 403 }
        );
    }

    const { id, materialId } = await params;
    const serviceOrderId = parseInt(id);
    const matId = parseInt(materialId);

    if (isNaN(serviceOrderId) || isNaN(matId)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'ID inválido', success: false },
            { status: 400 }
        );
    }

    const body = correctCostSchema.safeParse(await request.json());
    if (!body.success) {
        return NextResponse.json(
            { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
            { status: 400 }
        );
    }

    const { unitCostActual: newUnitCost, reason } = body.data;

    const mat = await prisma.serviceOrderMaterial.findUnique({
        where: { id: matId },
        include: {
            ServiceOrder: { select: { id: true, status: true, ticketNumber: true } },
            fieldExpense: { select: { id: true, status: true, valor: true } },
        }
    });

    if (!mat || mat.serviceOrderId !== serviceOrderId) {
        return NextResponse.json(
            { error: 'Not found', message: 'Material não encontrado', success: false },
            { status: 404 }
        );
    }

    // Only field-purchased materials (no stock link) that are CONSUMED can be corrected
    if (mat.materialId !== null) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'Correção de custo aplica-se apenas a compras de campo (sem vínculo de estoque)', success: false },
            { status: 400 }
        );
    }

    if (mat.status !== 'CONSUMED') {
        return NextResponse.json(
            { error: 'Validation failed', message: 'Apenas materiais já confirmados (CONSUMED) podem ter custo corrigido', success: false },
            { status: 400 }
        );
    }

    const oldUnitCost = Number(mat.unitCostActual ?? mat.unitCostEstimated ?? 0);
    const qty = Number(mat.quantityUsed ?? mat.quantityPlanned);
    const oldTotal = oldUnitCost * qty;
    const newTotal = newUnitCost * qty;

    await prisma.$transaction(async (tx) => {
        // Update material cost
        await tx.serviceOrderMaterial.update({
            where: { id: matId },
            data: { unitCostActual: newUnitCost },
        });

        // Update linked field expense if it exists and is approved
        if (mat.fieldExpenseId && mat.fieldExpense?.status === 'APROVADA') {
            await tx.expense.update({
                where: { id: mat.fieldExpenseId },
                data: { valor: newTotal },
            });
        }

        // Audit trail — required for financial corrections
        await tx.auditLog.create({
            data: {
                id: randomUUID(),
                userId: Number(user.id),
                entidade: 'ServiceOrderMaterial',
                entidadeId: String(matId),
                acao: 'COST_CORRECTION',
                diff: JSON.stringify({
                    field: 'unitCostActual',
                    oldValue: oldUnitCost,
                    newValue: newUnitCost,
                    oldTotal,
                    newTotal,
                    qty,
                    reason,
                    serviceOrderId,
                    ticketNumber: mat.ServiceOrder.ticketNumber,
                    materialName: mat.name,
                }),
            },
        });
    });

    // Recalculate OS totals and margin (outside transaction — non-critical)
    await recalculateTotals(serviceOrderId).catch((err) =>
        console.error('[correct-cost] recalculateTotals error:', err)
    );

    const updated = await prisma.serviceOrderMaterial.findUnique({ where: { id: matId } });

    return NextResponse.json({
        data: updated,
        message: `Custo corrigido: ${mat.name} — de $${oldUnitCost.toFixed(2)} para $${newUnitCost.toFixed(2)} por unidade`,
        success: true,
    });
});
