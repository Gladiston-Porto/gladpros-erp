/**
 * API: SC — RECONCILIAÇÃO FINANCEIRA
 * POST /api/estoque/solicitacoes-compra/[id]/reconciliar
 * RBAC: FINANCEIRO, GERENTE, ADMIN
 *
 * Fase 10: Fechamento financeiro de uma SC CONCLUÍDA.
 *
 * Responsabilidades:
 *  1. Calcula devolução: devolucao = valorAprovado - valorTotalGasto
 *  2. Cria notificação in-app para todos os usuários FINANCEIRO
 *  3. Cria AuditLog do fechamento
 *  4. Retorna relatório de reconciliação (compras vinculadas, expenses, devolução)
 *
 * Pode ser chamado:
 *  - Automaticamente quando todos os itens da SC são recebidos (via API de Compras)
 *  - Manualmente pelo FINANCEIRO para forçar fechamento com SC PARCIALMENTE_RECEBIDA
 *
 * NÃO cria lançamento financeiro — o módulo financeiro faz isso ao receber a notificação.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import {
  successResponse,
  validationErrorResponse,
  forbiddenResponse,
  notFoundResponse,
  withErrorHandler,
  logger,
  createLogContext,
} from '@/lib/api';
import { NotificationService } from '@/shared/lib/notifications';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const reconciliarSchema = z.object({
  forcarFechamento: z.boolean().default(false), // true: permite fechar SC PARCIALMENTE_RECEBIDA
  observacoes: z.string().max(1000).optional(),
});

async function postHandler(request: NextRequest, { params }: Params) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'financeiro', 'read')) {
    return forbiddenResponse('Apenas FINANCEIRO, GERENTE ou ADMIN podem reconciliar SCs');
  }

  const { id } = await params;
  const scId = Number(id);

  const body = await request.json().catch(() => ({}));
  const validation = reconciliarSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(
      validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
    );
  }
  const dados = validation.data;

  // Buscar SC com compras e itens
  const sc = await prisma.solicitacaoCompra.findUnique({
    where: { id: scId },
    include: {
      itens: {
        select: {
          id: true,
          descricao: true,
          quantidadeSolicitada: true,
          quantidadeRecebida: true,
          status: true,
          custoEstimado: true,
          materialId: true,
        }
      },
      compras: {
        select: {
          id: true,
          valorTotal: true,
          numeroNf: true,
          criadoEm: true,
          status: true,
          fornecedor: { select: { id: true, nome: true } },
          expense: { select: { id: true, status: true, amount: true } }
        }
      },
      solicitante: { select: { id: true, nomeCompleto: true } },
      aprovador: { select: { id: true, nomeCompleto: true } },
    }
  });

  if (!sc) return notFoundResponse('Solicitação de compra não encontrada');

  // Status permitidos para reconciliação
  const statusPermitidos = ['CONCLUIDA', 'PARCIALMENTE_RECEBIDA'];
  if (!statusPermitidos.includes(sc.status)) {
    return validationErrorResponse([{
      field: 'status',
      message: `SC com status "${sc.status}" não pode ser reconciliada. Status permitidos: ${statusPermitidos.join(', ')}.`
    }]);
  }

  // Forçar fechamento de PARCIALMENTE_RECEBIDA requer flag explícita
  if (sc.status === 'PARCIALMENTE_RECEBIDA' && !dados.forcarFechamento) {
    return validationErrorResponse([{
      field: 'forcarFechamento',
      message: 'Esta SC está PARCIALMENTE_RECEBIDA. Envie forcarFechamento: true para confirmar o fechamento com itens pendentes.'
    }]);
  }

  // Cálculo financeiro
  const valorAprovado = Number(sc.valorAprovado ?? 0);
  const valorTotalGasto = Number(sc.valorTotalGasto ?? 0);
  const devolucao = Math.max(0, valorAprovado - valorTotalGasto);
  const itensPendentes = sc.itens.filter(i => i.status === 'PENDENTE').length;
  const itensRecebidos = sc.itens.filter(i => i.status === 'RECEBIDO').length;
  const totalCompras = sc.compras.length;
  const expensesPendentes = sc.compras.flatMap(c => c.expense ? [c.expense] : [])
    .filter(e => e.status !== 'PAGO').length;

  logger.info('Reconciliação de SC iniciada', createLogContext(request, user), {
    scId, valorAprovado, valorTotalGasto, devolucao, itensPendentes, forcarFechamento: dados.forcarFechamento
  });

  await prisma.$transaction(async (tx) => {
    // Se forçando fechamento de PARCIALMENTE_RECEBIDA → setar como CONCLUIDA
    if (sc.status === 'PARCIALMENTE_RECEBIDA' && dados.forcarFechamento) {
      await tx.solicitacaoCompra.update({
        where: { id: scId },
        data: {
          status: 'CONCLUIDA',
          concluidaEm: new Date(),
        }
      });
    }

    // AuditLog do fechamento financeiro
    await tx.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: 'SolicitacaoCompra',
        entidadeId: String(scId),
        acao: 'RECONCILIAR',
        diff: JSON.stringify({
          scId,
          valorAprovado,
          valorTotalGasto,
          devolucao,
          itensPendentes,
          itensRecebidos,
          totalCompras,
          forcarFechamento: dados.forcarFechamento,
          observacoes: dados.observacoes ?? null,
        }),
      }
    });
  });

  // Notificar usuários FINANCEIRO, GERENTE e ADMIN via NotificationService (cache-based)
  const destinatarios = await prisma.usuario.findMany({
    where: {
      nivel: { in: ['FINANCEIRO', 'GERENTE', 'ADMIN'] },
      status: 'ATIVO',
      empresaId: sc.empresaId,
    },
    select: { id: true }
  });

  const tituloNotif = devolucao > 0
    ? `SC #${scId} Concluída — Devolução $${devolucao.toFixed(2)}`
    : `SC #${scId} Concluída — Budget Totalmente Utilizado`;
  const mensagemNotif = devolucao > 0
    ? `SC #${scId} concluída. Devolução de $${devolucao.toFixed(2)} ao budget. ${expensesPendentes} expense(s) aguardando pagamento.`
    : `SC #${scId} concluída. Budget totalmente utilizado ($${valorTotalGasto.toFixed(2)}). ${expensesPendentes} expense(s) aguardando pagamento.`;

  await Promise.allSettled(
    destinatarios.map(d =>
      NotificationService.create({
        userId: d.id,
        type: devolucao > 0 ? 'info' : 'success',
        title: tituloNotif,
        message: mensagemNotif,
        data: { scId, devolucao, valorAprovado, valorTotalGasto, expensesPendentes, linkAcao: `/estoque/solicitacoes-compra/${scId}` }
      })
    )
  );

  const relatorio = {
    scId,
    status: dados.forcarFechamento ? 'CONCLUIDA' : sc.status,
    financeiro: {
      valorAprovado,
      valorTotalGasto,
      devolucao,
      devolucaoFormatada: `$${devolucao.toFixed(2)}`,
    },
    itens: {
      total: sc.itens.length,
      recebidos: itensRecebidos,
      pendentes: itensPendentes,
    },
    compras: {
      total: totalCompras,
      expensesPendentes,
      expensesPagos: sc.compras.flatMap(c => c.expense ? [c.expense] : []).filter(e => e.status === 'PAGO').length,
    },
    mensagem: devolucao > 0
      ? `Devolução de $${devolucao.toFixed(2)} ao budget financeiro. FINANCEIRO notificado.`
      : 'Budget totalmente utilizado. FINANCEIRO notificado.',
  };

  return successResponse(relatorio, relatorio.mensagem);
}

export const POST = withErrorHandler(postHandler);
