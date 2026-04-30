import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { prisma } from '@/lib/prisma';

function mapExpenseApprovalStatus(status: string): string {
  if (status === 'APROVADA') return 'aprovado';
  if (status === 'REJEITADA' || status === 'CANCELADA') return 'rejeitado';
  return 'em_aprovacao';
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'aprovacoes', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const tipoFilter = searchParams.get('tipo');
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));

  const results: unknown[] = [];

  // 1. Expense Approvals
  if (!tipoFilter || tipoFilter === 'despesa') {
    const expenseWhere: Record<string, unknown> = { expense: { empresaId: 1 } };
    if (statusFilter === 'aprovado') expenseWhere.status = 'APROVADA';
    else if (statusFilter === 'rejeitado') expenseWhere.status = { in: ['REJEITADA', 'CANCELADA'] };
    else if (!statusFilter || statusFilter === 'em_aprovacao') {
      expenseWhere.status = { in: ['PENDENTE', 'EM_ANALISE'] };
    }

    const expenseApprovals = await prisma.expenseApproval.findMany({
      where: expenseWhere,
      include: {
        expense: {
          select: {
            id: true, descricao: true, valor: true, tipo: true,
            dataVencimento: true, criadoEm: true,
            usuario: { select: { id: true, nomeCompleto: true, email: true } },
          },
        },
        aprovador: { select: { id: true, nomeCompleto: true, email: true } },
      },
      orderBy: { solicitadoEm: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    for (const ea of expenseApprovals) {
      results.push({
        id: `expense-${ea.id}`,
        titulo: `Aprovação de Despesa — ${ea.expense.descricao}`,
        tipo: 'despesa',
        solicitante: ea.expense.usuario
          ? { id: ea.expense.usuario.id, nome: ea.expense.usuario.nomeCompleto, email: ea.expense.usuario.email }
          : { id: 0, nome: 'Sistema', email: '' },
        aprovadores: [{
          id: ea.aprovador.id,
          nome: ea.aprovador.nomeCompleto,
          email: ea.aprovador.email,
          cargo: ea.tipoAprovador,
          status: mapExpenseApprovalStatus(ea.status),
          dataAprovacao: ea.revisadoEm?.toISOString() ?? null,
          comentario: ea.comentario ?? null,
        }],
        status: mapExpenseApprovalStatus(ea.status),
        prioridade: 'media',
        valor: Number(ea.expense.valor),
        dataCriacao: ea.solicitadoEm.toISOString(),
        dataLimite: ea.expense.dataVencimento.toISOString(),
        descricao: ea.justificativa ?? ea.expense.descricao,
        anexos: [],
      });
    }
  }

  // 2. Proposal Internal Approvals (status ASSINADA = client signed, awaiting internal review)
  if (!tipoFilter || tipoFilter === 'proposta') {
    const propostaWhere: Record<string, unknown> = {
      empresaId: 1,
      status: 'ASSINADA',
      deletedAt: null,
      OR: [
        { aprovacaoInternaFinanceira: false },
        { aprovacaoInternaTecnica: false },
      ],
    };
    if (statusFilter && statusFilter !== 'em_aprovacao') {
      // If filtering by other status, skip proposals (they're always em_aprovacao here)
      propostaWhere.id = -1; // no results
    }

    const propostas = await prisma.proposta.findMany({
      where: propostaWhere,
      select: {
        id: true, numeroProposta: true, titulo: true, valorEstimado: true,
        criadoEm: true, aprovacaoInternaFinanceira: true, aprovacaoInternaTecnica: true,
        criadoPor: true,
        Cliente: { select: { nomeCompleto: true } },
      },
      orderBy: { criadoEm: 'desc' },
      take: pageSize,
    });

    // Fetch creators in a single query
    const criadoPorIds = propostas.map(p => p.criadoPor).filter((id): id is number => id !== null);
    const criadores = criadoPorIds.length > 0
      ? await prisma.usuario.findMany({
          where: { id: { in: criadoPorIds } },
          select: { id: true, nomeCompleto: true, email: true },
        })
      : [];
    const criadoresMap = new Map(criadores.map(u => [u.id, u]));

    for (const p of propostas) {
      const aprovadores = [];
      if (!p.aprovacaoInternaFinanceira) {
        aprovadores.push({ id: 0, nome: 'Aprovação Financeira', email: '', cargo: 'FINANCEIRO', status: 'pendente', dataAprovacao: null, comentario: null });
      }
      if (!p.aprovacaoInternaTecnica) {
        aprovadores.push({ id: 0, nome: 'Aprovação Técnica', email: '', cargo: 'GERENTE', status: 'pendente', dataAprovacao: null, comentario: null });
      }

      results.push({
        id: `proposta-${p.id}`,
        titulo: `Aprovação Interna — ${p.titulo || p.numeroProposta}`,
        tipo: 'proposta',
        solicitante: (() => {
          const criador = p.criadoPor ? criadoresMap.get(p.criadoPor) : null;
          return criador
            ? { id: criador.id, nome: criador.nomeCompleto, email: criador.email }
            : { id: 0, nome: 'Sistema', email: '' };
        })(),
        aprovadores,
        status: 'em_aprovacao',
        prioridade: 'alta',
        valor: Number(p.valorEstimado ?? 0),
        dataCriacao: p.criadoEm.toISOString(),
        dataLimite: null,
        descricao: `Proposta ${p.numeroProposta} — Cliente: ${p.Cliente?.nomeCompleto ?? 'Não informado'}`,
        anexos: [],
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: results,
    total: results.length,
    pagination: { page, pageSize, total: results.length, totalPages: Math.ceil(results.length / pageSize) },
    filters: { status: statusFilter, tipo: tipoFilter },
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireUser(request);
  return NextResponse.json(
    {
      error: 'Criação via endpoint genérico não suportada',
      message: 'Aprovações de despesa são criadas via /api/financeiro/despesas. Aprovações de proposta são gerenciadas pelo módulo de Propostas.',
      success: false,
    },
    { status: 501 }
  );
});
