import { NextRequest, NextResponse } from 'next/server'
import { ProjectService } from '@/domains/projects/services/ProjectService'
import { requireProjectOwnershipPermission } from '@/shared/lib/rbac-projects'
import { alterarStatusProjetoSchema } from '@/domains/projects/validators'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/api/error-handler'
import { apiRateLimit } from '@/shared/lib/rate-limit'

export const runtime = "nodejs"

/**
 * PATCH /api/projetos/[id]/status - Alterar status do projeto
 */
export const PATCH = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const rateCheck = await apiRateLimit.isAllowed(request)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: rateCheck.message, success: false },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetTime) } }
      )
    }

    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    const projetoAtual = await prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { responsavelId: true, status: true }
    })
    
    if (!projetoAtual) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      )
    }
    
    const user = await requireProjectOwnershipPermission(
      request,
      'canChangeStatus',
      projetoAtual.responsavelId
    )
    
    const body = await request.json()
    const data = alterarStatusProjetoSchema.parse(body)
    
    const service = new ProjectService()
    const projeto = await service.alterarStatus(projetoId, data, Number(user.id))
    
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: 'Projeto',
        entidadeId: String(projetoId),
        acao: 'UPDATE',
        diff: JSON.stringify({ campo: 'status', de: projetoAtual.status, para: data.novoStatus, observacao: data.observacao }),
      },
    })
    
    return NextResponse.json({ data: projeto, success: true })
  })

