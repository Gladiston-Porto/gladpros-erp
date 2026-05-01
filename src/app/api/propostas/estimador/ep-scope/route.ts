import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/shared/lib/rbac'
import { can, type Role } from '@/shared/lib/rbac-core'
import { buildEpResultFromScope } from '@/lib/estimationpro'

const bodySchema = z.object({
  scope: z.string().min(10, 'Descreva o escopo com pelo menos 10 caracteres.').max(2000),
})

export async function POST(request: NextRequest) {
  const user = await requireUser(request)

  if (!can(user.role as Role, 'propostas', 'create')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para gerar estimativas', success: false },
      { status: 403 }
    )
  }

  const body = bodySchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 }
    )
  }

  const result = await buildEpResultFromScope(body.data.scope)

  if (!result) {
    return NextResponse.json(
      {
        error: 'Trade not detected',
        message:
          'Não foi possível identificar o tipo de serviço no texto informado. ' +
          'Tente o modo GPT-4o para escopos complexos ou mistos.',
        success: false,
      },
      { status: 422 }
    )
  }

  return NextResponse.json({ data: result, success: true }, { status: 200 })
}
