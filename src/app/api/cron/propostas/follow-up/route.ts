import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/shared/lib/notifications';
import { cacheService } from '@/shared/lib/cache';

/**
 * GET /api/cron/propostas/follow-up
 *
 * Vercel Cron Job: dispara notificações de follow-up para propostas ENVIADA
 * nos marcos de 3, 7 e 14 dias sem resposta.
 *
 * Schedule: "0 9 * * *" (09:00 America/Chicago)
 * Auth: Authorization: Bearer <CRON_SECRET>
 * Idempotência: chave de cache por proposta+marco com TTL 48h
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Janela de execução: propostas enviadas entre 3 e 15 dias atrás
  const cutoffMin = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const cutoffMax = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const propostas = await prisma.proposta.findMany({
    where: {
      status: 'ENVIADA',
      enviadaParaOCliente: { gte: cutoffMin, lte: cutoffMax },
      deletedAt: null,
    },
    select: {
      id: true,
      numeroProposta: true,
      titulo: true,
      enviadaParaOCliente: true,
      Cliente: { select: { nomeCompleto: true, nomeFantasia: true } },
    },
  });

  // Buscar managers ativos para notificar
  const managers = await prisma.usuario.findMany({
    where: { nivel: { in: ['ADMIN', 'GERENTE'] }, status: 'ATIVO', bloqueado: false },
    select: { id: true },
  });

  if (managers.length === 0) {
    return NextResponse.json({
      data: { notificationsCreated: 0, propostasProcessed: 0, message: 'Nenhum ADMIN/GERENTE ativo' },
      success: true,
    });
  }

  const MILESTONES = [3, 7, 14] as const;
  let notificationsCreated = 0;
  let propostasProcessed = 0;

  for (const proposta of propostas) {
    const days = Math.floor(
      (now.getTime() - proposta.enviadaParaOCliente!.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Encontrar qual marco bater hoje (janela de 1 dia)
    const milestone = MILESTONES.find((d) => days >= d && days < d + 1);
    if (!milestone) continue;

    // Idempotência: evitar envio duplicado se o cron disparar mais de uma vez no dia
    const idempotencyKey = `cron:followup:${proposta.id}:day${milestone}`;
    const alreadySent = await cacheService.get(idempotencyKey);
    if (alreadySent) continue;

    const clienteName =
      proposta.Cliente?.nomeFantasia ?? proposta.Cliente?.nomeCompleto ?? 'Cliente';

    let title: string;
    let message: string;
    let type: 'warning' | 'error';

    if (milestone === 14) {
      title = '🔴 Follow-up urgente de proposta';
      message = `Proposta enviada há ${days} dias sem resposta do cliente. Ação imediata necessária.\n\nProposta: ${proposta.numeroProposta} — ${proposta.titulo}\nCliente: ${clienteName}`;
      type = 'error';
    } else if (milestone === 7) {
      title = '🟡 Follow-up de proposta (7 dias)';
      message = `Proposta enviada há ${days} dias ainda aguarda resposta do cliente.\n\nProposta: ${proposta.numeroProposta} — ${proposta.titulo}\nCliente: ${clienteName}`;
      type = 'warning';
    } else {
      title = '🔔 Proposta aguardando resposta (3 dias)';
      message = `Proposta enviada há ${days} dias ainda aguarda resposta do cliente.\n\nProposta: ${proposta.numeroProposta} — ${proposta.titulo}\nCliente: ${clienteName}`;
      type = 'warning';
    }

    for (const manager of managers) {
      await NotificationService.create({
        userId: manager.id,
        type,
        title,
        message,
        data: {
          type: 'follow_up_proposta',
          propostaId: proposta.id,
          numeroProposta: proposta.numeroProposta,
          diasSemResposta: days,
          milestone,
        },
      });
      notificationsCreated++;
    }

    // Marcar como enviado (TTL 48h = cobre o dia corrente + margem)
    await cacheService.set(idempotencyKey, true, 48 * 3600);
    propostasProcessed++;
  }

  return NextResponse.json({
    data: { notificationsCreated, propostasProcessed, managersNotified: managers.length },
    success: true,
  });
}
