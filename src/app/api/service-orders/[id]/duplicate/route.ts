import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

/**
 * POST /api/service-orders/[id]/duplicate
 *
 * Creates a new DRAFT service order copying core fields from the original.
 * Also duplicates scope items. Uses a serializable transaction for safe ticketNumber generation.
 */
export const POST = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'service-orders', 'create')) {
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

    const original = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        select: {
            clienteId: true,
            title: true,
            description: true,
            sameClientAddress: true,
            serviceAddressLine1: true,
            serviceAddressLine2: true,
            serviceCity: true,
            serviceState: true,
            serviceZip: true,
            servicePhone: true,
            serviceContactName: true,
            endClientName: true,
            endClientPhone: true,
            endClientEmail: true,
            endClientNotes: true,
            scheduleType: true,
            materialSupply: true,
            hourlyRate: true,
            estimatedHours: true,
            agreedClientPrice: true,
            materialEstimate: true,
            laborEstimate: true,
            propertyType: true,
            serviceCategory: true,
            contractType: true,
            priority: true,
            projetoId: true,
            assignedWorkerId: true,
        },
    });

    if (!original) {
        return NextResponse.json(
            { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
            { status: 404 }
        );
    }

    const scopeItems = await prisma.serviceOrderScopeItem.findMany({
        where: { serviceOrderId },
        select: {
            description: true,
            status: true,
            sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
    });

    const newServiceOrder = await prisma.$transaction(async (tx) => {
        const year = new Date().getFullYear();
        const lastOrder = await tx.serviceOrder.findFirst({
            where: { ticketNumber: { startsWith: `OS-${year}-` } },
            orderBy: { id: 'desc' },
            select: { ticketNumber: true },
        });
        let nextNumber = 1;
        if (lastOrder) {
            const parts = lastOrder.ticketNumber.split('-');
            nextNumber = parseInt(parts[2]) + 1;
        }
        const ticketNumber = `OS-${year}-${String(nextNumber).padStart(4, '0')}`;

        const created = await tx.serviceOrder.create({
            data: {
                ticketNumber,
                status: 'DRAFT',
                createdById: Number(user.id),
                total: 0,
                laborTotal: 0,
                materialTotal: 0,
                clienteId: original.clienteId,
                title: original.title,
                description: original.description,
                sameClientAddress: original.sameClientAddress,
                serviceAddressLine1: original.serviceAddressLine1,
                serviceAddressLine2: original.serviceAddressLine2,
                serviceCity: original.serviceCity,
                serviceState: original.serviceState,
                serviceZip: original.serviceZip,
                servicePhone: original.servicePhone,
                serviceContactName: original.serviceContactName,
                endClientName: original.endClientName,
                endClientPhone: original.endClientPhone,
                endClientEmail: original.endClientEmail,
                endClientNotes: original.endClientNotes,
                scheduleType: original.scheduleType,
                materialSupply: original.materialSupply,
                hourlyRate: original.hourlyRate,
                estimatedHours: original.estimatedHours,
                agreedClientPrice: original.agreedClientPrice,
                materialEstimate: original.materialEstimate,
                laborEstimate: original.laborEstimate,
                propertyType: original.propertyType,
                serviceCategory: original.serviceCategory,
                contractType: original.contractType,
                priority: original.priority,
                projetoId: original.projetoId,
                assignedWorkerId: original.assignedWorkerId,
            },
            select: { id: true, ticketNumber: true },
        });

        if (scopeItems.length > 0) {
            await tx.serviceOrderScopeItem.createMany({
                data: scopeItems.map((item, index) => ({
                    serviceOrderId: created.id,
                    description: item.description,
                    status: item.status,
                    sortOrder: item.sortOrder ?? index,
                })),
            });
        }

        return created;
    }, { isolationLevel: 'Serializable' });

    return NextResponse.json(
        { data: { newServiceOrder: { id: newServiceOrder.id, ticketNumber: newServiceOrder.ticketNumber } }, success: true },
        { status: 201 }
    );
});
