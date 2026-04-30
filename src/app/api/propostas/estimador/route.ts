import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/shared/lib/rbac'
import { can, type Role } from '@/shared/lib/rbac-core'
import { calcEstimativa } from '@/config/estimador/pricing'

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
    // Phase 1: internal pricing engine (Dallas TX 2025)
    const result = calcEstimativa(tradeId, respostas)

    // Phase 2 (future): enrich with EstimationPro.ai live pricing
    // Uncomment when ESTIMATION_PRO_API_KEY is set:
    // const epResult = await tryEstimationPro(tradeId, respostas)
    // if (epResult) { result = mergeWithEstimationPro(result, epResult); result.fonte = 'hybrid' }

    return NextResponse.json({ data: result, success: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar estimativa'
    return NextResponse.json(
      { error: 'Estimation failed', message, success: false },
      { status: 400 }
    )
  }
}
