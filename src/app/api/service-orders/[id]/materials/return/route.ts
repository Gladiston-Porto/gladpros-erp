import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { recalculateTotals } from '@/server/services/serviceOrderTotals';
import { stock } from '@/config';

const DEFAULT_LOCATION_ID = stock.defaultLocationId;

// Structured item for the new return flow
const returnItemSchema = z.object({
    serviceOrderMaterialId: z.number().int().positive(),
    quantityToReturn: z.number().positive(),
    destination: z.enum(['STORE', 'COMPANY_STOCK']),
    refundAmount: z.number().nonnegative().optional(),
});

// Request schema: supports both new structured items and legacy flat int arrays
const returnRequestSchema = z.object({
    localizacaoOrigemId: z.number().int().positive().optional(),
    // Legacy: flat array of IDs (backward compat)
    serviceOrderMaterialIds: z.array(z.number().int().positive()).optional(),
    // New: structured items with destination and refund info
    items: z.union([
        z.array(returnItemSchema).min(1),
        z.array(z.number().int().positive()).min(1),
    ]).optional(),
});

type StructuredItem = z.infer<typeof returnItemSchema>;

/**
 * POST /api/service-orders/[id]/materials/return
 *
 * Return materials from a service order.
 *
 * Supports two flows:
 * 1. Stock materials (materialId != null, RESERVED): cancels reservation, returns to stock
 * 2. Field-purchased materials (materialId === null, CONSUMED): marks as returned with refund tracking
 *
 * Destinations:
 * - COMPANY_STOCK: reserved materials released back to inventory
 * - STORE: materials returned to the store with optional refund amount
 */
