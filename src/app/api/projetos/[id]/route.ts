import { NextRequest, NextResponse } from 'next/server'
import { ProjectService } from '@/domains/projects/services/ProjectService'
import { 
  requireProjectPermission, 
  requireProjectOwnershipPermission,
  shouldMaskFinancials 
} from '@/shared/lib/rbac-projects'
import { updateProjetoSchema } from '@/domains/projects/validators'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

/**
 * GET /api/projetos/[id] - Obter detalhes de um projeto
 */
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    // Verificar permissão de leitura
    const user = await requireProjectPermission(request, 'canRead')
    
    // Validar ID
    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    // Buscar projeto
    const service = new ProjectService()
    const projeto = await service.buscarPorId(projetoId)
    
    if (!projeto) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      )
    }
    
    // Se for USUARIO, verificar se é responsável
    if (user.role === 'USUARIO' && projeto.responsavelId !== Number(user.id)) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar este projeto' },
        { status: 403 }
      )
    }
    
    // Mascarar dados financeiros se necessário (Fase 0 — USUARIO não vê dados financeiros)
    const maskFinancials = shouldMaskFinancials(user.role)
    if (maskFinancials) {
      return NextResponse.json({
        data: {
          ...projeto,
          orcamento: undefined,
          custoTotal: undefined,
          custoPrevisto: undefined,
          custoReal: undefined,
          margemPrevista: undefined,
          margemReal: undefined,
          lucroPrevisto: undefined,
          lucroReal: undefined,
        },
        success: true,
      })
    }
    
    return NextResponse.json({ data: projeto, success: true })
    
  });

/**
 * PUT /api/projetos/[id] - Atualizar projeto
 */
export const PUT = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    // Validar ID
    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    // Buscar projeto para verificar responsável
    const projetoAtual = await prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { responsavelId: true }
    })
    
    if (!projetoAtual) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      )
    }
    
    // Verificar permissão com ownership
    const user = await requireProjectOwnershipPermission(
      request,
      'canUpdate',
      projetoAtual.responsavelId
    )
    
    // Parsear body
    const body = await request.json()
    
    // Validar dados de entrada
    const data = updateProjetoSchema.parse(body)
    
    // Atualizar projeto
    const service = new ProjectService()
    const projeto = await service.atualizar(projetoId, data, Number(user.id))
    
    // Mascarar dados financeiros se necessário (Fase 0 — USUARIO não vê dados financeiros)
    const maskFinancials = shouldMaskFinancials(user.role)
    if (maskFinancials) {
      return NextResponse.json({
        data: {
          ...projeto,
          orcamento: undefined,
          custoTotal: undefined,
          custoPrevisto: undefined,
          custoReal: undefined,
          margemPrevista: undefined,
          margemReal: undefined,
          lucroPrevisto: undefined,
          lucroReal: undefined,
        },
        success: true,
      })
    }
    
    return NextResponse.json({ data: projeto, success: true })
    
  });

/**
 * DELETE /api/projetos/[id] - Excluir projeto (soft delete)
 */
export const DELETE = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    // Verificar permissão de exclusão (apenas ADMIN)
    const user = await requireProjectPermission(request, 'canDelete')
    
    // Validar ID
    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    // Obter motivo da exclusão do body
    const body = await request.json().catch(() => ({}))
    const motivo = body.motivo || 'Exclusão solicitada pelo administrador'
    
    // Excluir projeto
    const service = new ProjectService()
    await service.excluir(projetoId, Number(user.id), motivo)
    
    // AuditLog
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: 'Projeto',
        entidadeId: String(projetoId),
        acao: 'DELETE',
        diff: JSON.stringify({ motivo }),
      },
    })
    
    return NextResponse.json(
      { data: null, message: 'Projeto excluído com sucesso', success: true },
      { status: 200 }
    )
    
  });
