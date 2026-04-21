import { withErrorHandler } from '@/lib/api/error-handler';
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'create')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const propostaId = body?.id ? Number(body.id) : null;

  // Se há ID, atualizar rascunho existente
  if (propostaId && !isNaN(propostaId)) {
    const existing = await prisma.proposta.findFirst({
      where: { id: propostaId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (existing && existing.status === 'RASCUNHO') {
      await prisma.proposta.update({
        where: { id: propostaId },
        data: { atualizadoEm: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'Rascunho salvo',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Nova proposta em construção — sem ID ainda, confirmar recebimento sem persistir
  return NextResponse.json({
    success: true,
    message: 'Rascunho recebido',
    timestamp: new Date().toISOString(),
  });
});
