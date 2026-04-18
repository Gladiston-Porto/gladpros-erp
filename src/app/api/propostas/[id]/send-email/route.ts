import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StatusPropostaValues } from '@/shared/types/propostas'
import emailService from '@/shared/lib/services/emailService'
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

export const POST = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    await requireUser(request)
    const { id } = await params;
    const propostaId = parseInt(id);

    if (isNaN(propostaId)) {
      return NextResponse.json(
        { error: 'ID da proposta inválido' },
        { status: 400 }
      )
    }

    // Find proposal
    const proposta = await prisma.proposta.findFirst({
      where: {
        id: propostaId,
        deletedAt: null
      },
      include: {
        Cliente: true
      }
    })

    if (!proposta) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      )
    }

    // Check if proposal can be sent
    if (proposta.status !== StatusPropostaValues.RASCUNHO) {
      return NextResponse.json(
        { error: 'Apenas propostas em rascunho podem ser enviadas' },
        { status: 400 }
      )
    }

    // Update proposal status and send email
    const updatedProposta = await prisma.proposta.update({
      where: { id: propostaId },
      data: {
        status: StatusPropostaValues.ENVIADA,
        enviadaParaOCliente: new Date()
      },
      include: {
        Cliente: true
      }
    })

    // Send email to client
    const emailResult = await emailService.sendProposalSentNotification(
      {
        ...updatedProposta,
        valorEstimado: updatedProposta.valorEstimado ? Number(updatedProposta.valorEstimado) : undefined,
        dataCriacao: updatedProposta.dataCriacao.toISOString()
      },
      updatedProposta.Cliente!.email
    )

    if (!emailResult.success) {
      // Rollback if email fails
      await prisma.proposta.update({
        where: { id: propostaId },
        data: {
          status: StatusPropostaValues.RASCUNHO,
          enviadaParaOCliente: null
        }
      })

      return NextResponse.json(
        { error: 'Falha ao enviar email para o cliente' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Proposta enviada com sucesso',
      proposta: updatedProposta
    })

  });
