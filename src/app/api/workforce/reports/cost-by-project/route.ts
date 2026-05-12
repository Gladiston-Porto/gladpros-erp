/**
 * API: /api/workforce/reports/cost-by-project
 * 
 * GET - Report of labor costs by project
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

async function getHandler(request: NextRequest) {
    // Only ADMIN, GERENTE, FINANCEIRO can view reports
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'read')) {
        return errorResponse('Sem permissão', undefined, 403);
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
        status: 'PAID'
    };

    if (projectId) {
        where.lineItems = {
            some: { projectId: parseInt(projectId) }
        };
    }

    if (startDate || endDate) {
        where.paidAt = {};
        if (startDate) where.paidAt.gte = new Date(startDate);
        if (endDate) where.paidAt.lte = new Date(endDate);
    }

    // Get all paid payables with line items
    const payables = await prisma.payable.findMany({
        where,
        include: {
            worker: {
                select: { id: true, name: true }
            },
            lineItems: {
                include: {
                    // We'll need to get project info separately
                }
            }
        }
    });

    // Group by project
    const costByProject: Record<number, {
        projectId: number;
        projectName: string;
        totalCost: number;
        totalHours: number;
        workers: Set<number>;
        payableCount: number;
    }> = {};

    for (const payable of payables) {
        for (const item of payable.lineItems) {
            if (!item.projectId) continue;

            if (!costByProject[item.projectId]) {
                costByProject[item.projectId] = {
                    projectId: item.projectId,
                    projectName: '', // Will fill below
                    totalCost: 0,
                    totalHours: 0,
                    workers: new Set(),
                    payableCount: 0
                };
            }

            costByProject[item.projectId].totalCost += Number(item.lineTotal);
            if (item.sourceType === 'TIMESHEET_ENTRY') {
                costByProject[item.projectId].totalHours += Number(item.quantity);
            }
            costByProject[item.projectId].workers.add(payable.workerId);
        }

         
        // Count unique payables per project
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projectIds = [...new Set(payable.lineItems.map((i: any) => i.projectId).filter(Boolean))];
        for (const pid of projectIds) {
            if (pid && costByProject[pid]) {
                costByProject[pid].payableCount++;
            }
        }
    }

    // Get project names
    const projectIds = Object.keys(costByProject).map(Number);
    if (projectIds.length > 0) {
        const projects = await prisma.projeto.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, titulo: true, numeroProjeto: true }
        });

        for (const p of projects) {
            if (costByProject[p.id]) {
                costByProject[p.id].projectName = `${p.numeroProjeto} - ${p.titulo}`;
            }
        }
    }

    // Convert to array and format
    const report = Object.values(costByProject).map(p => ({
        projectId: p.projectId,
        projectName: p.projectName,
        totalCost: p.totalCost,
        totalHours: p.totalHours,
        workerCount: p.workers.size,
        payableCount: p.payableCount,
        avgCostPerHour: p.totalHours > 0 ? p.totalCost / p.totalHours : 0
    }));

    // Sort by total cost descending
    report.sort((a, b) => b.totalCost - a.totalCost);

    // Summary
    const summary = {
        totalProjects: report.length,
        grandTotalCost: report.reduce((sum, r) => sum + r.totalCost, 0),
        grandTotalHours: report.reduce((sum, r) => sum + r.totalHours, 0),
        totalPayables: payables.length
    };

    return successResponse({
        report,
        summary
    });
}

export const GET = withErrorHandler(getHandler);
