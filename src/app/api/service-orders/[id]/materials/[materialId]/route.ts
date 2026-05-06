import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { recalculateTotals } from '@/server/services/serviceOrderTotals';
import { stock } from '@/config';

const FIELD_PURCHASE_APPROVAL_THRESHOLD = stock.fieldPurchaseApprovalThreshold;

const patchMaterialSchema = z.object({
    // Status transition
    status: z.enum(['CONSUMED', 'RETURNED', 'NEEDS_PURCHASE']).optional(),
    quantityUsed: z.coerce.number().positive().optional(),
    unitCostActual: z.coerce.number().nonnegative().optional(),
    // Editable before reservation
    quantityPlanned: z.coerce.number().positive().optional(),
    unitCostEstimated: z.coerce.number().nonnegative().optional(),
    name: z.string().min(1).optional(),
    unit: z.string().optional(),
});

/**
 * PATCH /api/service-orders/[id]/materials/[materialId]
 *
 * Two use-cases:
 * 1. Edit material details (name, unit, quantityPlanned, unitCostEstimated) — PENDING/NEEDS_PURCHASE only
 * 2. Mark external (no materialId) field purchase as CONSUMED:
 *    - Cost < FIELD_PURCHASE_APPROVAL_THRESHOLD: immediate CONSUMED + auto-create Expense (APROVADA)
 *    - Cost >= threshold: creates Expense in AGUARDANDO_APROVACAO, returns { needsApproval: true }
 *      — GERENTE/ADMIN must approve via POST .../approve-purchase before CONSUMED is allowed
 *      — If fieldExpense is already APROVADA: marks CONSUMED normally
 */
