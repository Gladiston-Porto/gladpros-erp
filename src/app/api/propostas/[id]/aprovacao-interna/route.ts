import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

const schema = z.object({
  tipo: z.enum(['financeira', 'tecnica']),
  aprovado: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para aprovar propostas', success: false },
      { status: 403 }
    );
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 }
    );
  }

  const { id } = await params;
  const propostaId = parseInt(id);
  if (isNaN(propostaId)) {
    return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 });
  }

  const { tipo, aprovado } = body.data;

  // Role-based permission: only FINANCEIRO/ADMIN for financial, GERENTE/ADMIN for technical
  const canApproveFinancial = ['ADMIN', 'FINANCEIRO'].includes(user.role);
  const canApproveTechnical = ['ADMIN', 'GERENTE'].includes(user.role);

  if (tipo === 'financeira' && !canApproveFinancial) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Apenas FINANCEIRO ou ADMIN podem aprovar internamente (financeiro)', success: false },
      { status: 403 }
    );
  }
  if (tipo === 'tecnica' && !canApproveTechnical) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Apenas GERENTE ou ADMIN podem aprovar tecnicamente', success: false },
      { status: 403 }
    );
  }

  const proposta = await prisma.proposta.findFirst({
    where: { id: propostaId, deletedAt: null },
  });

  if (!proposta) {
    return NextResponse.json({ error: 'Proposta não encontrada', success: false }, { status: 404 });
  }

  const updateData =
    tipo === 'financeira'
      ? { aprovacaoInternaFinanceira: aprovado }
      : { aprovacaoInternaTecnica: aprovado };

  await prisma.$transaction([
    prisma.proposta.update({ where: { id: propostaId }, data: updateData }),
    prisma.propostaLog.create({
      data: {
        id: randomUUID(),
        propostaId,
        actorId: user.id,
        action: 'APPROVAL_INTERNA',
        newJson: JSON.stringify({ tipo, aprovado, aprovadoPor: user.email }),
        ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    }),
  ]);

  return NextResponse.json({ data: { tipo, aprovado }, success: true });
}
