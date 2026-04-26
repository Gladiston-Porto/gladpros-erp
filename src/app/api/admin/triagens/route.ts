import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// GET /api/admin/triagens — List triagens (admin only)
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);

  if (!can(user.role as Role, 'configuracoes', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const tipo = searchParams.get('tipo') || undefined;
  const status = searchParams.get('status') || undefined;
  const projetoId = searchParams.get('projetoId') ? parseInt(searchParams.get('projetoId')!) : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (tipo) where.tipo = tipo;
  if (status) where.status = status;
  if (projetoId) where.projetoId = projetoId;

  const [triagens, total, stats] = await Promise.all([
    prisma.triagem.findMany({
      where,
      include: {
        projeto: { select: { numeroProjeto: true, titulo: true } },
        solicitante: { select: { nomeCompleto: true, email: true } },
        responsavel: { select: { nomeCompleto: true, email: true } },
      },
      orderBy: { aberturaEm: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.triagem.count({ where }),
    prisma.triagem.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  const statsMap: Record<string, number> = {};
  for (const s of stats) {
    statsMap[s.status] = s._count;
  }

  return NextResponse.json({
    data: triagens.map((t) => ({
      ...t,
      acoesCorretivas: t.acoesCorretivas ? JSON.parse(t.acoesCorretivas) : null,
    })),
    stats: {
      total: Object.values(statsMap).reduce((a, b) => a + b, 0),
      pendentes: statsMap['PENDENTE'] || 0,
      emAndamento: statsMap['EM_ANDAMENTO'] || 0,
      concluidas: statsMap['CONCLUIDA'] || 0,
      canceladas: statsMap['CANCELADA'] || 0,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
