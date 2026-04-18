import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { z } from 'zod';

const createLoteSchema = z.object({
  materialId: z.number().int().positive(),
  codigoLote: z.string().min(1).max(80),
  dataFabricacao: z.string().datetime().optional(),
  dataValidade: z.string().datetime().optional(),
  observacoes: z.string().max(255).optional(),
});

// GET /api/estoque/lotes - List lots
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireUser(request);
  const { searchParams } = new URL(request.url);

  const materialId = searchParams.get('materialId');
  const search = searchParams.get('search');
  const vencido = searchParams.get('vencido');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (materialId) where.materialId = parseInt(materialId);
  if (search) {
    where.codigoLote = { contains: search };
  }
  if (vencido === 'true') {
    where.dataValidade = { lt: new Date() };
  } else if (vencido === 'false') {
    where.OR = [
      { dataValidade: null },
      { dataValidade: { gte: new Date() } }
    ];
  }

  const [lotes, total] = await Promise.all([
    prisma.materialLote.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { criadoEm: 'desc' },
      include: {
        material: { select: { id: true, nome: true, codigo: true, unidade: true } },
        _count: { select: { saldos: true, movimentacoes: true } }
      }
    }),
    prisma.materialLote.count({ where }),
  ]);

  return NextResponse.json({
    data: lotes,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

// POST /api/estoque/lotes - Create lot
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireUser(request);
  const body = await request.json();
  const validated = createLoteSchema.parse(body);

  // Verify material exists
  const material = await prisma.material.findUnique({ where: { id: validated.materialId } });
  if (!material) {
    return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 });
  }

  // Check uniqueness of codigoLote per material
  const existing = await prisma.materialLote.findUnique({
    where: {
      materialId_codigoLote: {
        materialId: validated.materialId,
        codigoLote: validated.codigoLote,
      }
    }
  });
  if (existing) {
    return NextResponse.json({ error: 'Código de lote já existe para este material' }, { status: 409 });
  }

  const lote = await prisma.materialLote.create({
    data: {
      materialId: validated.materialId,
      codigoLote: validated.codigoLote,
      dataFabricacao: validated.dataFabricacao ? new Date(validated.dataFabricacao) : null,
      dataValidade: validated.dataValidade ? new Date(validated.dataValidade) : null,
      observacoes: validated.observacoes || null,
    },
    include: {
      material: { select: { id: true, nome: true, codigo: true } },
    }
  });

  return NextResponse.json(lote, { status: 201 });
});
