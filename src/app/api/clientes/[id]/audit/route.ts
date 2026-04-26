import { NextResponse } from 'next/server'
import { clienteParamsSchema } from '@/shared/lib/validations/cliente'
import { AuditService } from '@/shared/lib/audit'
import { requireUser } from '@/shared/lib/rbac'
import { can, type Role } from '@/shared/lib/rbac-core'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

/**
 * GET /api/clientes/[id]/audit - Obter histórico de auditoria do cliente
 */
export const GET = withErrorHandler(async (request: Request,
  ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request)
    if (!can(user.role as Role, 'clientes', 'read')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão', success: false },
        { status: 403 }
      )
    }

    // Validar parâmetros
    const { id } = clienteParamsSchema.parse(await ctx.params)
    
    // Obter parâmetros de query
    const { searchParams } = new URL(request.url)
    const limit = z.coerce.number().min(1).max(100).default(50).parse(searchParams.get('limit') ?? undefined)
    
    // Buscar histórico
    const history = await AuditService.getEntityHistory('Cliente', id, limit)
    
    // Formatar resposta
    const data = history.map((entry: Record<string, unknown>) => {
      const typedEntry = entry as {
        id: string | number
        acao: string
        diff: string | null
        timestamp: Date
        usuario: {
          id: number
          nomeCompleto: string
          email: string
        }
      }
      return {
        id: typedEntry.id,
        acao: typedEntry.acao,
        diff: typedEntry.diff ? JSON.parse(typedEntry.diff) : null,
        timestamp: typedEntry.timestamp.toISOString(),
        usuario: {
          id: typedEntry.usuario.id,
          nome: typedEntry.usuario.nomeCompleto,
        }
      }
    })
    
    return NextResponse.json({ data, success: true })
    
  });
