import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { recalculateTotals } from '@/server/services/serviceOrderTotals';
import { stock } from '@/config';

const DEFAULT_LOCATION_ID = stock.defaultLocationId;

// Request schema
const consumeRequestSchema = z.object({
    localizacaoOrigemId: z.coerce.number().int().positive().optional(),
    items: z.array(z.object({
        serviceOrderMaterialId: z.coerce.number().int().positive(),
        quantityUsed: z.coerce.number().positive()
    })).min(1, 'At least one item is required')
});

/**
 * POST /api/service-orders/[id]/materials/consume
 * 
 * Consume reserved materials (mark as used)
 * 
 * Flow:
 * 1. For each item in the request:
 *    - Validate item is RESERVED
 *    - Validate quantityUsed <= quantityPlanned
 *    - Create materialMovimentacao tipo SAIDA
 *    - Decrement materialSaldo.quantidade
 *    - Decrement materialSaldo.reservado
 *    - Update ServiceOrderMaterial.quantityUsed and status
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
        const body = consumeRequestSchema.safeParse(await request.json());
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
        const { localizacaoOrigemId, items } = body.data;
        const origemId = localizacaoOrigemId ?? DEFAULT_LOCATION_ID;

        // Check order exists and is in progress
        const order = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId }
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        if (!['IN_PROGRESS', 'SCHEDULED'].includes(order.status)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Só é possível consumir materiais quando a OS está SCHEDULED ou IN_PROGRESS', success: false },
                { status: 400 }
            );
        }

        // Execute consumption in transaction
        const result = await prisma.$transaction(async (tx) => {
            const consumed: number[] = [];
            const errors: Array<{ id: number; reason: string }> = [];

            for (const item of items) {
                // Get the ServiceOrderMaterial
                const mat = await tx.serviceOrderMaterial.findUnique({
                    where: { id: item.serviceOrderMaterialId },
                    include: {
                        Material: { select: { id: true, nome: true } }
                    }
                });

                if (!mat) {
                    errors.push({ id: item.serviceOrderMaterialId, reason: 'Material não encontrado' });
                    continue;
                }

                if (mat.serviceOrderId !== serviceOrderId) {
                    errors.push({ id: item.serviceOrderMaterialId, reason: 'Material não pertence a esta OS' });
                    continue;
                }

                if (mat.status !== 'RESERVED') {
                    errors.push({
                        id: item.serviceOrderMaterialId,
                        reason: `Status inválido: ${mat.status}. Deve ser RESERVED`
                    });
                    continue;
                }

                const materialId = mat.materialId;
                if (!materialId) {
                    errors.push({ id: item.serviceOrderMaterialId, reason: 'Material externo, não gerenciado pelo estoque' });
                    continue;
                }

                const quantityUsed = item.quantityUsed;
                const quantityPlanned = Number(mat.quantityPlanned);

                // Validate quantityUsed doesn't exceed planned
                if (quantityUsed > quantityPlanned) {
                    errors.push({
                        id: item.serviceOrderMaterialId,
                        reason: `Quantidade usada (${quantityUsed}) maior que planejada (${quantityPlanned})`
                    });
                    continue;
                }

                // Get current stock balance
                const saldo = await tx.materialSaldo.findFirst({
                    where: {
                        materialId,
                        loteId: null,
                        localizacaoId: origemId
                    }
                });

                if (!saldo) {
                    errors.push({ id: item.serviceOrderMaterialId, reason: 'Saldo não encontrado na localização' });
                    continue;
                }

                // Create materialMovimentacao tipo SAIDA
                await tx.materialMovimentacao.create({
                    data: {
                        tipo: 'SAIDA',
                        materialId,
                        loteId: null,
                        quantidade: quantityUsed,
                        localizacaoOrigemId: origemId,
                        localizacaoDestinoId: null,
                        projetoId: null,
                        motivo: `Consumo OS #${serviceOrderId} - ${mat.name}`,
                        criadoPor: order.createdById || null
                    }
                });

                // Decrement both quantidade and reservado
                await tx.materialSaldo.update({
                    where: {
                        id: saldo.id // Safe update
                    },
                    data: {
                        quantidade: { decrement: quantityUsed },
                        reservado: { decrement: quantityUsed }
                    }
                });

                // Calculate remaining reservation if partial consumption
                const remainingReserved = quantityPlanned - quantityUsed;

                // Update ServiceOrderMaterial
                await tx.serviceOrderMaterial.update({
                    where: { id: mat.id },
                    data: {
                        quantityUsed: quantityUsed,
                        status: remainingReserved > 0 ? 'RESERVED' : 'CONSUMED',
                        consumedAt: new Date()
                    }
                });

                // If partial consumption, we need to release the remaining reservation
                if (remainingReserved > 0) {
                    // Create CANCELAMENTO_RESERVA for the unused portion
                    await tx.materialMovimentacao.create({
                        data: {
                            tipo: 'CANCELAMENTO_RESERVA',
                            materialId,
                            loteId: null,
                            quantidade: remainingReserved,
                            localizacaoOrigemId: origemId,
                            localizacaoDestinoId: null,
                            projetoId: null,
                            motivo: `Cancelamento reserva parcial OS #${serviceOrderId} - ${mat.name} (sobra: ${remainingReserved})`,
                            criadoPor: order.createdById || null
                        }
                    });

                    // Release the remaining reserved quantity
                    if (saldo) {
                        await tx.materialSaldo.update({
                            where: {
                                id: saldo.id // Safe update
                            },
                            data: {
                                reservado: { decrement: remainingReserved }
                            }
                        });
                    }

                    // Mark as CONSUMED since we handled the remainder
                    await tx.serviceOrderMaterial.update({
                        where: { id: mat.id },
                        data: { status: 'CONSUMED' }
                    });
                }

                consumed.push(mat.id);
            }

            return { consumed, errors };
        }, {
            isolationLevel: 'ReadCommitted'
        });

        // Recalculate totals (labor + material)
        await recalculateTotals(serviceOrderId);

        if (result.consumed.length > 0) {
            await prisma.serviceOrderHistory.create({
                data: {
                    serviceOrderId,
                    eventType: 'MATERIAL_CONSUMED',
                    reason: `${result.consumed.length} material(is) consumido(s)`,
                    createdById: Number(user.id),
                },
            });
        }

        return NextResponse.json({
            data: {
                summary: {
                    consumedCount: result.consumed.length,
                    errorCount: result.errors.length
                },
                details: result
            },
            success: true
        }, { status: 200 });
    });


