import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { recalculateTotals } from '@/server/services/serviceOrderTotals';

// Add work entry schema
const addWorkEntrySchema = z.object({
    workerId: z.number(),
    startedAt: z.string(), // ISO datetime
    endedAt: z.string(),   // ISO datetime
    hourlyRate: z.number().optional(), // Uses worker rate if not provided
    notes: z.string().optional(),
});

// GET /api/service-orders/[id]/work-entries - List work entries
export const GET = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string }> }) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'read')) {
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

        const entries = await prisma.workEntry.findMany({
            where: { serviceOrderId },
            include: {
                Worker: {
                    select: { id: true, name: true, classification: true }
                }
            },
            orderBy: { startedAt: 'asc' }
        });

        // Calculate summary
        const totalMinutes = entries.reduce((sum, e) => sum + e.totalMinutes, 0);
        const totalCost = entries.reduce((sum, e) => sum + Number(e.totalCost), 0);

        return NextResponse.json({
            data: {
                entries,
                summary: {
                    totalEntries: entries.length,
                    totalMinutes,
                    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
                    totalCost
                }
            },
            success: true
        }, { status: 200 });
    });

// POST /api/service-orders/[id]/work-entries - Add work entry
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

        const order = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId }
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        if (!['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(order.status)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Não é possível adicionar apontamentos neste status', success: false },
                { status: 400 }
            );
        }

        const body = addWorkEntrySchema.safeParse(await request.json());
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
        const validated = body.data;

        // Parse dates
        const startedAt = new Date(validated.startedAt);
        const endedAt = new Date(validated.endedAt);

        // Validate dates
        if (endedAt <= startedAt) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'O horário final deve ser maior que o inicial', success: false },
                { status: 400 }
            );
        }

        // Get worker's hourly rate if not provided
        let hourlyRate = validated.hourlyRate;
        if (!hourlyRate) {
            const worker = await prisma.worker.findUnique({
                where: { id: validated.workerId },
                select: { defaultHourlyRate: true }
            });

            if (worker && Number(worker.defaultHourlyRate) > 0) {
                hourlyRate = Number(worker.defaultHourlyRate);
            } else if (Number(order.hourlyRate) > 0) {
                // Fallback to OS hourly rate
                hourlyRate = Number(order.hourlyRate);
            } else {
                hourlyRate = 0;
            }
        }

        // Calculate duration and cost
        const totalMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / (1000 * 60));
        const totalCost = (totalMinutes / 60) * hourlyRate;

        // Create entry
        const entry = await prisma.workEntry.create({
            data: {
                serviceOrderId,
                workerId: validated.workerId,
                startedAt,
                endedAt,
                hourlyRate,
                totalMinutes,
                totalCost,
                notes: validated.notes
            },
            include: {
                Worker: {
                    select: { id: true, name: true }
                }
            }
        });

        // Recalcula laborTotal, materialTotal e total da OS
        await recalculateTotals(serviceOrderId);

        return NextResponse.json({ data: entry, success: true }, { status: 201 });
    });
