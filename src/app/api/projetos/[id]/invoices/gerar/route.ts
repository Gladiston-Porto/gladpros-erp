/**
 * POST /api/projetos/[id]/invoices/gerar
 * Fase 7: Gera invoice para projeto
 * 
 * @middleware requireProjectPermission - Requer canManageFinance
 * @returns Invoice gerado com dados mascarados
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProjectPermission } from '@/shared/lib/rbac-projects';
import { getFinanceGateway } from '@/domains/projects/gateways/mock-finance.gateway';
import { prisma } from '@/lib/prisma';
import { GerarInvoiceDTO, ItemInvoice } from '@/domains/projects/interfaces/finance-gateway.interface';
import { withErrorHandler } from '@/lib/api/error-handler';

export const POST = withErrorHandler(async (req: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    // Verificar permissão financeira (apenas FINANCEIRO e ADMIN)
    const user = await requireProjectPermission(req, 'canViewFinancials');
    
    // Validar ID
    const { id } = await context.params;
    const projetoId = parseInt(id, 10);

    if (isNaN(projetoId)) {
      return NextResponse.json(
        { erro: 'ID do projeto inválido' },
        { status: 400 }
      );
    }

    // Busca projeto
    const projeto = await prisma.projeto.findUnique({
      where: { id: projetoId },
      include: {
        Proposta: true,
        Materiais: true,
      },
    });

    if (!projeto) {
      return NextResponse.json(
        { erro: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // Valida que projeto tem proposta
    if (!(projeto as any).Proposta) {
      return NextResponse.json(
        { erro: 'Projeto não possui proposta associada' },
        { status: 400 }
      );
    }

    // Parse do body
    const body = await req.json();

    const {
      descricao,
      dataVencimento,
      incluirProposta = true,
      incluirMateriais = true,
      itensAdicionais = [],
      desconto,
      descontoFixo,
      formaPagamento = 'PIX',
      observacoes,
    } = body;

    // Validações
    if (!descricao || typeof descricao !== 'string') {
      return NextResponse.json(
        { erro: 'Descrição é obrigatória' },
        { status: 400 }
      );
    }

    if (!dataVencimento) {
      return NextResponse.json(
        { erro: 'Data de vencimento é obrigatória' },
        { status: 400 }
      );
    }

    const vencimento = new Date(dataVencimento);
    if (isNaN(vencimento.getTime())) {
      return NextResponse.json(
        { erro: 'Data de vencimento inválida' },
        { status: 400 }
      );
    }

    // Valida desconto
    if (desconto && (desconto < 0 || desconto > 100)) {
      return NextResponse.json(
        { erro: 'Desconto deve estar entre 0 e 100%' },
        { status: 400 }
      );
    }

    if (descontoFixo && descontoFixo < 0) {
      return NextResponse.json(
        { erro: 'Desconto fixo não pode ser negativo' },
        { status: 400 }
      );
    }

    // Monta DTO para o gateway
    const dto: GerarInvoiceDTO = {
      projetoId,
      usuarioId: parseInt(user.id, 10),
      descricao,
      dataVencimento: vencimento,
      incluirProposta,
      incluirMateriais,
      itensAdicionais: itensAdicionais as ItemInvoice[],
      desconto,
      descontoFixo,
      formaPagamento,
      observacoes,
    };

    // Chama gateway financeiro
    const gateway = getFinanceGateway();
    const resultado = await gateway.gerarInvoice(dto);

    if (!resultado.sucesso) {
      return NextResponse.json(
        { erro: resultado.mensagem },
        { status: 400 }
      );
    }

    // Busca invoice gerado
    const invoice = await gateway.buscarInvoice(resultado.invoiceId!);

    if (!invoice) {
      return NextResponse.json(
        { erro: 'Erro ao buscar invoice gerado' },
        { status: 500 }
      );
    }

    // Retorna invoice (já vem com dados mascarados)
    return NextResponse.json(
      {
        sucesso: true,
        mensagem: resultado.mensagem,
        invoice: {
          id: invoice.id,
          numeroInvoice: invoice.numeroInvoice,
          projetoId: invoice.projetoId,
          numeroProjeto: invoice.numeroProjeto,
          clienteNome: invoice.clienteNome,
          clienteDocumento: invoice.clienteDocumento, // Já mascarado
          status: invoice.status,
          descricao: invoice.descricao,
          dataEmissao: invoice.dataEmissao,
          dataVencimento: invoice.dataVencimento,
          itens: invoice.itens,
          subtotal: invoice.subtotal,
          desconto: invoice.desconto,
          valorTotal: invoice.valorTotal,
          valorPago: invoice.valorPago,
          formaPagamento: invoice.formaPagamento,
          observacoes: invoice.observacoes,
          urlPagamento: invoice.urlPagamento,
          criadoEm: invoice.criadoEm,
        },
      },
      { status: 201 }
    );
  });
