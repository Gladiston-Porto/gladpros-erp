import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/shared/lib/rbac'
import { can, type Role } from '@/shared/lib/rbac-core'
import { calcEstimativa } from '@/config/estimador/pricing'
import { enrichWithEp } from '@/lib/estimationpro'

const schema = z.object({
  tradeId: z.string().min(1),
  respostas: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
})

export async function POST(request: NextRequest) {
  const user = await requireUser(request)

  if (!can(user.role as Role, 'propostas', 'create')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para gerar estimativas', success: false },
      { status: 403 }
    )
  }

  const body = schema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 }
    )
  }

  const { tradeId, respostas } = body.data

  try {
    // Internal pricing engine (Dallas TX 2025)
    let result = calcEstimativa(tradeId, respostas)

    // Enrich with EstimationPro.ai live pricing (free, fail-open)
    // Sets fonte:'hybrid' only when a matching EP item is found; falls back silently on errors.
    result = await enrichWithEp(result, tradeId, respostas)

    return NextResponse.json({ data: result, success: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar estimativa'
    return NextResponse.json(
      { error: 'Estimation failed', message, success: false },
      { status: 400 }
    )
  }
}
