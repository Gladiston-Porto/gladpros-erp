/**
 * GET  /api/projetos/[id]/change-orders  — List change orders for a project
 * POST /api/projetos/[id]/change-orders  — Create a new change order
 *
 * Access: ADMIN, GERENTE (full); USUARIO, ESTOQUE, FINANCEIRO (read only via canViewProject).
 * RBAC: create/update requires canManageProject.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects';
import { withErrorHandler } from '@/lib/api/error-handler';
import { prisma } from '@/lib/prisma';

// ── Validation schemas ─────────────────────────────────────────────────────────

const CreateChangeOrderSchema = z.object({
  type: z.enum(['CLIENT_REQUEST', 'UNFORESEEN', 'COMPANY_ERROR', 'CODE_REQUIREMENT']),
  description: z.string().min(10, 'Descreva a mudança em pelo menos 10 caracteres').max(2000),
  rootCause: z.string().max(500).optional(),
  priceDelta: z.number().default(0),
  costDelta: z.number().default(0),
  taxDelta: z.number().default(0),
  items: z
    .array(
      z.object({
        type: z.enum(['LABOR', 'MATERIAL', 'FEE', 'DISCOUNT']),
        description: z.string().min(1).max(500),
        qty: z.number().positive(),
        unitPrice: z.number().min(0),
        unitCost: z.number().min(0),
        lineTotal: z.number(),
      }),
    )
    .optional(),
});

// ── GET — list change orders ───────────────────────────────────────────────────

export const GET = withErrorHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const user = await requireProjectPermission(req, 'canRead');

  const { id } = await context.params;
  const projetoId = Number.parseInt(id, 10);
  if (Number.isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID do projeto inválido', success: false },
      { status: 400 },
    );
  }

  await requireProjectAccess(user, projetoId, 'canRead');

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));
  const status = searchParams.get('status') ?? undefined;

  const where = {
    projectId: projetoId,
    jobType: 'PROJECT' as const,
    ...(status ? { status: status as never } : {}),
  };

  const [total, changeOrders] = await Promise.all([
    prisma.changeOrder.count({ where }),
    prisma.changeOrder.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        description: true,
        priceDelta: true,
        costDelta: true,
        rootCause: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        approvedByName: true,
        rejectedAt: true,
        rejectedByName: true,
        rejectedReason: true,
        createdByUser: { select: { id: true, nomeCompleto: true } },
        items: {
          select: { id: true, type: true, description: true, qty: true, unitPrice: true, lineTotal: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ]);

  return NextResponse.json({
    data: changeOrders,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    success: true,
  });
});

// ── POST — create change order ─────────────────────────────────────────────────

export const POST = withErrorHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const user = await requireProjectPermission(req, 'canCreate');

  const { id } = await context.params;
  const projetoId = Number.parseInt(id, 10);
  if (Number.isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID do projeto inválido', success: false },
      { status: 400 },
    );
  }

  await requireProjectAccess(user, projetoId, 'canCreate');

  const body = CreateChangeOrderSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: body.error.issues[0]?.message ?? 'Dados inválidos',
        success: false,
      },
      { status: 400 },
    );
  }

  // Verify the project exists
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true, status: true },
  });
  if (!projeto) {
    return NextResponse.json(
      { error: 'Not found', message: 'Projeto não encontrado', success: false },
      { status: 404 },
    );
  }
  if (projeto.status === 'concluido' || projeto.status === 'arquivado') {
    return NextResponse.json(
      {
        error: 'Business rule violation',
        message: 'Não é possível criar Change Orders em projetos concluídos ou arquivados',
        success: false,
      },
      { status: 422 },
    );
  }

  const { items, ...coData } = body.data;

  const changeOrder = await prisma.changeOrder.create({
    data: {
      jobType: 'PROJECT',
      projectId: projetoId,
      type: coData.type,
      status: 'DRAFT',
      description: coData.description,
      rootCause: coData.rootCause ?? null,
      priceDelta: coData.priceDelta,
      costDelta: coData.costDelta,
      taxDelta: coData.taxDelta,
      createdById: user.id,
      items: items?.length
        ? {
            create: items.map((item) => ({
              type: item.type,
              description: item.description,
              qty: item.qty,
              unitPrice: item.unitPrice,
              unitCost: item.unitCost,
              lineTotal: item.lineTotal,
            })),
          }
        : undefined,
    },
    include: {
      items: true,
      createdByUser: { select: { id: true, nomeCompleto: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      entidade: 'ChangeOrder',
      entidadeId: String(changeOrder.id),
      acao: 'CREATE',
      diff: JSON.stringify({ projetoId, type: coData.type }),
    },
  });

  return NextResponse.json({ data: changeOrder, success: true }, { status: 201 });
});