export const PATCH = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string; materialId: string }> }
) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'service-orders', 'update')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Sem permissão', success: false },
            { status: 403 }
        );
    }
    const EMPRESA_ID = 1;

    const { id, materialId } = await params;
    const serviceOrderId = parseInt(id);
    const matId = parseInt(materialId);

    if (isNaN(serviceOrderId) || isNaN(matId)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'ID inválido', success: false },
            { status: 400 }
        );
    }

    const body = patchMaterialSchema.safeParse(await request.json());
    if (!body.success) {
        return NextResponse.json(
            {
                error: 'Validation failed',
                message: body.error.issues[0]?.message ?? 'Dados inválidos',
                success: false,
            },
            { status: 400 }
        );
    }
    const data = body.data;

    // Load material with order info and any existing field expense
    const mat = await prisma.serviceOrderMaterial.findUnique({
        where: { id: matId },
        include: {
            ServiceOrder: { select: { id: true, status: true, ticketNumber: true } },
            fieldExpense: { select: { id: true, status: true } },
        }
    });

    if (!mat || mat.serviceOrderId !== serviceOrderId) {
        return NextResponse.json(
            { error: 'Not found', message: 'Material não encontrado', success: false },
            { status: 404 }
        );
    }

    // Guard: stock-linked materials must use /consume endpoint
    if (data.status === 'CONSUMED' && mat.materialId !== null) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'Use a rota /consume para materiais vinculados ao estoque', success: false },
            { status: 400 }
        );
    }

    // Guard: cannot edit name/unit/qty after reservation
    const editingFields = ['name', 'unit', 'quantityPlanned', 'unitCostEstimated'].some(k => data[k as keyof typeof data] !== undefined);
    if (editingFields && !['PENDING', 'NEEDS_PURCHASE'].includes(mat.status)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'Apenas materiais não reservados podem ser editados', success: false },
            { status: 400 }
        );
    }

    // ── Field purchase approval flow ──────────────────────────────────────────
    if (data.status === 'CONSUMED' && mat.materialId === null) {
        const unitCost = Number(data.unitCostEstimated ?? data.unitCostActual ?? mat.unitCostEstimated ?? mat.unitCostActual ?? 0);
        const qty = Number(data.quantityPlanned ?? mat.quantityPlanned);
        const totalCost = unitCost * qty;

        if (unitCost === 0) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Informe o custo unitário antes de marcar como comprado', success: false },
                { status: 400 }
            );
        }

        // If already has an expense linked — check its status
        if (mat.fieldExpenseId !== null) {
            const expStatus = mat.fieldExpense?.status;
            if (expStatus === 'AGUARDANDO_APROVACAO') {
                return NextResponse.json(
                    { error: 'Validation failed', message: 'Compra aguardando aprovação do gerente. Não é possível marcar como comprado ainda.', success: false, needsApproval: true, expenseId: mat.fieldExpenseId },
                    { status: 409 }
                );
            }
            if (expStatus === 'REJEITADA') {
                return NextResponse.json(
                    { error: 'Validation failed', message: 'Compra foi rejeitada. Edite o material e solicite nova aprovação.', success: false, rejected: true, expenseId: mat.fieldExpenseId },
                    { status: 409 }
                );
            }
            // APROVADA or PENDENTE (below threshold): fall through to CONSUMED
        }

        // Needs approval (above threshold, no prior expense OR expense approved → allow CONSUMED)
        if (totalCost >= FIELD_PURCHASE_APPROVAL_THRESHOLD && mat.fieldExpenseId === null) {
            // Create Expense in AGUARDANDO_APROVACAO and block the CONSUMED transition
            const expense = await prisma.$transaction(async (tx) => {
                // Find/create expense category
                let categoria = await tx.expenseCategory.findFirst({
                    where: { empresaId: EMPRESA_ID, nome: { contains: 'Compra' } },
                    select: { id: true }
                });
                if (!categoria) {
                    categoria = await tx.expenseCategory.create({
                        data: { empresaId: EMPRESA_ID, nome: 'Compras de Estoque', cor: '#F59E0B' },
                        select: { id: true }
                    });
                }

                const newExpense = await tx.expense.create({
                    data: {
                        empresaId: EMPRESA_ID,
                        categoriaId: categoria.id,
                        descricao: `Material de campo: ${mat.name} (OS #${mat.ServiceOrder.ticketNumber})`,
                        valor: totalCost,
                        tipo: 'FORNECEDORES',
                        formaPagamento: 'DINHEIRO',
                        status: 'AGUARDANDO_APROVACAO',
                        requerAprovacao: true,
                        isBillableToClient: false,
                        costCategory: 'MATERIAL',
                        serviceOrderId,
                        dataEmissao: new Date(),
                        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        criadoPor: Number(user.id),
                    },
                    select: { id: true, status: true }
                });

                await tx.serviceOrderMaterial.update({
                    where: { id: matId },
                    data: { fieldExpenseId: newExpense.id }
                });

                return newExpense;
            });

            return NextResponse.json({
                data: { ...mat, fieldExpenseId: expense.id, fieldExpense: expense },
                needsApproval: true,
                expenseId: expense.id,
                message: `Compra de $${totalCost.toFixed(2)} acima do limite. Solicitação enviada para aprovação do gerente.`,
                success: true,
            }, { status: 202 });
        }

        // Below threshold OR expense already approved → create Expense (APROVADA) and mark CONSUMED
        const updated = await prisma.$transaction(async (tx) => {
            let expenseId = mat.fieldExpenseId;

            if (!expenseId) {
                let categoria = await tx.expenseCategory.findFirst({
                    where: { empresaId: EMPRESA_ID, nome: { contains: 'Compra' } },
                    select: { id: true }
                });
                if (!categoria) {
                    categoria = await tx.expenseCategory.create({
                        data: { empresaId: EMPRESA_ID, nome: 'Compras de Estoque', cor: '#F59E0B' },
                        select: { id: true }
                    });
                }

                const newExpense = await tx.expense.create({
                    data: {
                        empresaId: EMPRESA_ID,
                        categoriaId: categoria.id,
                        descricao: `Material de campo: ${mat.name} (OS #${mat.ServiceOrder.ticketNumber})`,
                        valor: totalCost,
                        tipo: 'FORNECEDORES',
                        formaPagamento: 'DINHEIRO',
                        status: 'APROVADA',
                        requerAprovacao: false,
                        isBillableToClient: false,
                        costCategory: 'MATERIAL',
                        serviceOrderId,
                        dataEmissao: new Date(),
                        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        criadoPor: Number(user.id),
                    },
                    select: { id: true }
                });
                expenseId = newExpense.id;
            }

            return tx.serviceOrderMaterial.update({
                where: { id: matId },
                data: {
                    status: 'CONSUMED',
                    quantityUsed: data.quantityUsed ?? mat.quantityPlanned,
                    unitCostActual: data.unitCostActual ?? unitCost,
                    consumedAt: new Date(),
                    fieldExpenseId: expenseId,
                },
            });
        });

        await recalculateTotals(serviceOrderId).catch(() => { /* non-critical */ });
        return NextResponse.json({ data: updated, success: true }, { status: 200 });
    }
    // ── End field purchase flow ───────────────────────────────────────────────

    // Standard update (edit fields or non-CONSUMED status change)
    const updatePayload: Record<string, unknown> = {};
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.quantityUsed !== undefined) updatePayload.quantityUsed = data.quantityUsed;
    if (data.unitCostActual !== undefined) updatePayload.unitCostActual = data.unitCostActual;
    if (data.unitCostEstimated !== undefined) updatePayload.unitCostEstimated = data.unitCostEstimated;
    if (data.quantityPlanned !== undefined) updatePayload.quantityPlanned = data.quantityPlanned;
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.unit !== undefined) updatePayload.unit = data.unit;

    const updated = await prisma.serviceOrderMaterial.update({
        where: { id: matId },
        data: updatePayload,
    });

    await recalculateTotals(serviceOrderId).catch(() => { /* non-critical */ });

    return NextResponse.json({ data: updated, success: true }, { status: 200 });
});

// DELETE /api/service-orders/[id]/materials/[materialId]
// Só permite remover material que ainda não foi reservado ou consumido
export const DELETE = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string; materialId: string }> }
) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'service-orders', 'update')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Sem permissão', success: false },
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
        select: { serviceOrderId: true, status: true, materialId: true }
    });

    if (!mat || mat.serviceOrderId !== serviceOrderId) {
        return NextResponse.json(
            { error: 'Not found', message: 'Material não encontrado', success: false },
            { status: 404 }
        );
    }

    if (!['PENDING', 'NEEDS_PURCHASE'].includes(mat.status)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'Não é possível remover material já reservado ou consumido', success: false },
            { status: 400 }
        );
    }

    await prisma.serviceOrderMaterial.delete({ where: { id: matId } });

    return NextResponse.json({ data: { deleted: true }, success: true }, { status: 200 });
});
