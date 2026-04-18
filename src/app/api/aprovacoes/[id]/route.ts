import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

// Mock approval data
const mockApproval = {
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
};

export const GET = withErrorHandler(async (request: Request,
  { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    // In a real implementation, fetch from database
    if (id !== '1') {
      return NextResponse.json(
        { success: false, error: 'Approval not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mockApproval
    });
  });

export const PUT = withErrorHandler(async (request: Request) => {
    // const { id } = params; // Not used in mock implementation
    const body = await request.json();
    const { acao, comentario } = body;

    if (!acao || !['aprovar', 'rejeitar'].includes(acao)) {
      return NextResponse.json(
        { success: false, error: 'Ação inválida. Use "aprovar" ou "rejeitar"' },
        { status: 400 }
      );
    }

    if (acao === 'rejeitar' && !comentario) {
      return NextResponse.json(
        { success: false, error: 'Comentário obrigatório para rejeição' },
        { status: 400 }
      );
    }

    // Mock approval update
    const updatedApproval = {
      ...mockApproval,
      aprovadores: mockApproval.aprovadores.map(aprovador =>
        aprovador.id === '3' ? { // Mock current user
          ...aprovador,
          status: acao === 'aprovar' ? 'aprovado' : 'rejeitado',
          dataAprovacao: new Date().toISOString(),
          comentario: comentario || null
        } : aprovador
      ),
      status: acao === 'aprovar' ? 'aprovado' : 'rejeitado'
    };

    return NextResponse.json({
      success: true,
      data: updatedApproval,
      message: `Solicitação ${acao === 'aprovar' ? 'aprovada' : 'rejeitada'} com sucesso`
    });
  });
