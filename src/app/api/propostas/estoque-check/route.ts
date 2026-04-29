import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'
import type { Role } from '@/shared/lib/rbac-core'
import { z } from 'zod'

const checkSchema = z.object({
  items: z.array(
    z.object({
      estoqueItemId: z.number().int().positive(),
      quantidade: z.number().positive(),
    })
  ).min(1),
})

/**
 * POST /api/propostas/estoque-check
 * Checks stock availability for a list of material items.
 * Returns each item with disponivel, needsToPurchase, and shortfall.
 */
export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 })
  }

  const body = checkSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 }
    )
  }

  const { items } = body.data
  const materialIds = items.map((i) => i.estoqueItemId)

  // Aggregate disponivel per material across all locations
  const saldos = await prisma.$queryRaw<{ materialId: number; disponivel: number }[]>`
    SELECT material_id AS materialId, SUM(COALESCE(disponivel, quantidade - reservado)) AS disponivel
    FROM materiais_saldo
    WHERE material_id IN (${materialIds.join(',')})
    GROUP BY material_id
  `

  const saldoMap = new Map(saldos.map((s) => [s.materialId, Number(s.disponivel ?? 0)]))

  const materials = await prisma.material.findMany({
    where: { id: { in: materialIds } },
    select: { id: true, nome: true, codigo: true },
  })

  const materialMap = new Map(materials.map((m) => [m.id, m]))

  const result = items.map((item) => {
    const disponivel = saldoMap.get(item.estoqueItemId) ?? 0
    const mat = materialMap.get(item.estoqueItemId)
    const needsToPurchase = disponivel < item.quantidade
    return {
      estoqueItemId: item.estoqueItemId,
      nome: mat?.nome ?? 'Unknown',
      codigo: mat?.codigo ?? '',
      quantidadeSolicitada: item.quantidade,
      disponivel,
      needsToPurchase,
      shortfall: needsToPurchase ? item.quantidade - disponivel : 0,
    }
  })

  return NextResponse.json({ data: result, success: true })
}
