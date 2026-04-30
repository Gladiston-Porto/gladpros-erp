import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

function parseAprovacaoId(id: string): { type: 'expense' | 'proposta'; numericId: number } | null {
  if (id.startsWith('expense-')) {
    const num = parseInt(id.slice(8), 10);
    return isNaN(num) ? null : { type: 'expense', numericId: num };
  }
  if (id.startsWith('proposta-')) {
    const num = parseInt(id.slice(9), 10);
    return isNaN(num) ? null : { type: 'proposta', numericId: num };
  }
  return null;
}

function mapStatus(status: string): string {
  if (status === 'APROVADA') return 'aprovado';
  if (status === 'REJEITADA' || status === 'CANCELADA') return 'rejeitado';
  return 'em_aprovacao';
}

export const GET = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'aprovacoes', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const { id } = await params;
  const parsed = parseAprovacaoId(id);
  if (!parsed) {
    return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 });
  }

  if (parsed.type === 'expense') {
    const ea = await prisma.expenseApproval.findUnique({
      where: { id: parsed.numericId },
      include: {
        expense: {
          select: {
            id: true, descricao: true, valor: true, tipo: true,
            dataVencimento: true, criadoEm: true, observacoes: true,
            usuario: { select: { id: true, nomeCompleto: true, email: true } },
          },
        },
        aprovador: { select: { id: true, nomeCompleto: true, email: true } },
      },
    });

    if (!ea) return NextResponse.json({ error: 'Aprovação não encontrada', success: false }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        id,
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
          status: mapStatus(ea.status),
          dataAprovacao: ea.revisadoEm?.toISOString() ?? null,
          comentario: ea.comentario ?? null,
        }],
        status: mapStatus(ea.status),
        prioridade: 'media',
        valor: Number(ea.expense.valor),
        dataCriacao: ea.solicitadoEm.toISOString(),
        dataLimite: ea.expense.dataVencimento.toISOString(),
        descricao: ea.justificativa ?? ea.expense.descricao,
        anexos: [],
      },
    });
  }

  // Proposta
  const proposta = await prisma.proposta.findUnique({
    where: { id: parsed.numericId },
    select: {
      id: true, numeroProposta: true, titulo: true, valorEstimado: true,
      criadoEm: true, aprovacaoInternaFinanceira: true, aprovacaoInternaTecnica: true,
      criadoPor: true,
      Cliente: { select: { nomeCompleto: true } },
    },
  });

  if (!proposta) return NextResponse.json({ error: 'Proposta não encontrada', success: false }, { status: 404 });

  let criador = null;
  if (proposta.criadoPor) {
    criador = await prisma.usuario.findUnique({
      where: { id: proposta.criadoPor },
      select: { id: true, nomeCompleto: true, email: true },
    });
  }

  const aprovadores = [];
  if (!proposta.aprovacaoInternaFinanceira) {
    aprovadores.push({ id: 0, nome: 'Aprovação Financeira', email: '', cargo: 'FINANCEIRO', status: 'pendente', dataAprovacao: null, comentario: null });
  }
  if (!proposta.aprovacaoInternaTecnica) {
    aprovadores.push({ id: 0, nome: 'Aprovação Técnica', email: '', cargo: 'GERENTE', status: 'pendente', dataAprovacao: null, comentario: null });
  }

  return NextResponse.json({
    success: true,
    data: {
      id,
      titulo: `Aprovação Interna — ${proposta.titulo || proposta.numeroProposta}`,
      tipo: 'proposta',
      solicitante: criador
        ? { id: criador.id, nome: criador.nomeCompleto, email: criador.email }
        : { id: 0, nome: 'Sistema', email: '' },
      aprovadores,
      status: 'em_aprovacao',
      prioridade: 'alta',
      valor: Number(proposta.valorEstimado ?? 0),
      dataCriacao: proposta.criadoEm.toISOString(),
      dataLimite: null,
      descricao: `Proposta ${proposta.numeroProposta} — Cliente: ${proposta.Cliente?.nomeCompleto ?? 'Não informado'}`,
      anexos: [],
    },
  });
});

const AcaoSchema = z.object({
  acao: z.enum(['aprovar', 'rejeitar']),
  comentario: z.string().optional(),
});

export const PUT = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'aprovacoes', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão para aprovar/rejeitar', success: false }, { status: 403 });
  }

  const { id } = await params;
  const parsed = parseAprovacaoId(id);
  if (!parsed) {
    return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 });
  }

  const body = AcaoSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: 'Dados inválidos', message: body.error.issues[0]?.message, success: false }, { status: 400 });
  }

  const { acao, comentario } = body.data;

  if (acao === 'rejeitar' && !comentario) {
    return NextResponse.json({ error: 'Comentário obrigatório para rejeição', success: false }, { status: 400 });
  }

  if (parsed.type === 'expense') {
    const ea = await prisma.expenseApproval.findUnique({ where: { id: parsed.numericId } });
    if (!ea) return NextResponse.json({ error: 'Aprovação não encontrada', success: false }, { status: 404 });

    if (ea.status !== 'PENDENTE' && ea.status !== 'EM_ANALISE') {
      return NextResponse.json({ error: 'Esta aprovação já foi processada', success: false }, { status: 409 });
    }

    const novoStatus = acao === 'aprovar' ? 'APROVADA' : 'REJEITADA';

    await prisma.$transaction([
      prisma.expenseApproval.update({
        where: { id: parsed.numericId },
        data: { status: novoStatus as 'APROVADA' | 'REJEITADA', revisadoEm: new Date(), comentario: comentario ?? null },
      }),
      prisma.expense.update({
        where: { id: ea.expenseId },
        data: { status: acao === 'aprovar' ? 'APROVADA' : 'REJEITADA' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Despesa ${acao === 'aprovar' ? 'aprovada' : 'rejeitada'} com sucesso`,
    });
  }

  // Proposta
  const proposta = await prisma.proposta.findUnique({
    where: { id: parsed.numericId },
    select: { id: true, status: true, aprovacaoInternaFinanceira: true, aprovacaoInternaTecnica: true },
  });
  if (!proposta) return NextResponse.json({ error: 'Proposta não encontrada', success: false }, { status: 404 });

  const role = user.role as Role;
  const updateData: Record<string, unknown> = {};

  if (acao === 'aprovar') {
    if (role === 'ADMIN' || role === 'GERENTE') {
      // ADMIN/GERENTE aprovam ambas as etapas de uma vez
      updateData.aprovacaoInternaFinanceira = true;
      updateData.aprovacaoInternaTecnica = true;
    } else if (role === 'FINANCEIRO') {
      updateData.aprovacaoInternaFinanceira = true;
    }
    // Nota: aprovadaEm é definido SOMENTE no ProposalApprovalService (POST /api/propostas/[id]/approve)
    // quando ambas aprovações estão concluídas e o status muda para APROVADA
  }

  await prisma.proposta.update({ where: { id: parsed.numericId }, data: updateData });

  return NextResponse.json({
    success: true,
    message: `Proposta ${acao === 'aprovar' ? 'aprovada internamente' : 'rejeitada'}`,
  });
});
