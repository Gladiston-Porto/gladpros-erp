import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

const rejectSchema = z.object({
    motivo: z.string().min(1, 'Informe o motivo da rejeição'),
});

/**
 * POST /api/service-orders/[id]/materials/[materialId]/reject-purchase
 *
 * Reject a field purchase that exceeded the threshold.
 * Requires GERENTE or ADMIN role.
 * Changes Expense.status → REJEITADA. The technician should remove or edit the material.
 */
export const POST = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string; materialId: string }> }
) => {
    const user = await requireUser(request as NextRequest);

    if (!['ADMIN', 'GERENTE'].includes(user.role)) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Apenas GERENTE ou ADMIN podem rejeitar compras de campo', success: false },
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

    const body = rejectSchema.safeParse(await request.json());
    if (!body.success) {
        return NextResponse.json(
            { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
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
            { error: 'Validation failed', message: 'Este material não possui compra de campo pendente', success: false },
            { status: 400 }
        );
    }

    if (mat.fieldExpense.status !== 'AGUARDANDO_APROVACAO') {
        return NextResponse.json(
            { error: 'Validation failed', message: `Despesa não está aguardando aprovação (status: ${mat.fieldExpense.status})`, success: false },
            { status: 400 }
        );
    }

    await prisma.$transaction([
        prisma.expense.update({
            where: { id: mat.fieldExpenseId },
            data: { status: 'REJEITADA', observacoes: `Rejeitada por ${user.email}: ${body.data.motivo}` }
        }),
        // Clear fieldExpenseId so the tech can edit and retry
        prisma.serviceOrderMaterial.update({
            where: { id: matId },
            data: { fieldExpenseId: null }
        }),
    ]);

    return NextResponse.json({
        data: { materialId: matId, expenseId: mat.fieldExpenseId },
        message: 'Compra de campo rejeitada. O técnico pode editar e solicitar novamente.',
        success: true,
    }, { status: 200 });
});
