import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

// Add material schema
const addMaterialSchema = z.object({
    materialId: z.coerce.number().optional(), // Optional for external/custom items
    name: z.string().min(1),
    unit: z.string().optional(),
    externalSku: z.string().optional(),
    quantityPlanned: z.coerce.number().positive(),
    unitCostEstimated: z.coerce.number().optional(),
    unitPrice: z.coerce.number().optional(),
    hasTax: z.boolean().optional().nullable(),
    taxRate: z.coerce.number().min(0).max(100).optional().nullable(), // percentage, e.g. 8.25
    // Embalagem snapshot fields
    embalagemId: z.coerce.number().int().positive().optional(),
    qtdEmbalagens: z.coerce.number().int().positive().optional(),
    embalagemBaseQtyAtTime: z.coerce.number().positive().optional(),
    embalagemPrecoAtTime: z.coerce.number().positive().optional(),
    embalagemUnitAtTime: z.string().optional(),
});

// GET /api/service-orders/[id]/materials - List materials
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

        const materials = await prisma.serviceOrderMaterial.findMany({
            where: { serviceOrderId },
            include: {
                Material: {
                    select: {
                        id: true,
                        nome: true,
                        estoqueMinimo: true,
                        custoMedio: true,
                        ultimoCusto: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json({ data: materials, success: true }, { status: 200 });
    });

// POST /api/service-orders/[id]/materials - Add material
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

        if (!['DRAFT', 'SCHEDULED'].includes(order.status)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Não é possível adicionar materiais neste status', success: false },
                { status: 400 }
            );
        }

        const body = addMaterialSchema.safeParse(await request.json());
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

        // Determine initial status based on stock
        let initialStatus: 'PENDING' | 'NEEDS_PURCHASE' = 'PENDING';
        let estimatedCost = validated.unitCostEstimated;

        if (validated.materialId) {
            // Check for duplicate — same stock material already on this OS
            const duplicate = await prisma.serviceOrderMaterial.findFirst({
                where: { serviceOrderId, materialId: validated.materialId },
                select: { id: true },
            });
            if (duplicate) {
                return NextResponse.json(
                    { error: 'Duplicate', message: 'Este material já está adicionado nesta OS', success: false },
                    { status: 409 }
                );
            }

            const material = await prisma.material.findUnique({
                where: { id: validated.materialId },
                select: { custoMedio: true, ultimoCusto: true }
            });

            if (material) {
                // Use material cost if not provided
                if (!estimatedCost) {
                    estimatedCost = material.custoMedio
                        ? Number(material.custoMedio)
                        : material.ultimoCusto
                            ? Number(material.ultimoCusto)
                            : undefined;
                }

                // Check real stock balance from MaterialSaldo
                const saldos = await prisma.materialSaldo.aggregate({
                    where: { materialId: validated.materialId },
                    _sum: { disponivel: true }
                });
                const totalDisponivel = Number(saldos._sum.disponivel ?? 0);
                if (totalDisponivel < validated.quantityPlanned) {
                    initialStatus = 'NEEDS_PURCHASE';
                }
            }
        } else {
            // External item always needs purchase
            initialStatus = 'NEEDS_PURCHASE';
        }

        const newMaterial = await prisma.serviceOrderMaterial.create({
            data: {
                serviceOrderId,
                materialId: validated.materialId,
                name: validated.name,
                unit: validated.unit,
                externalSku: validated.externalSku,
                quantityPlanned: validated.quantityPlanned,
                unitCostEstimated: estimatedCost,
                unitPrice: validated.unitPrice,
                status: initialStatus,
                hasTax: validated.hasTax ?? null,
                taxRate: validated.taxRate ?? null,
                ...(validated.embalagemBaseQtyAtTime && {
                    embalagemId: validated.embalagemId ?? null,
                    qtdEmbalagens: validated.qtdEmbalagens,
                    embalagemBaseQtyAtTime: validated.embalagemBaseQtyAtTime,
                    embalagemPrecoAtTime: validated.embalagemPrecoAtTime,
                    embalagemUnitAtTime: validated.embalagemUnitAtTime,
                }),
            },
            include: {
                Material: {
                    select: { id: true, nome: true, estoqueMinimo: true }
                }
            }
        });

        return NextResponse.json({ data: newMaterial, success: true }, { status: 201 });
    });
