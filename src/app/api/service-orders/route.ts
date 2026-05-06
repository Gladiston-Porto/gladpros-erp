import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

// SLA hours by priority (business rule: sets deadline from creation time)
const SLA_HOURS: Record<string, number> = {
  EMERGENCY: 4,
  HIGH: 24,
  MEDIUM: 72,
  LOW: 120,
}

function computeSlaDeadline(priority?: string | null): Date | null {
  if (!priority) return null
  const hours = SLA_HOURS[priority]
  if (!hours) return null
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

// Validation schemas
const createServiceOrderSchema = z.object({
    clienteId: z.number(),
    title: z.string().min(1),
    description: z.string().optional(),

    // Schedule
    scheduleType: z.enum(['FIXED', 'FLEXIBLE']).default('FIXED'),
    scheduledDate: z.string().optional(),
    scheduleDateStart: z.string().optional(),
    scheduleDateEnd: z.string().optional(),

    // Estimate
    estimatedHours: z.number().optional(),
    hourlyRate: z.number().optional(),
    materialSupply: z.enum(['CLIENT_PROVIDES', 'COMPANY_PROVIDES']).default('COMPANY_PROVIDES'),

    // Service Address
    sameClientAddress: z.boolean().default(true),
    serviceAddressLine1: z.string().optional(),
    serviceAddressLine2: z.string().optional(),
    serviceCity: z.string().optional(),
    serviceState: z.string().optional(),
    serviceZip: z.string().optional(),
    servicePhone: z.string().optional(),
    serviceContactName: z.string().optional(),

    // End Client / On-site Contact
    endClientName: z.string().optional(),
    endClientPhone: z.string().optional(),
    endClientEmail: z.string().optional(),
    endClientNotes: z.string().optional(),

    // Assignment
    assignedWorkerId: z.number().optional(),
    projetoId: z.number().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']).optional(),

    // Financial estimates (Fase 1)
    agreedClientPrice: z.number().positive().optional(),
    materialEstimate: z.number().positive().optional(),
    laborEstimate: z.number().positive().optional(),
    // Tax Classification (Fase 2)
    propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'EXEMPT_ORGANIZATION', 'GOVERNMENT']).optional(),
    serviceCategory: z.enum(['REPAIR', 'REMODEL', 'RESTORATION', 'NEW_CONSTRUCTION', 'MAINTENANCE', 'INSPECTION', 'CONSULTATION', 'OTHER']).optional(),
    contractType: z.enum(['LUMP_SUM', 'SEPARATED']).optional(),
});

// Generate ticket number
// NOTE: moved inside transaction below (C1: was outside → race condition)
// GET /api/service-orders - List with server-side pagination
export const GET = withErrorHandler(async (request: Request) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'read')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);

        // Pagination
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const skip = (page - 1) * limit;

        // Filters
        const status = searchParams.get('status');
        const clienteId = searchParams.get('clienteId');
        const assignedWorkerId = searchParams.get('assignedWorkerId');
        const createdById = searchParams.get('createdById');
        const search = searchParams.get('search');

        // Sort — whitelist to prevent Prisma injection
        const SORT_WHITELIST: Record<string, Prisma.ServiceOrderOrderByWithRelationInput> = {
            createdAt:    { createdAt: 'desc' },
            ticketNumber: { ticketNumber: 'asc' },
            title:        { title: 'asc' },
            status:       { status: 'asc' },
            scheduledDate: { scheduledDate: { sort: 'asc', nulls: 'last' } },
            total:        { total: 'desc' },
            // cliente sort uses nomeCompleto (never null); nomeFantasia is nullable
            cliente:      { Cliente: { nomeCompleto: 'asc' } },
        };
        const sortKey = searchParams.get('sortKey') ?? 'createdAt';
        const sortDirParam = searchParams.get('sortDir');
        const orderBy = (() => {
            const base = SORT_WHITELIST[sortKey] ?? SORT_WHITELIST['createdAt'];
            // Allow overriding direction for simple top-level fields
            if (sortDirParam === 'asc' || sortDirParam === 'desc') {
                const topField = ['createdAt', 'ticketNumber', 'title', 'status', 'total'].find(f => f === sortKey);
                if (topField) return { [topField]: sortDirParam };
            }
            return base;
        })();

        // Build where clause
        const where: Record<string, unknown> = {};

        if (status) {
            if (status === 'OPEN') {
                where.status = { in: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'] };
            } else if (status === 'OVERDUE') {
                where.status = { in: ['SCHEDULED', 'IN_PROGRESS'] };
                where.scheduledDate = { lt: new Date() };
            } else {
                where.status = status;
            }
        }

        if (clienteId) where.clienteId = parseInt(clienteId);
        if (assignedWorkerId) where.assignedWorkerId = parseInt(assignedWorkerId);
        if (createdById) where.createdById = parseInt(createdById);

        if (search) {
            where.OR = [
                { ticketNumber: { contains: search } },
                { title: { contains: search } },
                { Cliente: { nomeFantasia: { contains: search } } },
                { Cliente: { nomeCompleto: { contains: search } } }
            ];
        }

        // Fetch data with count
        const [data, total] = await Promise.all([
            prisma.serviceOrder.findMany({
                where: where as Prisma.ServiceOrderWhereInput,
                skip,
                take: limit,
                orderBy: orderBy as Prisma.ServiceOrderOrderByWithRelationInput,
                include: {
                    Cliente: {
                        select: { id: true, nomeFantasia: true, nomeCompleto: true }
                    },
                    AssignedWorker: {
                        select: { id: true, name: true }
                    },
                    materials: {
                        where: { status: 'NEEDS_PURCHASE' },
                        select: { id: true }
                    }
                }
            }),
            prisma.serviceOrder.count({ where })
        ]);

        // Transform response
        const orders = data.map(order => ({
            id: order.id,
            ticketNumber: order.ticketNumber,
            title: order.title,
            status: order.status,
            priority: order.priority,
            scheduledDate: order.scheduledDate,
            scheduleType: order.scheduleType,
            scheduleDateStart: order.scheduleDateStart,
            scheduleDateEnd: order.scheduleDateEnd,
            total: order.total,
            cliente: {
                id: order.Cliente.id,
                name: order.Cliente.nomeFantasia || order.Cliente.nomeCompleto
            },
            assignedTech: order.AssignedWorker ? {
                id: order.AssignedWorker.id,
                name: order.AssignedWorker.name
            } : null,
            hasPendingMaterials: order.materials.length > 0,
            createdAt: order.createdAt
        }));

        return NextResponse.json({
            data: orders,
            pagination: {
                page,
                pageSize: limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            },
            success: true
        }, { status: 200 });
    });

