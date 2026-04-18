import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { recalculateTotals } from '@/server/services/serviceOrderTotals';

// POST /api/service-orders/[id]/work-entries/recalculate
// Recalcula hourlyRate e totalCost de entradas criadas com taxa = 0
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

    const { id } = await params;
    const serviceOrderId = parseInt(id);

    if (isNaN(serviceOrderId)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'ID inválido', success: false },
            { status: 400 }
        );
    }

    const order = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        select: { id: true, hourlyRate: true }
    });

    if (!order) {
        return NextResponse.json(
            { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
            { status: 404 }
        );
    }

    // Busca entradas com taxa horária = 0 (foram criadas sem taxa definida)
    const entries = await prisma.workEntry.findMany({
        where: { serviceOrderId, hourlyRate: 0 },
        include: { Worker: { select: { defaultHourlyRate: true } } }
    });

    if (entries.length === 0) {
        // Nenhuma entrada para corrigir — apenas garante totais na OS
        await recalculateTotals(serviceOrderId);
        return NextResponse.json({ data: { updatedCount: 0 }, success: true });
    }

    // Monta operações de atualização sem await dentro do map (evitar N+1)
    const updates = entries.map(entry => {
        let hourlyRate = 0;
        if (entry.Worker && Number(entry.Worker.defaultHourlyRate) > 0) {
            hourlyRate = Number(entry.Worker.defaultHourlyRate);
        } else if (Number(order.hourlyRate) > 0) {
            hourlyRate = Number(order.hourlyRate);
        }
        const totalCost = hourlyRate > 0 ? (entry.totalMinutes / 60) * hourlyRate : 0;
        return prisma.workEntry.update({
            where: { id: entry.id },
            data: { hourlyRate, totalCost }
        });
    });

    await prisma.$transaction(updates);

    // Recalcula laborTotal, materialTotal e total da OS
    await recalculateTotals(serviceOrderId);

    return NextResponse.json({
        data: { updatedCount: entries.length },
        success: true
    });
});
