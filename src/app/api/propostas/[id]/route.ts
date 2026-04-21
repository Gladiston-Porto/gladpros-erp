
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adaptPropostaFormToAPI } from '@/components/propostas/adapter'
import { PropostaFormData } from '@/components/propostas/types'
import { withErrorHandler } from '@/lib/api/error-handler';
import { updatePropostaSchema } from '@/schemas/proposta.schema';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'propostas', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const { id } = await params
    const propostaId = parseInt(id)

    if (isNaN(propostaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const proposta = await prisma.proposta.findUnique({
      where: { id: propostaId },
      include: {
        PropostaMaterial: true,
        PropostaEtapa: true,
        Cliente: true
      }
    })

    if (!proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ data: proposta, success: true })
  });

export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const userPut = await requireUser(request);
  if (!can(userPut.role as Role, 'propostas', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
    const { id } = await params
    const propostaId = parseInt(id)

    if (isNaN(propostaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body: PropostaFormData = updatePropostaSchema.parse(await request.json())
    // Convert form data to API/DB payload
    const payload = adaptPropostaFormToAPI(body)

    const updatedProposta = await prisma.$transaction(async (tx) => {
      // 1. Update main fields
      await tx.proposta.update({
        where: { id: propostaId },
        data: {
          clienteId: payload.clienteId,
          titulo: payload.titulo,
          descricaoEscopo: payload.descricao,
          valorEstimado: payload.valorEstimado,
          status: payload.status,
          contatoNome: payload.contatoNome,
          contatoEmail: payload.contatoEmail,
          contatoTelefone: payload.contatoTelefone,
          localExecucaoEndereco: payload.localExecucaoEndereco,
          tempoParaAceite: payload.tempoParaAceite,
          validadeProposta: payload.validadeProposta,
          prazoExecucaoEstimadoDias: payload.prazoExecucaoDias,
          janelaExecucaoPreferencial: payload.janelaExecucao,
          restricoesDeAcesso: payload.restricoesAcesso,
          permite: payload.permite,
          quaisPermites: payload.quaisPermites,
          normasReferencias: payload.normasReferencia,
          inspecoesNecessarias: payload.inspecoesNecessarias,
          condicoesPagamento: payload.condicoesPagamento,
          garantia: payload.garantia,
          exclusoes: payload.exclusoes,
          condicoesGerais: payload.condicoesGerais,
          internalEstimate: JSON.stringify(payload.estimativasInternas),
          gatilhoFaturamento: payload.gatilhoFaturamento as any, // Cast if enum mismatch
          percentualSinal: payload.percentualSinal,
          formaPagamentoPreferida: payload.formaPreferida as any,
          instrucoesPagamento: payload.instrucoesFaturamento,
          observacoesParaCliente: payload.observacoesCliente,
          observacoesInternas: payload.observacoesInternas,
          atualizadoEm: new Date(),
        }
      })

      // 2. Refresh materials (delete all and recreate)
      await tx.propostaMaterial.deleteMany({
        where: { propostaId: propostaId }
      })

      if (payload.materiais.length > 0) {
        await tx.propostaMaterial.createMany({
          data: payload.materiais.map(m => ({
            propostaId: propostaId,
            codigo: m.codigo,
            nome: m.nome,
            quantidade: m.quantidade,
            unidade: m.unidade,
            precoUnitario: m.valorUnitarioEstimado,
            status: m.status as any,
            fornecedorPreferencial: m.fornecedor,
            observacao: m.observacoes
          }))
        })
      }

      // 3. Refresh etapas
      await tx.propostaEtapa.deleteMany({
        where: { propostaId: propostaId }
      })

      if (payload.etapas.length > 0) {
        await tx.propostaEtapa.createMany({
          data: payload.etapas.map(e => ({
            propostaId: propostaId,
            servico: e.servico,
            descricao: e.descricao,
            ordem: e.ordem,
            quantidade: e.quantidade,
            unidade: e.unidade,
            duracaoEstimadaHoras: e.duracaoEstimadaHoras,
            custoMaoObraEstimado: e.custoMaoObraEstimado,
            status: e.status as any
          }))
        })
      }

      return await tx.proposta.findUnique({
        where: { id: propostaId },
        include: { PropostaMaterial: true, PropostaEtapa: true }
      })
    })

    return NextResponse.json({ data: updatedProposta, success: true })

  });

// DELETE /api/propostas/[id] - Soft delete proposta
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    const userDel = await requireUser(request);
    if (!can(userDel.role as Role, 'propostas', 'delete')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const { id } = await params;
    const propostaId = parseInt(id);

    if (isNaN(propostaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const proposta = await prisma.proposta.findFirst({
      where: { id: propostaId, deletedAt: null }
    });

    if (!proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    if (!['RASCUNHO', 'CANCELADA'].includes(proposta.status)) {
      return NextResponse.json(
        { error: 'Apenas propostas em rascunho ou canceladas podem ser excluídas' },
        { status: 400 }
      );
    }

    await prisma.proposta.update({
      where: { id: propostaId },
      data: { deletedAt: new Date(), atualizadoEm: new Date() }
    });

    return NextResponse.json({ message: 'Proposta excluída com sucesso', success: true });
  });
