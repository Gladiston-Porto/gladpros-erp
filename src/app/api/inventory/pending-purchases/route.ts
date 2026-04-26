import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// Types for aggregated pending purchases
type PendingPurchaseItem = {
    groupKey: string; // name + unit
    name: string;
    unit: string | null;
    totalQuantity: number;
    estimatedCost: number | null;
    serviceOrderCount: number;
    serviceOrders: Array<{
        id: number;
        ticketNumber: string;
        clientName: string;
        materialId: number;
        quantity: number;
        scheduledDate: string | null;
    }>;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
};

// GET /api/inventory/pending-purchases - Aggregated list of materials needing purchase [V3.1 #3]
export const GET = withErrorHandler(async (request: NextRequest) => {
        const authUser = await requireUser(request);
        if (!can(authUser.role as Role, 'estoque', 'read')) {
            return NextResponse.json({ error: 'Sem permissão', success: false }, { status: 403 });
        }
        // Find all materials with NEEDS_PURCHASE status
        const pendingMaterials = await prisma.serviceOrderMaterial.findMany({
            where: { status: 'NEEDS_PURCHASE' },
            include: {
                ServiceOrder: {
                    select: {
                        id: true,
                        ticketNumber: true,
                        scheduledDate: true,
                        status: true,
                        Cliente: {
                            select: { nomeFantasia: true, nomeCompleto: true }
                        }
                    }
                }
            }
        });

        // Group by name + unit (not materialId, since some may be null for external items) [V3.1 #3]
        const groupedMap = new Map<string, PendingPurchaseItem>();

        for (const mat of pendingMaterials) {
            // Skip if service order is canceled
            if (mat.ServiceOrder.status === 'CANCELED') continue;

            const groupKey = `${mat.name.toLowerCase()}_${(mat.unit || 'un').toLowerCase()}`;

            const existing = groupedMap.get(groupKey);
            const clientName = mat.ServiceOrder.Cliente.nomeFantasia || mat.ServiceOrder.Cliente.nomeCompleto || 'Unknown';

            if (existing) {
                existing.totalQuantity += Number(mat.quantityPlanned);
                existing.serviceOrderCount += 1;
                existing.serviceOrders.push({
                    id: mat.ServiceOrder.id,
                    ticketNumber: mat.ServiceOrder.ticketNumber,
                    clientName,
                    materialId: mat.id,
                    quantity: Number(mat.quantityPlanned),
                    scheduledDate: mat.ServiceOrder.scheduledDate?.toISOString() || null
                });

                // Sum estimated costs
                if (mat.unitCostEstimated) {
                    existing.estimatedCost = (existing.estimatedCost || 0) +
                        (Number(mat.unitCostEstimated) * Number(mat.quantityPlanned));
                }
            } else {
                groupedMap.set(groupKey, {
                    groupKey,
                    name: mat.name,
                    unit: mat.unit,
                    totalQuantity: Number(mat.quantityPlanned),
                    estimatedCost: mat.unitCostEstimated
                        ? Number(mat.unitCostEstimated) * Number(mat.quantityPlanned)
                        : null,
                    serviceOrderCount: 1,
                    serviceOrders: [{
                        id: mat.ServiceOrder.id,
                        ticketNumber: mat.ServiceOrder.ticketNumber,
                        clientName,
                        materialId: mat.id,
                        quantity: Number(mat.quantityPlanned),
                        scheduledDate: mat.ServiceOrder.scheduledDate?.toISOString() || null
                    }],
                    urgency: 'MEDIUM' // Will be calculated below
                });
            }
        }

        // Calculate urgency based on scheduled dates
        const today = new Date();
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const oneWeekFromNow = new Date(today);
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

        for (const item of groupedMap.values()) {
            const earliestDate = item.serviceOrders
                .filter(so => so.scheduledDate)
                .map(so => new Date(so.scheduledDate!))
                .sort((a, b) => a.getTime() - b.getTime())[0];

            if (earliestDate) {
                if (earliestDate <= threeDaysFromNow) {
                    item.urgency = 'HIGH';
                } else if (earliestDate <= oneWeekFromNow) {
                    item.urgency = 'MEDIUM';
                } else {
                    item.urgency = 'LOW';
                }
            }
        }

        // Convert to array and sort by urgency, then by quantity
        const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        const items = Array.from(groupedMap.values()).sort((a, b) => {
            const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            if (urgencyDiff !== 0) return urgencyDiff;
            return b.totalQuantity - a.totalQuantity;
        });

        // Summary
        const summary = {
            totalItems: items.length,
            totalQuantity: items.reduce((sum, i) => sum + i.totalQuantity, 0),
            totalEstimatedCost: items.reduce((sum, i) => sum + (i.estimatedCost || 0), 0),
            highUrgencyCount: items.filter(i => i.urgency === 'HIGH').length,
            affectedServiceOrders: new Set(items.flatMap(i => i.serviceOrders.map(so => so.id))).size
        };

        return NextResponse.json({ items, summary });
    });