// POST /api/service-orders - Create new service order
export const POST = withErrorHandler(async (request: Request) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'create')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const body = createServiceOrderSchema.safeParse(await request.json());
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

        // Get client address before the transaction (read-only, no need for serializable lock)
        let addressData: Record<string, unknown> = {};
        if (validated.sameClientAddress) {
            const client = await prisma.cliente.findUnique({
                where: { id: validated.clienteId },
                select: {
                    addressStreet: true,
                    addressUnit: true,
                    addressCity: true,
                    addressState: true,
                    addressZip: true,
                    telefone: true,
                    nomeCompleto: true,
                    nomeFantasia: true
                }
            });
            if (client) {
                addressData = {
                    serviceAddressLine1: client.addressStreet,
                    serviceAddressLine2: client.addressUnit,
                    serviceCity: client.addressCity,
                    serviceState: client.addressState,
                    serviceZip: client.addressZip,
                    servicePhone: client.telefone,
                    serviceContactName: client.nomeFantasia || client.nomeCompleto
                };
            }
        } else {
            addressData = {
                serviceAddressLine1: validated.serviceAddressLine1,
                serviceAddressLine2: validated.serviceAddressLine2,
                serviceCity: validated.serviceCity,
                serviceState: validated.serviceState,
                serviceZip: validated.serviceZip,
                servicePhone: validated.servicePhone,
                serviceContactName: validated.serviceContactName
            };
        }

        // C1: Generate ticketNumber + create inside a Serializable transaction to prevent
        // two concurrent POSTs from generating the same OS number.
        const serviceOrder = await prisma.$transaction(async (tx) => {
            const year = new Date().getFullYear();
            const lastOrder = await tx.serviceOrder.findFirst({
                where: { ticketNumber: { startsWith: `OS-${year}-` } },
                orderBy: { id: 'desc' },
                select: { ticketNumber: true }
            });
            let nextNumber = 1;
            if (lastOrder) {
                const parts = lastOrder.ticketNumber.split('-');
                nextNumber = parseInt(parts[2]) + 1;
            }
            const ticketNumber = `OS-${year}-${String(nextNumber).padStart(4, '0')}`;

            return tx.serviceOrder.create({
                data: {
                    ticketNumber,
                    clienteId: validated.clienteId,
                    title: validated.title,
                    description: validated.description,

                    scheduleType: validated.scheduleType,
                    scheduledDate: validated.scheduledDate ? new Date(validated.scheduledDate) : null,
                    scheduleDateStart: validated.scheduleDateStart ? new Date(validated.scheduleDateStart) : null,
                    scheduleDateEnd: validated.scheduleDateEnd ? new Date(validated.scheduleDateEnd) : null,

                    estimatedHours: validated.estimatedHours,
                    hourlyRate: validated.hourlyRate,
                    materialSupply: validated.materialSupply,

                    sameClientAddress: validated.sameClientAddress,
                    ...addressData,

                    assignedWorkerId: validated.assignedWorkerId,
                    projetoId: validated.projetoId,
                    priority: validated.priority,

                    endClientName: validated.endClientName || null,
                    endClientPhone: validated.endClientPhone || null,
                    endClientEmail: validated.endClientEmail || null,
                    endClientNotes: validated.endClientNotes || null,

                    ...(validated.agreedClientPrice !== undefined && { agreedClientPrice: validated.agreedClientPrice }),
                    ...(validated.materialEstimate !== undefined && { materialEstimate: validated.materialEstimate }),
                    ...(validated.laborEstimate !== undefined && { laborEstimate: validated.laborEstimate }),
                    ...(validated.propertyType !== undefined && { propertyType: validated.propertyType }),
                    ...(validated.serviceCategory !== undefined && { serviceCategory: validated.serviceCategory }),
                    ...(validated.contractType !== undefined && { contractType: validated.contractType }),

                    status: 'DRAFT',
                    createdById: Number(user.id),
                    slaDeadline: computeSlaDeadline(validated.priority),
                },
                include: {
                    Cliente: { select: { id: true, nomeFantasia: true, nomeCompleto: true } },
                    AssignedWorker: { select: { id: true, name: true } }
                }
            });
        }, { isolationLevel: 'Serializable' });

        return NextResponse.json({ data: serviceOrder, success: true }, { status: 201 });
    });
