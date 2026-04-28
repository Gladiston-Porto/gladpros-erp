import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { recalculateTotals } from '@/server/services/serviceOrderTotals';
import { stock } from '@/config';

const FIELD_PURCHASE_APPROVAL_THRESHOLD = stock.fieldPurchaseApprovalThreshold;

const bulkConfirmSchema = z.object({
    items: z.array(
        z.object({
            materialId: z.number().int().positive(),
            quantityUsed: z.number().positive().optional(),
            unitCostEstimated: z.number().nonnegative().optional(),
        })
    ).min(1, 'Selecione ao menos um material'),
});

/**
 * POST /api/service-orders/[id]/materials/bulk-confirm
 *
 * Confirms multiple field purchases in a single request.
 * Processes each item using the same rules as PATCH /materials/[materialId]:
 * - materialId !== null → rejected (stock materials use /consume)
 * - cost >= threshold → creates Expense (AGUARDANDO_APROVACAO), item gets needsApproval=true
 * - cost < threshold  → creates Expense (APROVADA) + marks CONSUMED
 *
 * Calls recalculateTotals once at the end (not per item).
 *
 * Response: { data: { succeeded, needsApproval, failed }, success: true }
 */
export const POST = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'service-orders', 'update')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Sem permissão', success: false },
            { status: 403 }
        );
    }

    const empresaId = Number((user as any).empresaId) || 1;
    const { id } = await params;
    const serviceOrderId = parseInt(id);

    if (isNaN(serviceOrderId)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'ID inválido', success: false },
            { status: 400 }
        );
    }

    const body = bulkConfirmSchema.safeParse(await request.json());
    if (!body.success) {
        return NextResponse.json(
            { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
            { status: 400 }
        );
    }

    const { items } = body.data;
    const materialIds = items.map(i => i.materialId);

    // Load all materials + OS info in one query
    const materials = await prisma.serviceOrderMaterial.findMany({
        where: { id: { in: materialIds }, serviceOrderId },
        include: {
            ServiceOrder: { select: { id: true, status: true, ticketNumber: true } },
            fieldExpense: { select: { id: true, status: true } },
        }
    });

    const matMap = new Map(materials.map(m => [m.id, m]));

    // Ensure/create expense category once before processing items
    let categoriaId: number | null = null;
    const ensureCategory = async () => {
        if (categoriaId !== null) return categoriaId;
        let cat = await prisma.expenseCategory.findFirst({
            where: { empresaId, nome: { contains: 'Compra' } },
            select: { id: true },
        });
        if (!cat) {
            cat = await prisma.expenseCategory.create({
                data: { empresaId, nome: 'Compras de Estoque', cor: '#F59E0B' },
                select: { id: true },
            });
        }
        categoriaId = cat.id;
        return categoriaId;
    };

    const succeeded: { materialId: number; name: string }[] = [];
    const needsApproval: { materialId: number; name: string; expenseId: number; amount: number }[] = [];
    const failed: { materialId: number; name: string; reason: string }[] = [];

    for (const item of items) {
        const mat = matMap.get(item.materialId);

        if (!mat) {
            failed.push({ materialId: item.materialId, name: `ID ${item.materialId}`, reason: 'Material não encontrado nesta OS' });
            continue;
        }

        // Stock materials must use /consume route
        if (mat.materialId !== null) {
            failed.push({ materialId: mat.id, name: mat.name, reason: 'Material de estoque: use a ação "Consumir" individual' });
            continue;
        }

        // Already consumed/returned
        if (mat.status === 'CONSUMED' || mat.status === 'RETURNED') {
            failed.push({ materialId: mat.id, name: mat.name, reason: `Já está ${mat.status === 'CONSUMED' ? 'comprado' : 'devolvido'}` });
            continue;
        }

        // If expense is awaiting approval, skip
        if (mat.fieldExpense?.status === 'AGUARDANDO_APROVACAO') {
            failed.push({ materialId: mat.id, name: mat.name, reason: 'Aguardando aprovação do gerente' });
            continue;
        }
        if (mat.fieldExpense?.status === 'REJEITADA') {
            failed.push({ materialId: mat.id, name: mat.name, reason: 'Compra rejeitada — edite o material primeiro' });
            continue;
        }

        const unitCost = Number(item.unitCostEstimated ?? mat.unitCostEstimated ?? mat.unitCostActual ?? 0);
        const qty = Number(item.quantityUsed ?? mat.quantityPlanned ?? 1);
        const totalCost = unitCost * qty;

        if (unitCost === 0) {
            failed.push({ materialId: mat.id, name: mat.name, reason: 'Custo unitário não informado' });
            continue;
        }

        try {
            // Above threshold + no prior expense → needs approval
            if (totalCost >= FIELD_PURCHASE_APPROVAL_THRESHOLD && !mat.fieldExpenseId) {
                const catId = await ensureCategory();
                const expense = await prisma.$transaction(async (tx) => {
                    const newExpense = await tx.expense.create({
                        data: {
                            empresaId,
                            categoriaId: catId,
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
                        select: { id: true },
                    });
                    await tx.serviceOrderMaterial.update({
                        where: { id: mat.id },
                        data: { fieldExpenseId: newExpense.id },
                    });
                    return newExpense;
                });
                needsApproval.push({ materialId: mat.id, name: mat.name, expenseId: expense.id, amount: totalCost });
                continue;
            }

            // Below threshold or expense already approved → CONSUMED
            const catId = await ensureCategory();
            await prisma.$transaction(async (tx) => {
                let expenseId = mat.fieldExpenseId;
                if (!expenseId) {
                    const newExpense = await tx.expense.create({
                        data: {
                            empresaId,
                            categoriaId: catId,
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
                        select: { id: true },
                    });
                    expenseId = newExpense.id;
                }
                await tx.serviceOrderMaterial.update({
                    where: { id: mat.id },
                    data: {
                        status: 'CONSUMED',
                        quantityUsed: qty,
                        unitCostActual: unitCost,
                        consumedAt: new Date(),
                        fieldExpenseId: expenseId,
                    },
                });
            });

            succeeded.push({ materialId: mat.id, name: mat.name });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro interno';
            failed.push({ materialId: mat.id, name: mat.name, reason: msg });
        }
    }

    // Recalculate totals once for the OS (non-blocking if nothing succeeded)
    if (succeeded.length > 0) {
        recalculateTotals(serviceOrderId).catch(() => {/* non-critical */});
    }

    return NextResponse.json({
        data: { succeeded, needsApproval, failed },
        message: `${succeeded.length} confirmado(s), ${needsApproval.length} aguardando aprovação, ${failed.length} falhou`,
        success: true,
    }, { status: 200 });
});
