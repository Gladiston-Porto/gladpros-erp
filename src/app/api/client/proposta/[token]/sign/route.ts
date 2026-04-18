import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { StatusPropostaValues } from '@/shared/types/propostas'
import { validateTokenPublico } from '@/shared/lib/services/proposta-token'
import emailService from '@/shared/lib/services/emailService'
import { assinaturaClienteSchema } from '@/shared/lib/validations/proposta'
import { withErrorHandler } from '@/lib/api/error-handler';

export const POST = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const body = await request.json()
    
    // Validate request body
    const { 
      assinaturaTipo, 
      assinaturaCliente, 
      assinaturaImagem, 
      ip, 
      userAgent 
    } = assinaturaClienteSchema.parse(body)

    // Validate token and find proposal
    const proposta = await validateTokenPublico(token)

    if (!proposta) {
      return NextResponse.json(
        { error: 'Proposta não encontrada ou token expirado' },
        { status: 404 }
      )
    }

    if (proposta.status !== StatusPropostaValues.ENVIADA) {
      return NextResponse.json(
        { error: 'Proposta não está disponível para assinatura' },
        { status: 400 }
      )
    }

    // Get client IP if not provided
    const clientIp = ip || request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 'unknown'
    const clientUserAgent = userAgent || request.headers.get('user-agent') || 'unknown'

    // Update proposal with signature
    const updatedProposta = await prisma.proposta.update({
      where: { id: proposta.id },
      data: {
        status: StatusPropostaValues.ASSINADA,
        assinaturaTipo,
        assinadaEm: new Date(),
        assinaturaCliente,
        assinaturaImagem: assinaturaTipo === 'CANVAS' ? assinaturaImagem : null,
        assinaturaIp: clientIp,
        assinaturaUserAgent: clientUserAgent,
        atualizadoEm: new Date()
      }
    })

    // Log the action
    await prisma.propostaLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        propostaId: proposta.id,
        actorId: null, // System user for client signatures
        action: 'SIGNED',
        newJson: JSON.stringify({
          assinaturaTipo,
          assinaturaCliente,
          status: 'ASSINADA' 
        }),
        ip: clientIp,
        userAgent: clientUserAgent,
        createdAt: new Date()
      }
    })

    // Send email notification
    try {
      await emailService.sendProposalSignedNotification({
        ...updatedProposta,
        id: String(updatedProposta.id),
        valorEstimado: updatedProposta.valorEstimado ? Number(updatedProposta.valorEstimado) : undefined
      }, assinaturaCliente)
    } catch (emailError) {
      console.error('Error sending email notification:', emailError)
      // Don't fail the main operation if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Proposta assinada com sucesso',
      proposta: {
        id: updatedProposta.id,
        numeroProposta: updatedProposta.numeroProposta,
        status: updatedProposta.status,
        assinadaEm: updatedProposta.assinadaEm
      }
    })

  });
