import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// Schema for receiving a purchase
const receivePurchaseSchema = z.object({
    groupKey: z.string(), // name_unit key from pending purchases
    materialIds: z.array(z.number()), // ServiceOrderMaterial IDs to allocate
    unitCostActual: z.number(), // Actual purchase price per unit
    totalQuantityReceived: z.number().positive(),
    supplier: z.string().optional(),
    notes: z.string().optional(),
});

// POST /api/inventory/receive-purchase - Receive purchased materials and allocate to service orders
export const POST = withErrorHandler(async (request: NextRequest) => {
        const authUser = await requireUser(request);
        if (!can(authUser.role as Role, 'estoque', 'create')) {
            return NextResponse.json({ error: 'Sem permissão', success: false }, { status: 403 });
        }

        const body = await request.json();
        const validated = receivePurchaseSchema.parse(body);

        // Get materials to allocate
        const materials = await prisma.serviceOrderMaterial.findMany({
            where: {
                id: { in: validated.materialIds },
                status: 'NEEDS_PURCHASE'
            },
            orderBy: [
                { ServiceOrder: { scheduledDate: 'asc' } },
                { createdAt: 'asc' }
            ],
            include: {
                ServiceOrder: {
                    select: { id: true, ticketNumber: true, scheduledDate: true }
                }
            }
        });

        if (materials.length === 0) {
            return NextResponse.json(
                { error: 'No pending materials found to allocate' },
                { status: 400 }
            );
        }

        // Calculate total needed
        const totalNeeded = materials.reduce((sum, m) => sum + Number(m.quantityPlanned), 0);

        if (validated.totalQuantityReceived < totalNeeded) {
            // Partial allocation - allocate to earliest scheduled first
            // For simplicity, we'll require full quantity for now
            return NextResponse.json({
                error: 'Insufficient quantity',
                message: `Received ${validated.totalQuantityReceived} but need ${totalNeeded}. Partial allocation not yet supported.`,
                details: {
                    received: validated.totalQuantityReceived,
                    needed: totalNeeded,
                    materialCount: materials.length
                }
            }, { status: 400 });
        }

        // Allocate all materials
        const allocatedIds: number[] = [];
        let remainingQty = validated.totalQuantityReceived;

        await prisma.$transaction(async (tx) => {
            for (const mat of materials) {
                const needed = Number(mat.quantityPlanned);

                if (remainingQty >= needed) {
                    // Mark as RESERVED with actual cost
                    await tx.serviceOrderMaterial.update({
                        where: { id: mat.id },
                        data: {
                            status: 'RESERVED',
                            unitCostActual: validated.unitCostActual,
                            reservedAt: new Date()
                        }
                    });

                    allocatedIds.push(mat.id);
                    remainingQty -= needed;

                    // Recalculate service order material total
                    await recalculateMaterialTotal(tx, mat.ServiceOrder.id);
                }
            }
        });

        return NextResponse.json({
            success: true,
            summary: {
                totalReceived: validated.totalQuantityReceived,
                allocatedCount: allocatedIds.length,
                remainingQty,
                affectedServiceOrders: new Set(materials.filter(m => allocatedIds.includes(m.id))
                    .map(m => m.ServiceOrder.ticketNumber)).size
            },
            allocatedMaterialIds: allocatedIds
        });
    });

// Helper to recalculate material total
async function recalculateMaterialTotal(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    serviceOrderId: number
): Promise<void> {
    const materials = await tx.serviceOrderMaterial.findMany({
        where: { serviceOrderId, status: { in: ['RESERVED', 'CONSUMED'] } }
    });

    let materialTotal = 0;
    for (const mat of materials) {
        const cost = mat.unitCostActual || mat.unitCostEstimated;
        if (cost) {
            const qty = mat.status === 'CONSUMED' ? mat.quantityUsed : mat.quantityPlanned;
            materialTotal += Number(cost) * Number(qty);
        }
    }

    // Get labor total to recalculate grand total
    const order = await tx.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        select: { laborTotal: true }
    });

    const total = materialTotal + Number(order?.laborTotal || 0);

    await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { materialTotal, total }
    });
}
