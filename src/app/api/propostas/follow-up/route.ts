/**
 * /api/propostas/follow-up — Consulta e disparo manual de follow-ups
 *
 * GET  → lista propostas ENVIADA que precisam de follow-up (uso interno da dashboard)
 * POST → dispara notificações manualmente (ADMIN/GERENTE only)
 *
 * ⚠️ Cron job automático: /api/cron/propostas/follow-up (schedule: 0 9 * * *)
 *    O cron usa GET + CRON_SECRET e tem idempotência via cache (TTL 48h).
 *    Este endpoint POST é para acionamento manual via dashboard apenas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { NotificationService } from '@/shared/lib/notifications';

const FOLLOW_UP_DAYS = [3, 7, 14] as const;

function getDaysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function getFollowUpLabel(days: number): { title: string; message: string; type: 'warning' | 'error' } {
  if (days >= 14) {
    return {
      title: '🔴 Follow-up urgente de proposta',
      message: `Uma proposta enviada há ${days} dias ainda aguarda resposta do cliente. Ação imediata necessária.`,
      type: 'error',
    };
  }
  if (days >= 7) {
    return {
      title: '🟡 Follow-up de proposta (7 dias)',
      message: `Uma proposta enviada há ${days} dias ainda aguarda resposta do cliente.`,
      type: 'warning',
    };
  }
  return {
    title: '🔔 Proposta aguardando resposta (3 dias)',
    message: `Uma proposta enviada há ${days} dias ainda aguarda resposta do cliente.`,
    type: 'warning',
  };
}

// GET /api/propostas/follow-up — lista propostas que precisam de follow-up
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para visualizar propostas', success: false },
      { status: 403 },
    );
  }

  const now = new Date();
   
  const _cutoff14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const cutoff3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const propostas = await prisma.proposta.findMany({
    where: {
      status: 'ENVIADA',
      enviadaParaOCliente: {
        not: null,
        lte: cutoff3,
      },
      deletedAt: null,
    },
    select: {
      id: true,
      numeroProposta: true,
      titulo: true,
      enviadaParaOCliente: true,
      valorEstimado: true,
      Cliente: { select: { nomeCompleto: true, nomeFantasia: true, email: true } },
    },
    orderBy: { enviadaParaOCliente: 'asc' },
  });

  const result = propostas.map((p) => {
    const dias = getDaysBetween(p.enviadaParaOCliente!, now);
    const urgency = dias >= 14 ? 'urgent' : dias >= 7 ? 'warning' : 'reminder';
    return {
      id: p.id,
      numeroProposta: p.numeroProposta,
      titulo: p.titulo,
      enviadaHa: dias,
      urgency,
      valorEstimado: p.valorEstimado,
      cliente: p.Cliente,
    };
  });

  // Filter to only proposals at the milestone days (3, 7, 14+)
  const needsFollowUp = result.filter((p) => p.enviadaHa >= 3);
  const overdue = needsFollowUp.filter((p) => p.enviadaHa >= 14);
  const warning = needsFollowUp.filter((p) => p.enviadaHa >= 7 && p.enviadaHa < 14);
  const reminder = needsFollowUp.filter((p) => p.enviadaHa >= 3 && p.enviadaHa < 7);

  // Ignored: propostas enviadas há menos de 3 dias
  const ignored = result.filter((p) => p.enviadaHa < 3);

  return NextResponse.json({
    data: {
      propostas: needsFollowUp,
      summary: {
        total: needsFollowUp.length,
        urgent: overdue.length,
        warning: warning.length,
        reminder: reminder.length,
        ignored: ignored.length,
      },
    },
    success: true,
  });
});

// POST /api/propostas/follow-up — dispara notificações de follow-up para ADMIN/GERENTE
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 },
    );
  }
  if (!['ADMIN', 'GERENTE'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Apenas ADMIN e GERENTE podem disparar follow-ups', success: false },
      { status: 403 },
    );
  }

  const now = new Date();

  // Buscar propostas ENVIADA com enviadaParaOCliente definida
  const propostas = await prisma.proposta.findMany({
    where: {
      status: 'ENVIADA',
      enviadaParaOCliente: { not: null },
      deletedAt: null,
    },
    select: {
      id: true,
      numeroProposta: true,
      titulo: true,
      enviadaParaOCliente: true,
      clienteId: true,
      Cliente: { select: { nomeCompleto: true, nomeFantasia: true } },
    },
  });

  // Filtrar por marcos de dias (3, 7, 14)
  const toNotify = propostas.filter((p) => {
    const days = getDaysBetween(p.enviadaParaOCliente!, now);
    return FOLLOW_UP_DAYS.some((d) => days >= d);
  });

  if (toNotify.length === 0) {
    return NextResponse.json({
      data: { notificationsCreated: 0, propostasProcessed: 0 },
      success: true,
    });
  }

  // Buscar todos usuários ADMIN e GERENTE ativos
  const managers = await prisma.usuario.findMany({
    where: {
      nivel: { in: ['ADMIN', 'GERENTE'] },
      status: 'ATIVO',
      bloqueado: false,
    },
    select: { id: true },
  });

  if (managers.length === 0) {
    return NextResponse.json({
      data: { notificationsCreated: 0, propostasProcessed: toNotify.length, message: 'Nenhum ADMIN/GERENTE ativo encontrado' },
      success: true,
    });
  }

  let notificationsCreated = 0;

  for (const proposta of toNotify) {
    const days = getDaysBetween(proposta.enviadaParaOCliente!, now);
    const clienteName = proposta.Cliente.nomeFantasia ?? proposta.Cliente.nomeCompleto;
    const { title, message, type } = getFollowUpLabel(days);

    for (const manager of managers) {
      await NotificationService.create({
        userId: manager.id,
        type,
        title,
        message: `${message}\n\nProposta: ${proposta.numeroProposta} — ${proposta.titulo}\nCliente: ${clienteName}`,
        data: {
          type: 'follow_up_proposta',
          propostaId: proposta.id,
          numeroProposta: proposta.numeroProposta,
          diasSemResposta: days,
        },
      });
      notificationsCreated++;
    }
  }

  return NextResponse.json({
    data: {
      notificationsCreated,
      propostasProcessed: toNotify.length,
      managersNotified: managers.length,
    },
    success: true,
  });
});
