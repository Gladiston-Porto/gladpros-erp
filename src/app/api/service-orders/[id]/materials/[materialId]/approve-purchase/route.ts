import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

/**
 * POST /api/service-orders/[id]/materials/[materialId]/approve-purchase
 *
 * Approve a field purchase that exceeded the threshold.
 * Requires GERENTE or ADMIN role.
 * Changes Expense.status → APROVADA, unblocking the "Comprado" action for the technician.
 */
export const POST = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string; materialId: string }> }
) => {
    const user = await requireUser(request as NextRequest);

    // Only GERENTE or ADMIN can approve field purchases
    if (!['ADMIN', 'GERENTE'].includes(user.role)) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Apenas GERENTE ou ADMIN podem aprovar compras de campo', success: false },
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

    const mat = await prisma.serviceOrderMaterial.findUnique({
        where: { id: matId },
        include: { fieldExpense: { select: { id: true, status: true } } }
    });

    if (!mat || mat.serviceOrderId !== serviceOrderId) {
        return NextResponse.json(
            { error: 'Not found', message: 'Material não encontrado', success: false },
            { status: 404 }
        );
    }

    if (!mat.fieldExpenseId || !mat.fieldExpense) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'Este material não possui compra de campo pendente de aprovação', success: false },
            { status: 400 }
        );
    }

    if (mat.fieldExpense.status !== 'AGUARDANDO_APROVACAO') {
        return NextResponse.json(
            { error: 'Validation failed', message: `Despesa não está aguardando aprovação (status: ${mat.fieldExpense.status})`, success: false },
            { status: 400 }
        );
    }

    await prisma.expense.update({
        where: { id: mat.fieldExpenseId },
        data: {
            status: 'APROVADA',
            observacoes: `Aprovada por ${user.email}`,
        }
    });

    return NextResponse.json({
        data: { materialId: matId, expenseId: mat.fieldExpenseId },
        message: 'Compra de campo aprovada. O técnico pode agora marcar o material como comprado.',
        success: true,
    }, { status: 200 });
});
