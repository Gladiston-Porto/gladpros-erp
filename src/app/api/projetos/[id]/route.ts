import { NextRequest, NextResponse } from 'next/server'
import { ProjectService } from '@/domains/projects/services/ProjectService'
import { 
  maskProjectFinancials,
  requireProjectPermission, 
  requireProjectAccess,
  shouldMaskFinancials 
} from '@/shared/lib/rbac-projects'
import { updateProjetoSchema } from '@/domains/projects/validators'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/api/error-handler';
import { z } from 'zod'
import { can, type Role } from '@/shared/lib/rbac-core'

export const runtime = "nodejs"

const deleteProjetoSchema = z.object({
  motivo: z.string().trim().min(1).max(500).optional(),
})

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
        { error: 'Validation failed', message: 'ID inválido', success: false },
        { status: 400 }
      )
    }
    
    await requireProjectAccess(user, projetoId, 'canRead')

    // Buscar projeto
    const service = new ProjectService()
    const projeto = await service.buscarPorId(projetoId)
    
    if (!projeto) {
      return NextResponse.json(
        { error: 'Not found', message: 'Projeto não encontrado', success: false },
        { status: 404 }
      )
    }
    
    // Se for USUARIO, verificar se é responsável
    if (user.role === 'USUARIO' && projeto.responsavelId !== Number(user.id)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para acessar este projeto', success: false },
        { status: 403 }
      )
    }
    
    // Mascarar dados financeiros se necessário (Fase 0 — USUARIO não vê dados financeiros)
    const maskFinancials = shouldMaskFinancials(user.role)
    if (maskFinancials) {
      return NextResponse.json({ data: maskProjectFinancials(projeto as unknown as Record<string, unknown>), success: true })
    }
    
    return NextResponse.json({ data: projeto, success: true })
    
  });

/**
 * PUT /api/projetos/[id] - Atualizar projeto
 */
export const PUT = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, 'canUpdate')

    // Validar ID
    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'ID inválido', success: false },
        { status: 400 }
      )
    }

    await requireProjectAccess(user, projetoId, 'canUpdate')
    
    // Parsear body
    const body = await request.json()
    
    // Validar dados de entrada
    const data = updateProjetoSchema.parse(body)

    const touchesFinancialFields =
      Object.prototype.hasOwnProperty.call(body, 'valorOrcado') ||
      Object.prototype.hasOwnProperty.call(body, 'valorRealizado') ||
      Object.prototype.hasOwnProperty.call(body, 'budgetBaseline') ||
      Object.prototype.hasOwnProperty.call(body, 'baselineLockedAt') ||
      Object.prototype.hasOwnProperty.call(body, 'baselineLockedBy')

    if (touchesFinancialFields && !can(user.role as Role, 'financeiro', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para alterar campos financeiros do projeto', success: false },
        { status: 403 }
      )
    }
    
    // Atualizar projeto
    const service = new ProjectService()
    const projeto = await service.atualizar(projetoId, data, Number(user.id))
    
    // Mascarar dados financeiros se necessário (Fase 0 — USUARIO não vê dados financeiros)
    const maskFinancials = shouldMaskFinancials(user.role)
    if (maskFinancials) {
      return NextResponse.json({ data: maskProjectFinancials(projeto as unknown as Record<string, unknown>), success: true })
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
        { error: 'Validation failed', message: 'ID inválido', success: false },
        { status: 400 }
      )
    }
    
    // Obter motivo da exclusão do body
    const parsedBody = deleteProjetoSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Validation failed', message: parsedBody.error.issues[0]?.message ?? 'Motivo inválido', success: false },
        { status: 400 }
      )
    }
    const motivo = parsedBody.data.motivo || 'Exclusão solicitada pelo administrador'
    
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
