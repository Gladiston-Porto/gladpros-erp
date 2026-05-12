import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { recalculateTotals } from '@/server/services/serviceOrderTotals';
import { stock } from '@/config';

const DEFAULT_LOCATION_ID = stock.defaultLocationId;

// Request schema
const reserveRequestSchema = z.object({
    localizacaoOrigemId: z.number().int().positive().optional()
});

/**
 * POST /api/service-orders/[id]/materials/reserve
 * 
 * Reserve all PENDING materials from stock
 * 
 * Flow:
 * 1. Find all PENDING materials in the order
 * 2. For each material with stock:
 *    - Validate disponível = quantidade - reservado >= needed
 *    - Create materialMovimentacao tipo RESERVA
 *    - Increment materialSaldo.reservado
 *    - Update ServiceOrderMaterial status to RESERVED
 * 3. Materials without stock → NEEDS_PURCHASE
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
        const body = reserveRequestSchema.safeParse(await request.json().catch(() => ({})));
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
        const { localizacaoOrigemId } = body.data;
        const origemId = localizacaoOrigemId ?? DEFAULT_LOCATION_ID;

        // Check order exists
        const order = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            select: { id: true, ticketNumber: true, title: true, createdById: true }
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        // Validate location exists
        const localizacao = await prisma.localizacao.findUnique({
            where: { id: origemId }
        });

        if (!localizacao) {
            return NextResponse.json({
                error: 'Validation failed',
                message: 'Localização de estoque não encontrada',
                success: false,
                localizacaoId: origemId
            }, { status: 400 });
        }

        // Execute reservation in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Find all PENDING materials with materialId
            const materials = await tx.serviceOrderMaterial.findMany({
                where: {
                    serviceOrderId,
                    status: 'PENDING',
                    materialId: { not: null }
                },
                include: {
                    Material: {
                        select: {
                            id: true,
                            nome: true,
                            custoMedio: true
                        }
                    }
                }
            });

            const reserved: number[] = [];
            const needsPurchase: number[] = [];
            const needsPurchaseDetails: Array<{ id: number; materialId: number; name: string; qty: number; custoEstimado: number | null }> = [];
            const errors: Array<{ id: number; name: string; reason: string }> = [];

            for (const mat of materials) {
                const materialId = mat.materialId!;
                const needed = Number(mat.quantityPlanned);

                // Get stock balance for this material at the origin location
                const saldo = await tx.materialSaldo.findFirst({
                    where: {
                        materialId,
                        loteId: null,
                        localizacaoId: origemId
                    }
                });

                // Calculate available = quantidade - reservado
                const quantidade = saldo ? Number(saldo.quantidade) : 0;
                const reservadoAtual = saldo ? Number(saldo.reservado) : 0;
                const disponivel = quantidade - reservadoAtual;

                if (disponivel < needed) {
                    // Not enough stock - mark as NEEDS_PURCHASE
                    await tx.serviceOrderMaterial.update({
                        where: { id: mat.id },
                        data: { status: 'NEEDS_PURCHASE' }
                    });
                    needsPurchase.push(mat.id);
                    needsPurchaseDetails.push({
                        id: mat.id,
                        materialId: mat.materialId!,
                        name: mat.name,
                        qty: needed,
                        custoEstimado: mat.unitCostEstimated ? Number(mat.unitCostEstimated) : null,
                    });
                    errors.push({
                        id: mat.id,
                        name: mat.name,
                        reason: `Saldo insuficiente: disponível ${disponivel}, necessário ${needed}`
                    });
                    continue;
                }

                // Create materialMovimentacao tipo RESERVA
                await tx.materialMovimentacao.create({
                    data: {
                        tipo: 'RESERVA',
                        materialId,
                        loteId: null,
                        quantidade: needed,
                        localizacaoOrigemId: origemId,
                        localizacaoDestinoId: null,
                        projetoId: null, // Could link to project if OS has one
                        motivo: `Reserva OS #${serviceOrderId} - ${mat.name}`,
                        criadoPor: order.createdById || null
                    }
                });

                // Increment materialSaldo.reservado (NOT decrement quantidade!)
                if (saldo) {
                    await tx.materialSaldo.update({
                        where: {
                            id: saldo.id // Safe update by ID
                        },
                        data: {
                            reservado: { increment: needed }
                        }
                    });
                }

                // Update ServiceOrderMaterial status to RESERVED
                await tx.serviceOrderMaterial.update({
                    where: { id: mat.id },
                    data: {
                        status: 'RESERVED',
                        reservedAt: new Date(),
                        unitCostActual: mat.Material?.custoMedio || mat.unitCostEstimated
                    }
                });

                reserved.push(mat.id);
            }

            return { reserved, needsPurchase, needsPurchaseDetails, errors };
        }, {
            isolationLevel: 'ReadCommitted'
        });

        // Recalculate totals (C3: was using increment:0 on total, never updating it)
        await recalculateTotals(serviceOrderId);

        if (result.reserved.length > 0) {
            await prisma.serviceOrderHistory.create({
                data: {
                    serviceOrderId,
                    eventType: 'MATERIAL_RESERVED',
                    reason: `${result.reserved.length} material(is) reservado(s)${result.needsPurchase.length > 0 ? `, ${result.needsPurchase.length} para compra` : ''}`,
                    createdById: Number(user.id),
                },
            });
        }

        // Auto-generate SC for materials that could not be reserved (NEEDS_PURCHASE)
        let autoSCId: number | null = null;
        if (result.needsPurchaseDetails.length > 0) {
            const valorEstimado = result.needsPurchaseDetails.reduce(
                (acc, m) => acc + (m.custoEstimado ?? 0) * m.qty, 0
            );
            const osTitulo = order.title ?? `OS #${serviceOrderId}`;
            const sc = await prisma.solicitacaoCompra.create({
                data: {
                    empresaId: 1, // single-tenant
                    origemTipo: 'OS',
                    origemId: serviceOrderId,
                    status: 'RASCUNHO',
                    solicitanteId: Number(user.id),
                    valorEstimado,
                    observacoes: `SC automática — OS #${serviceOrderId}: ${osTitulo}.\n${result.needsPurchaseDetails.length} materiais sem saldo disponível no estoque.`,
                    itens: {
                        create: result.needsPurchaseDetails.map(m => ({
                            materialId: m.materialId,
                            descricao: m.name,
                            quantidadeSolicitada: m.qty,
                            custoEstimado: m.custoEstimado,
                            status: 'PENDENTE' as const,
                        }))
                    }
                }
            });
            autoSCId = sc.id;

            await prisma.serviceOrderHistory.create({
                data: {
                    serviceOrderId,
                    eventType: 'SC_CRIADA',
                    reason: `SC #${sc.id} criada automaticamente para ${result.needsPurchaseDetails.length} material(is) sem estoque.`,
                    createdById: Number(user.id),
                },
            });
        }

        return NextResponse.json({
            data: {
                summary: {
                    reservedCount: result.reserved.length,
                    needsPurchaseCount: result.needsPurchase.length,
                    errorCount: result.errors.length,
                    autoSCId,
                },
                details: result
            },
            success: true
        }, { status: 200 });
    });


