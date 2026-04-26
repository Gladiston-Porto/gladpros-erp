import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { canSeeFieldGroup } from '@/shared/lib/rbac-core';
import { recalculateOSMargin } from '@/shared/services/marginService';

// GET /api/service-orders/[id] - Get single service order with full details
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

        const serviceOrder = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            include: {
                Cliente: {
                    select: {
                        id: true,
                        nomeFantasia: true,
                        nomeCompleto: true,
                        email: true,
                        telefone: true,
                        addressStreet: true,
                        addressCity: true,
                        addressState: true,
                        addressZip: true
                    }
                },
                AssignedWorker: {
                    select: { id: true, name: true, classification: true }
                },
                Projeto: {
                    select: { id: true }
                },
                Invoice: {
                    select: { id: true, numeroInvoice: true, status: true, valorTotal: true }
                },
                CreatedBy: {
                    select: { id: true, nomeCompleto: true }
                },
                materials: {
                    include: {
                        Material: {
                            select: { id: true, nome: true }
                        },
                        fieldExpense: {
                            select: { id: true, status: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                workEntries: {
                    include: {
                        Worker: {
                            select: { id: true, name: true }
                        }
                    },
                    orderBy: { startedAt: 'asc' }
                },
                attachments: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true,
                        type: true,
                        filename: true,
                        filepath: true,
                        mime: true,
                        sizeBytes: true,
                        caption: true,
                        vendorName: true,
                        receiptTotal: true,
                        taxAmount: true,
                        materialItemId: true,
                        createdAt: true,
                        UploadedBy: { select: { id: true, nomeCompleto: true } },
                        materialItems: {
                            select: {
                                materialItemId: true,
                                quantityOnReceipt: true,
                                unitCostOnReceipt: true,
                                hasTax: true,
                                taxRate: true,
                                materialItem: {
                                    select: { id: true, name: true, unit: true },
                                },
                            },
                        },
                    }
                },
                technicians: {
                    include: {
                        worker: {
                            select: {
                                id: true,
                                name: true,
                                classification: true,
                                usuario: { select: { avatarUrl: true } }
                            }
                        }
                    },
                    orderBy: { addedAt: 'asc' }
                }
            }
        });

        if (!serviceOrder) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        const [scopeItems, history] = await Promise.all([
            prisma.serviceOrderScopeItem.findMany({
                where: { serviceOrderId },
                orderBy: { sortOrder: 'asc' },
            }),
            prisma.serviceOrderHistory.findMany({
                where: { serviceOrderId },
                include: {
                    CreatedBy: {
                        select: { id: true, nomeCompleto: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const responseData = {
            ...serviceOrder,
            scopeItems,
            history,
            attachments: serviceOrder.attachments.map((attachment) => ({
                ...attachment,
                approvalStatus: 'NA',
                approvedAt: null,
                approvalNote: null,
                ApprovedBy: null,
            })),
        };

        // Apply field-level RBAC filtering
        const canSeeFinancials = canSeeFieldGroup(user.role as Role, 'financials');
        if (!canSeeFinancials) {
            delete (responseData as any).materialTotal;
            delete (responseData as any).laborTotal;
            delete (responseData as any).total;
            delete (responseData as any).hourlyRate;
            delete (responseData as any).agreedClientPrice;
            delete (responseData as any).materialEstimate;
            delete (responseData as any).laborEstimate;
            (responseData as any).materials = (responseData as any).materials?.map((m: any) => {
                const { unitCostEstimated, unitCostActual, unitPrice, ...rest } = m;
                return rest;
            });
            (responseData as any).workEntries = (responseData as any).workEntries?.map((e: any) => {
                const { hourlyRate, totalCost, ...rest } = e;
                return rest;
            });
            if ((responseData as any).Invoice) {
                delete (responseData as any).Invoice.valorTotal;
                delete (responseData as any).Invoice.subtotal;
                delete (responseData as any).Invoice.taxAmount;
                delete (responseData as any).Invoice.saldo;
                delete (responseData as any).Invoice.valorPago;
            }
        }

        return NextResponse.json({ data: responseData, success: true }, { status: 200 });
    });

// Update schema
const updateServiceOrderSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    scheduleType: z.enum(['FIXED', 'FLEXIBLE']).optional(),
    scheduledDate: z.string().nullable().optional(),
    scheduleDateStart: z.string().nullable().optional(),
    scheduleDateEnd: z.string().nullable().optional(),
    estimatedHours: z.number().optional(),
    hourlyRate: z.number().optional(),
    materialSupply: z.enum(['CLIENT_PROVIDES', 'COMPANY_PROVIDES']).optional(),
    sameClientAddress: z.boolean().optional(),
    serviceAddressLine1: z.string().optional(),
    serviceAddressLine2: z.string().optional(),
    serviceCity: z.string().optional(),
    serviceState: z.string().optional(),
    serviceZip: z.string().optional(),
    servicePhone: z.string().optional(),
    serviceContactName: z.string().optional(),
    endClientName: z.string().nullable().optional(),
    endClientPhone: z.string().nullable().optional(),
    endClientEmail: z.string().nullable().optional(),
    endClientNotes: z.string().nullable().optional(),
    assignedWorkerId: z.number().nullable().optional(),
    projetoId: z.number().nullable().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']).optional(),
    techNotes: z.string().optional(),
    clientNotes: z.string().optional(),

    // Financial estimates (Fase 1)
    agreedClientPrice: z.number().positive().optional(),
    materialEstimate: z.number().positive().optional(),
    laborEstimate: z.number().positive().optional(),
});

// PATCH /api/service-orders/[id] - Update service order
export const PATCH = withErrorHandler(async (request: Request,
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

        const body = updateServiceOrderSchema.safeParse(await request.json());
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

        // Write-side RBAC: only financial roles can set financial estimate fields
        const financialFields = ['agreedClientPrice', 'materialEstimate', 'laborEstimate'] as const;
        const tryingToWriteFinancial = financialFields.some(f => body.data[f] !== undefined);
        if (tryingToWriteFinancial && !canSeeFieldGroup(user.role as Role, 'financials')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão para alterar campos financeiros', success: false },
                { status: 403 }
            );
        }

        // Check if exists
        const existing = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId }
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        // Only allow editing if in DRAFT status (or specific fields in other statuses)
        if (existing.status !== 'DRAFT' && existing.status !== 'SCHEDULED') {
            // Allow only notes to be edited after scheduling
            const allowedFields = ['techNotes', 'clientNotes'];
            const providedFields = Object.keys(validated);
            const disallowedFields = providedFields.filter(f => !allowedFields.includes(f));

            if (disallowedFields.length > 0) {
                return NextResponse.json(
                    {
                        error: 'Validation failed',
                        message: `Não é possível editar ${disallowedFields.join(', ')} no status ${existing.status}`,
                        success: false,
                    },
                    { status: 400 }
                );
            }
        }

        // Build update data
        const updateData: Record<string, unknown> = {};

        if (validated.title !== undefined) updateData.title = validated.title;
        if (validated.description !== undefined) updateData.description = validated.description;
        if (validated.scheduleType !== undefined) updateData.scheduleType = validated.scheduleType;
        if (validated.estimatedHours !== undefined) updateData.estimatedHours = validated.estimatedHours;
        if (validated.hourlyRate !== undefined) updateData.hourlyRate = validated.hourlyRate;
        if (validated.materialSupply !== undefined) updateData.materialSupply = validated.materialSupply;
        if (validated.assignedWorkerId !== undefined) updateData.assignedWorkerId = validated.assignedWorkerId;
        if (validated.projetoId !== undefined) updateData.projetoId = validated.projetoId;
        if (validated.priority !== undefined) updateData.priority = validated.priority;
        if (validated.techNotes !== undefined) updateData.techNotes = validated.techNotes;
        if (validated.clientNotes !== undefined) updateData.clientNotes = validated.clientNotes;

        // Handle dates
        if (validated.scheduledDate !== undefined) {
            updateData.scheduledDate = validated.scheduledDate ? new Date(validated.scheduledDate) : null;
        }
        if (validated.scheduleDateStart !== undefined) {
            updateData.scheduleDateStart = validated.scheduleDateStart ? new Date(validated.scheduleDateStart) : null;
        }
        if (validated.scheduleDateEnd !== undefined) {
            updateData.scheduleDateEnd = validated.scheduleDateEnd ? new Date(validated.scheduleDateEnd) : null;
        }

        // Cross-field validation: scheduleDateEnd must be >= scheduleDateStart
        const effectiveStart = (updateData.scheduleDateStart ?? existing.scheduleDateStart) as Date | null;
        const effectiveEnd = (updateData.scheduleDateEnd ?? existing.scheduleDateEnd) as Date | null;
        if (effectiveStart && effectiveEnd && new Date(effectiveEnd) < new Date(effectiveStart)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'A data final deve ser igual ou posterior à data inicial', success: false },
                { status: 400 }
            );
        }

        // Handle address
        if (validated.sameClientAddress !== undefined) {
            updateData.sameClientAddress = validated.sameClientAddress;
        }
        if (!validated.sameClientAddress) {
            if (validated.serviceAddressLine1 !== undefined) updateData.serviceAddressLine1 = validated.serviceAddressLine1;
            if (validated.serviceAddressLine2 !== undefined) updateData.serviceAddressLine2 = validated.serviceAddressLine2;
            if (validated.serviceCity !== undefined) updateData.serviceCity = validated.serviceCity;
            if (validated.serviceState !== undefined) updateData.serviceState = validated.serviceState;
            if (validated.serviceZip !== undefined) updateData.serviceZip = validated.serviceZip;
            if (validated.servicePhone !== undefined) updateData.servicePhone = validated.servicePhone;
            if (validated.serviceContactName !== undefined) updateData.serviceContactName = validated.serviceContactName;
        }

        if (validated.endClientName !== undefined) updateData.endClientName = validated.endClientName;
        if (validated.endClientPhone !== undefined) updateData.endClientPhone = validated.endClientPhone;
        if (validated.endClientEmail !== undefined) updateData.endClientEmail = validated.endClientEmail;
        if (validated.endClientNotes !== undefined) updateData.endClientNotes = validated.endClientNotes;

        if (validated.agreedClientPrice !== undefined) updateData.agreedClientPrice = validated.agreedClientPrice;
        if (validated.materialEstimate !== undefined) updateData.materialEstimate = validated.materialEstimate;
        if (validated.laborEstimate !== undefined) updateData.laborEstimate = validated.laborEstimate;

        const updated = await prisma.serviceOrder.update({
            where: { id: serviceOrderId },
            data: updateData,
            include: {
                Cliente: { select: { id: true, nomeFantasia: true, nomeCompleto: true } },
                AssignedWorker: { select: { id: true, name: true } }
            }
        });

        // If agreedClientPrice changed, recompute marginStatus against actual costs
        if (validated.agreedClientPrice !== undefined) {
            recalculateOSMargin(
                serviceOrderId,
                Number(updated.agreedClientPrice),
                Number(updated.materialTotal),
                Number(updated.laborTotal),
                updated.orderNumber ?? undefined
            ).catch(() => {/* non-blocking */});
        }

        return NextResponse.json({ data: updated, success: true }, { status: 200 });
    });

// DELETE /api/service-orders/[id] - Delete (only DRAFT)
export const DELETE = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string }> }) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'delete')) {
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

        const existing = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId }
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        if (existing.status !== 'DRAFT') {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    message: 'Apenas ordens em DRAFT podem ser excluídas',
                    success: false,
                },
                { status: 400 }
            );
        }

        await prisma.serviceOrder.delete({
            where: { id: serviceOrderId }
        });

        return NextResponse.json({ data: { id: serviceOrderId }, success: true }, { status: 200 });
    });
