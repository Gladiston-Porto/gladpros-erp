// src/api/groups/proposals/routes.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiMiddleware } from '@/middleware/auth-middleware';
import { z } from 'zod';

// Schemas de validação
const createProposalSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  clienteId: z.string(),
  contatoNome: z.string().optional(),
  contatoEmail: z.string().email().optional(),
  localExecucaoEndereco: z.string().optional(),
  valorEstimado: z.number().positive(),
  validadeProposta: z.string().optional(),
  observacoes: z.string().optional(),
  termosCondicoes: z.string().optional()
});

const updateProposalSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional(),
  status: z.enum(['rascunho', 'enviada', 'visualizada', 'aprovada', 'rejeitada', 'expirada', 'cancelada']).optional(),
  valorEstimado: z.number().positive().optional(),
  precoPropostaCliente: z.number().positive().optional(),
  validadeProposta: z.string().optional(),
  contatoNome: z.string().optional(),
  contatoEmail: z.string().email().optional(),
  localExecucaoEndereco: z.string().optional(),
  observacoes: z.string().optional(),
  termosCondicoes: z.string().optional()
});

// Middleware compartilhado para propostas
const proposalMiddleware = createApiMiddleware({
  auth: { requireAuth: true },
  rateLimit: { maxRequests: 50, windowMs: 60 * 1000 },
  logging: true
});

// Handlers agrupados
export class ProposalApiGroup {
  // GET /api/proposals - Listar propostas
  static async getProposals(req: NextRequest) {
    const middlewareResult = await proposalMiddleware(req);
    if (middlewareResult.status !== 200) return middlewareResult;

    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1');
      const pageSize = parseInt(searchParams.get('pageSize') || '10');
      const status = searchParams.get('status'); // eslint-disable-line @typescript-eslint/no-unused-vars
      // Will be used for filtering
      const search = searchParams.get('search'); // eslint-disable-line @typescript-eslint/no-unused-vars
      // Will be used for search functionality

      // Lógica para listar propostas com filtros
      const proposals = [
        {
          id: '1',
          numeroProposta: 'PROP-001',
          titulo: 'Proposta de Consultoria',
          status: 'enviada',
          valorEstimado: 5000,
          criadoEm: new Date().toISOString(),
          cliente: {
            id: '1',
            nome: 'Cliente Exemplo',
            email: 'cliente@example.com'
          }
        }
      ];

      return NextResponse.json({
        data: proposals,
        total: proposals.length,
        page,
        pageSize,
        totalPages: Math.ceil(proposals.length / pageSize)
      });
    } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Error handling - will be used for logging when database integration is complete
      return NextResponse.json(
        { error: 'Failed to fetch proposals' },
        { status: 500 }
      );
    }
  }

  // POST /api/proposals - Criar proposta
  static async createProposal(req: NextRequest) {
    const middlewareResult = await proposalMiddleware(req);
    if (middlewareResult.status !== 200) return middlewareResult;

    try {
      const body = await req.json();
      const validatedData = createProposalSchema.parse(body);

      // Lógica para criar proposta
      const newProposal = {
        id: Date.now().toString(),
        numeroProposta: `PROP-${Date.now()}`,
        ...validatedData,
        status: 'rascunho',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        token: `token_${Date.now()}`
      };

      return NextResponse.json(newProposal, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid proposal data', details: error },
        { status: 400 }
      );
    }
  }

  // GET /api/proposals/[id] - Buscar proposta específica
  static async getProposal(req: NextRequest, context: { params: { id: string } }) {
    const middlewareResult = await proposalMiddleware(req);
    if (middlewareResult.status !== 200) return middlewareResult;

    try {
      const { id } = context.params;

      // Lógica para buscar proposta
      const proposal = {
        id,
        numeroProposta: 'PROP-001',
        titulo: 'Proposta de Consultoria',
        status: 'enviada',
        valorEstimado: 5000,
        criadoEm: new Date().toISOString(),
        cliente: {
          id: '1',
          nome: 'Cliente Exemplo',
          email: 'cliente@example.com'
        }
      };

      return NextResponse.json(proposal);
    } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }
  }

  // PUT /api/proposals/[id] - Atualizar proposta
  static async updateProposal(req: NextRequest, context: { params: { id: string } }) {
    const middlewareResult = await proposalMiddleware(req);
    if (middlewareResult.status !== 200) return middlewareResult;

    try {
      const { id } = context.params;
      const body = await req.json();
      const validatedData = updateProposalSchema.parse(body);

      // Lógica para atualizar proposta
      const updatedProposal = {
        id,
        ...validatedData,
        atualizadoEm: new Date().toISOString()
      };

      return NextResponse.json(updatedProposal);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error },
        { status: 400 }
      );
    }
  }

  // DELETE /api/proposals/[id] - Deletar proposta
  static async deleteProposal(req: NextRequest, context: { params: { id: string } }) {
    const middlewareResult = await proposalMiddleware(req);
    if (middlewareResult.status !== 200) return middlewareResult;

    try {
      const { id } = context.params; // eslint-disable-line @typescript-eslint/no-unused-vars
      // Will be used when database integration is complete

      // Lógica para deletar proposta
      // await deleteProposalFromDatabase(id);

      return NextResponse.json({ message: 'Proposal deleted successfully' });
    } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Error handling - will be used for logging when database integration is complete
      return NextResponse.json(
        { error: 'Failed to delete proposal' },
        { status: 500 }
      );
    }
  }

  // POST /api/proposals/[id]/send - Enviar proposta
  static async sendProposal(req: NextRequest, context: { params: { id: string } }) {
    const middlewareResult = await proposalMiddleware(req);
    if (middlewareResult.status !== 200) return middlewareResult;

    try {
      const { id } = context.params; // eslint-disable-line @typescript-eslint/no-unused-vars
      // Will be used when email integration is complete

      // Lógica para enviar proposta por email
      // await sendProposalEmail(id);

      return NextResponse.json({
        message: 'Proposal sent successfully',
        status: 'enviada'
      });
    } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      return NextResponse.json(
        { error: 'Failed to send proposal' },
        { status: 500 }
      );
    }
  }
}

// Exportar handlers para uso nas rotas Next.js
export const proposalHandlers = {
  GET: ProposalApiGroup.getProposals,
  POST: ProposalApiGroup.createProposal
};

export const proposalDetailHandlers = {
  GET: ProposalApiGroup.getProposal,
  PUT: ProposalApiGroup.updateProposal,
  DELETE: ProposalApiGroup.deleteProposal
};

export const proposalActionHandlers = {
  POST: ProposalApiGroup.sendProposal
};
