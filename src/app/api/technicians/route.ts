import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser, can, type Role } from '@/shared/lib/rbac';

const CLASSIFICATION_LABELS: Record<string, string> = {
    W2_EMPLOYEE: 'Employee (W-2)',
    CONTRACTOR_1099: 'Contractor (1099)',
    SUBCONTRACTOR: 'Subcontractor',
    OWNER_OPERATOR: 'Owner/Operator',
};

// GET /api/technicians
// Returns Worker records (active workforce) with their linked Usuario info.
// The returned `id` is Worker.id — this is the correct value for ServiceOrder.assignedWorkerId.
export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'service-orders', 'read')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Sem permissão', success: false },
            { status: 403 }
        );
    }

    const workers = await prisma.worker.findMany({
        where: {
            status: 'ACTIVE',
        },
        select: {
            id: true,
            name: true,
            classification: true,
            defaultHourlyRate: true,
            usuario: {
                select: { avatarUrl: true }
            }
        },
        orderBy: { name: 'asc' }
    });

    const data = workers.map(w => ({
        id: w.id,
        name: w.name,
        initials: w.name.substring(0, 2).toUpperCase(),
        cargo: CLASSIFICATION_LABELS[w.classification] ?? w.classification,
        role: w.classification === 'W2_EMPLOYEE' ? 'Employee (W-2)' : 'Contractor (1099)',
        type: w.classification === 'W2_EMPLOYEE' ? 'W2' : '1099',
        avatar: w.usuario?.avatarUrl ?? null,
    }));

    return NextResponse.json({ data, success: true });
});