export const POST = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string }> }) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'update')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const { id } = await params;
        const serviceOrderId = parseInt(id);

        if (isNaN(serviceOrderId)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'ID inválido', success: false },
                { status: 400 }
            );
        }

        // Parse request body
        const body = returnRequestSchema.safeParse(await request.json().catch(() => ({})));
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
        const { localizacaoOrigemId, serviceOrderMaterialIds, items } = body.data;
        const origemId = localizacaoOrigemId ?? DEFAULT_LOCATION_ID;

        // Normalize items into structured format
        const structuredItems = normalizeItems(serviceOrderMaterialIds, items);

        // Check order exists
        const order = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId }
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        // Execute return in transaction
        const result = await prisma.$transaction(async (tx) => {
            // If structured items provided, fetch only those specific materials
            // Otherwise, fetch ALL RESERVED stock materials (legacy bulk return)
            const isBulkReturn = structuredItems === null;
            const targetIds = structuredItems?.map(i => i.serviceOrderMaterialId);

            // Fetch materials — broader filter to support both stock and external
            const whereClause: any = { serviceOrderId };

            if (isBulkReturn) {
                // Legacy: return all reserved stock materials
                whereClause.status = 'RESERVED';
                whereClause.materialId = { not: null };
            } else {
                whereClause.id = { in: targetIds };
                // Allow both RESERVED (stock) and CONSUMED (field-purchased returns)
                whereClause.status = { in: ['RESERVED', 'CONSUMED'] };
            }

            const materials = await tx.serviceOrderMaterial.findMany({
                where: whereClause,
                include: {
                    Material: { select: { id: true, nome: true } },
                    fieldExpense: { select: { id: true, status: true, valor: true } },
                }
            });

            const returned: number[] = [];
            const errors: Array<{ id: number; reason: string }> = [];

            for (const mat of materials) {
                // Find the matching structured item (or build default for bulk)
                const itemConfig: StructuredItem = structuredItems?.find(
                    i => i.serviceOrderMaterialId === mat.id
                ) ?? {
                    serviceOrderMaterialId: mat.id,
                    quantityToReturn: Infinity, // will be clamped
                    destination: 'COMPANY_STOCK',
                };

                const quantityPlanned = Number(mat.quantityPlanned);
                const quantityUsed = Number(mat.quantityUsed || 0);
                const maxReturnable = quantityPlanned - quantityUsed;
                const quantityToReturn = Math.min(itemConfig.quantityToReturn, maxReturnable);

                if (quantityToReturn <= 0) {
                    errors.push({ id: mat.id, reason: 'Nada a devolver — todo material foi consumido' });
                    continue;
                }

                const isStockMaterial = mat.materialId !== null;
                const destination = itemConfig.destination;

                // ── STOCK RESERVATION RELEASE (COMPANY_STOCK or STORE for stock items) ──
                if (isStockMaterial && mat.status === 'RESERVED') {
                    // Create CANCELAMENTO_RESERVA movement
                    await tx.materialMovimentacao.create({
                        data: {
                            tipo: 'CANCELAMENTO_RESERVA',
                            materialId: mat.materialId!,
                            loteId: null,
                            quantidade: quantityToReturn,
                            localizacaoOrigemId: origemId,
                            localizacaoDestinoId: null,
                            projetoId: null,
                            motivo: `Devolução OS #${serviceOrderId} → ${destination === 'STORE' ? 'loja' : 'estoque'} - ${mat.name}`,
                            criadoPor: order.createdById || null
                        }
                    });

                    // Decrement materialSaldo.reservado
                    const saldo = await tx.materialSaldo.findFirst({
                        where: {
                            materialId: mat.materialId!,
                            loteId: null,
                            localizacaoId: origemId
                        }
                    });

                    if (saldo) {
                        await tx.materialSaldo.update({
                            where: { id: saldo.id },
                            data: { reservado: { decrement: quantityToReturn } }
                        });
                    }
                }

                // ── REFUND TRACKING (STORE destination) ──
                if (destination === 'STORE' && itemConfig.refundAmount != null && itemConfig.refundAmount > 0) {
                    // Update linked field expense with refund info
                    if (mat.fieldExpenseId && mat.fieldExpense) {
                        const existingRefund = Number((mat.fieldExpense as any).refundAmount || 0);
                        await tx.expense.update({
                            where: { id: mat.fieldExpenseId },
                            data: {
                                refundAmount: existingRefund + itemConfig.refundAmount,
                                refundDate: new Date(),
                                refundNotes: `Devolução de ${quantityToReturn} ${mat.unit || 'un'} de ${mat.name}`,
                            }
                        });
                    }
                }

                // ── UPDATE MATERIAL RECORD ──
                const newStatus = quantityUsed > 0 ? 'CONSUMED' as const : 'RETURNED' as const;
                await tx.serviceOrderMaterial.update({
                    where: { id: mat.id },
                    data: {
                        status: newStatus,
                        quantityReturned: quantityToReturn,
                        returnedAt: new Date(),
                        returnDestination: destination,
                        refundAmount: destination === 'STORE' ? (itemConfig.refundAmount ?? null) : null,
                    }
                });

                returned.push(mat.id);
            }

            return { returned, errors };
        }, {
            isolationLevel: 'ReadCommitted'
        });

        // Recalculate totals (labor + material)
        await recalculateTotals(serviceOrderId);

        if (result.returned.length > 0) {
            await prisma.serviceOrderHistory.create({
                data: {
                    serviceOrderId,
                    eventType: 'MATERIAL_RETURNED',
                    reason: `${result.returned.length} material(is) devolvido(s)`,
                    createdById: Number(user.id),
                },
            });
        }

        return NextResponse.json({
            data: {
                summary: {
                    returnedCount: result.returned.length,
                    errorCount: result.errors.length
                },
                details: result
            },
            success: true
        }, { status: 200 });
    });


/**
 * Normalize the various input formats into structured return items.
 * Returns null if no specific items were provided (→ bulk return all RESERVED).
 */
function normalizeItems(
    serviceOrderMaterialIds?: number[],
    items?: StructuredItem[] | number[],
): StructuredItem[] | null {
    // New structured format
    if (items && items.length > 0) {
        if (typeof items[0] === 'number') {
            // Legacy: flat array of IDs → default to COMPANY_STOCK
            return (items as number[]).map(id => ({
                serviceOrderMaterialId: id,
                quantityToReturn: Infinity,
                destination: 'COMPANY_STOCK' as const,
            }));
        }
        return items as StructuredItem[];
    }

    // Legacy: serviceOrderMaterialIds
    if (serviceOrderMaterialIds && serviceOrderMaterialIds.length > 0) {
        return serviceOrderMaterialIds.map(id => ({
            serviceOrderMaterialId: id,
            quantityToReturn: Infinity,
            destination: 'COMPANY_STOCK' as const,
        }));
    }

    // No specific items → bulk return
    return null;
}
