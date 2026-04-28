import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/api/error-handler';
import { logger } from '@/lib/api/logger';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

const signatureSchema = z.object({
  assinaturaTipo: z.enum(['DIGITAL_DESENHADA', 'DIGITAL_NOME']),
  assinaturaNome: z.string().min(1, 'Nome da assinatura é obrigatório'),
  assinaturaImagem: z.string().optional(),
  observacoes: z.string().optional(),
  consentimento: z.boolean(),
  termosAceitos: z.boolean()
})

/**
 * API para processar assinatura digital de proposta
 * POST /api/propostas/[id]/assinatura
 */
export const POST = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'propostas', 'update')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }

    const { id } = await params;
    const propostaId = id;
    const body = await request.json()
    
    // Validar dados
    const validatedData = signatureSchema.parse(body)
    
    if (!validatedData.consentimento) {
      return NextResponse.json(
        { error: 'Consentimento é obrigatório', success: false },
        { status: 400 }
      )
    }

    if (!validatedData.termosAceitos) {
      return NextResponse.json(
        { error: 'Aceitação dos termos é obrigatória', success: false },
        { status: 400 }
      )
    }

    // Verificar se proposta existe
    const proposta = await prisma.proposta.findUnique({
      where: { id: Number(propostaId) }
    })

    if (!proposta) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      )
    }

    // Verificar estado da máquina: apenas ENVIADA pode ser assinada
    if (proposta.status !== 'ENVIADA') {
      return NextResponse.json(
        { error: 'Apenas propostas enviadas ao cliente podem ser assinadas', success: false },
        { status: 400 }
      )
    }

    // Verificar se já está assinada
    if (proposta.assinadaEm) {
      return NextResponse.json(
        { error: 'Proposta já está assinada', success: false },
        { status: 400 }
      )
    }

    // Obter informações de auditoria
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIp = forwardedFor || realIp || 'Unknown'

    // Map signature type to Prisma enum
    const assinaturaTipoMap = {
      'DIGITAL_DESENHADA': 'CANVAS' as const,
      'DIGITAL_NOME': 'NOME_CHECKBOX' as const
    }

    // Atualizar proposta com assinatura
    const updatedProposta = await prisma.proposta.update({
      where: { id: parseInt(propostaId) },
      data: {
        assinaturaTipo: assinaturaTipoMap[validatedData.assinaturaTipo],
        assinaturaCliente: validatedData.assinaturaNome, // Map to existing field
        assinaturaImagem: validatedData.assinaturaImagem,
        assinaturaIp: clientIp,
        assinaturaUserAgent: userAgent,
        assinadaEm: new Date(),
        status: 'ASSINADA'
      },
      include: {
        Cliente: {
          select: {
            nomeCompleto: true,
            email: true
          }
        }
      }
    })

    logger.info(`[Assinatura] Proposta ${proposta.numeroProposta} assinada via ${validatedData.assinaturaTipo}`, {
      ip: clientIp,
    })

    // Resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Assinatura processada com sucesso',
      proposta: {
        id: updatedProposta.id,
        numeroProposta: updatedProposta.numeroProposta,
        status: updatedProposta.status,
        assinadaEm: updatedProposta.assinadaEm,
        assinaturaTipo: updatedProposta.assinaturaTipo,
        assinaturaCliente: updatedProposta.assinaturaCliente
      }
    })

  });
