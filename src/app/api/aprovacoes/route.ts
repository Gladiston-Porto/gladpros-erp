import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

// Mock data for approvals
const mockApprovals = [
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
