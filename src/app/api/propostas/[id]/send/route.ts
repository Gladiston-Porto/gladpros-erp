import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { sendProposal } from '@/domains/proposals/services';
import { prisma } from '@/lib/prisma';
import { computeEstimatedMargin } from '@/shared/services/marginService';

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/propostas/[id]/send - Send proposta
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'propostas', 'update')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const { id } = await params
    const propostaId = parseInt(id)

    // Margin warning: if precoPropostaCliente and valorEstimado are set, check projected margin
    let marginWarning: string | null = null;
    const propostaCheck = await prisma.proposta.findUnique({
      where: { id: propostaId },
      select: { precoPropostaCliente: true, valorEstimado: true },
    });
    if (propostaCheck?.precoPropostaCliente && propostaCheck?.valorEstimado) {
      const margin = computeEstimatedMargin(
        Number(propostaCheck.precoPropostaCliente),
        Number(propostaCheck.valorEstimado),
        0 // valorEstimado covers total estimated cost
      );
      if (margin && margin.marginPct < 10) {
        marginWarning = `Atenção: margem projetada é apenas ${margin.marginPct.toFixed(1)}% — abaixo de 10%. Considere revisar o preço antes de enviar.`;
      }
    }

    const result = await sendProposal(propostaId, {
      actorId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Proposta enviada com sucesso',
      proposta: result.data,
      ...(marginWarning ? { marginWarning } : {}),
    })
  });
