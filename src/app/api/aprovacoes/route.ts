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

  // 2. Proposal Internal Approvals
  if (!tipoFilter || tipoFilter === 'proposta') {
    const propostaWhere: Record<string, unknown> = {
      empresaId: 1,
      status: 'ENVIADA',
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
  {
    id: '1',
    titulo: 'Aprovação de Proposta - Tech Solutions Ltda',
    tipo: 'proposta',
    solicitante: {
      id: '1',
      nome: 'João Silva',
      email: 'joao.silva@empresa.com'
    },
    aprovadores: [
      {
        id: '2',
        nome: 'Maria Santos',
        email: 'maria.santos@empresa.com',
        cargo: 'Gerente de Vendas',
        status: 'aprovado',
        dataAprovacao: '2025-09-06T08:30:00Z',
        comentario: 'Proposta bem estruturada, cliente confiável.'
      },
      {
        id: '3',
        nome: 'Pedro Costa',
        email: 'pedro.costa@empresa.com',
        cargo: 'Diretor Comercial',
        status: 'pendente',
        dataAprovacao: null,
        comentario: null
      }
    ],
    status: 'em_aprovacao',
    prioridade: 'alta',
    valor: 45000,
    dataCriacao: '2025-09-06T08:00:00Z',
    dataLimite: '2025-09-08T17:00:00Z',
    descricao: 'Proposta de desenvolvimento de sistema ERP para Tech Solutions Ltda no valor de $ 45.000,00',
    anexos: [
      { nome: 'proposta-tech-solutions.pdf', url: '/api/documents/download/123' }
    ]
  },
  {
    id: '2',
    titulo: 'Aprovação de Despesa - Marketing Digital',
    tipo: 'despesa',
    solicitante: {
      id: '4',
      nome: 'Ana Oliveira',
      email: 'ana.oliveira@empresa.com'
    },
    aprovadores: [
      {
        id: '5',
        nome: 'Carlos Mendes',
        email: 'carlos.mendes@empresa.com',
        cargo: 'Gerente de Marketing',
        status: 'rejeitado',
        dataAprovacao: '2025-09-05T14:20:00Z',
        comentario: 'Valor acima do orçamento aprovado para o trimestre.'
      }
    ],
    status: 'rejeitado',
    prioridade: 'media',
    valor: 15000,
    dataCriacao: '2025-09-05T10:00:00Z',
    dataLimite: '2025-09-07T17:00:00Z',
    descricao: 'Campanha de marketing digital para lançamento do novo produto',
    anexos: []
  }
];

export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tipo = searchParams.get('tipo');

    let filteredApprovals = mockApprovals;

    if (status) {
      filteredApprovals = filteredApprovals.filter(approval => approval.status === status);
    }

    if (tipo) {
      filteredApprovals = filteredApprovals.filter(approval => approval.tipo === tipo);
    }

    return NextResponse.json({
      success: true,
      data: filteredApprovals,
      total: filteredApprovals.length,
      filters: { status, tipo }
    });
  });

export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    const {
      titulo,
      tipo,
      descricao,
      valor,
      prioridade = 'media',
      dataLimite,
      aprovadores,
      anexos = [],
      departamento = 'Geral'
    } = body;

    // Validate required fields
    if (!titulo || !tipo || !descricao || !aprovadores || aprovadores.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      );
    }

    // Evaluate approval rules
    let evaluatedApprovers = [...aprovadores];
    let autoApproved = false;

    try {
      const evaluationResponse = await fetch(`${request.nextUrl.origin}/api/aprovacoes/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo,
          tipo,
          valor: valor || 0,
          departamento,
          prioridade
        }),
      });

      if (evaluationResponse.ok) {
        const evaluationResult = await evaluationResponse.json();

        if (evaluationResult.success) {
          // Apply rule actions
          if (evaluationResult.data.finalAction === 'auto_approve') {
            autoApproved = true;
          }

          // Add rule-assigned approvers
          if (evaluationResult.data.assignedApprovers && evaluationResult.data.assignedApprovers.length > 0) {
            evaluatedApprovers = [
              ...evaluatedApprovers,
              ...evaluationResult.data.assignedApprovers
            ];
          }
        }
      }
    } catch (ruleError) {
      console.error('Rule evaluation error:', ruleError);
      // Continue without rule evaluation if it fails
    }

    const newApproval = {
      id: Date.now().toString(),
      titulo,
      tipo,
      solicitante: {
        id: '1', // Mock current user
        nome: 'João Silva',
        email: 'joao.silva@empresa.com'
      },
      aprovadores: evaluatedApprovers.map((aprovador: unknown) => {
        const data = aprovador as { nome?: string; email?: string; cargo?: string };
        return {
          ...data,
          status: autoApproved ? 'aprovado' : 'pendente',
          dataAprovacao: autoApproved ? new Date().toISOString() : null,
          comentario: autoApproved ? 'Aprovado automaticamente por regras' : null
        };
      }),
      status: autoApproved ? 'aprovado' : 'em_aprovacao',
      prioridade,
      valor: valor || 0,
      dataCriacao: new Date().toISOString(),
      dataLimite,
      descricao,
      anexos,
      departamento,
      autoApproved
    };

    return NextResponse.json({
      success: true,
      data: newApproval,
      ruleEvaluation: {
        applied: true,
        autoApproved
      }
    }, { status: 201 });
  });
