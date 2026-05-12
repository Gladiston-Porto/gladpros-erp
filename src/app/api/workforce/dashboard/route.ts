/**
 * API: /api/workforce/dashboard
 * 
 * GET - Dashboard KPIs for workforce module
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

async function getHandler(request: NextRequest) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'read')) {
        return errorResponse('Sem permissão', undefined, 403);
    }

    // Get counts
    const [
        totalWorkers,
        activeWorkers,
        totalAssignments,
        activeAssignments,
        pendingTimesheets,
        submittedTimesheets,
        pendingPayables,
        approvedPayables,
        paidPayablesThisMonth
    ] = await Promise.all([
        prisma.worker.count(),
        prisma.worker.count({ where: { status: 'ACTIVE' } }),
        prisma.assignment.count(),
        prisma.assignment.count({ where: { status: 'ACTIVE' } }),
        prisma.timesheet.count({ where: { status: 'DRAFT' } }),
        prisma.timesheet.count({ where: { status: 'SUBMITTED' } }),
        prisma.payable.count({ where: { status: 'PENDING' } }),
        prisma.payable.count({ where: { status: 'APPROVED' } }),
        prisma.payable.count({
            where: {
                status: 'PAID',
                paidAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        })
    ]);

    // Get total amounts
    const payableAggregates = await prisma.payable.groupBy({
        by: ['status'],
        _sum: { totalAmount: true },
        _count: true
    });

    const totals = {
        pendingAmount: 0,
        approvedAmount: 0,
        paidAmount: 0
    };

    for (const agg of payableAggregates) {
        const amount = Number(agg._sum.totalAmount) || 0;
        if (agg.status === 'PENDING') totals.pendingAmount = amount;
        if (agg.status === 'APPROVED') totals.approvedAmount = amount;
        if (agg.status === 'PAID') totals.paidAmount = amount;
    }

    // Get recent activity
    const recentPayables = await prisma.payable.findMany({
        where: { status: 'PAID' },
        orderBy: { paidAt: 'desc' },
        take: 5,
        include: {
            worker: {
                select: { name: true }
            }
        }
    });

    return successResponse({
        kpis: {
            workers: {
                total: totalWorkers,
                active: activeWorkers
            },
            assignments: {
                total: totalAssignments,
                active: activeAssignments
            },
            timesheets: {
                pending: pendingTimesheets,
                submitted: submittedTimesheets,
                needsAction: pendingTimesheets + submittedTimesheets
            },
            payables: {
                pending: pendingPayables,
                approved: approvedPayables,
                paidThisMonth: paidPayablesThisMonth
            },
            amounts: totals
        },
        recentPayments: recentPayables.map(p => ({
            id: p.id,
             
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            worker: (p as any).worker?.name,
            amount: p.totalAmount,
            paidAt: p.paidAt,
            method: p.paymentMethod
        }))
    });
}

export const GET = withErrorHandler(getHandler);
