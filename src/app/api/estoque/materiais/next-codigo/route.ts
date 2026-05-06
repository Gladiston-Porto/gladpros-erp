import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/api/error-handler'
import { requireUser } from '@/shared/lib/rbac'
import { can, type Role } from '@/shared/lib/rbac-core'

/**
 * GET /api/estoque/materiais/next-codigo?prefixo=EL
 *
 * Returns the next available material code for a given 2-letter prefix.
 * Format: AA-00000 (e.g. EL-00014)
 * Finds the highest existing code for that prefix and increments by 1.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request)
  if (!can(user.role as Role, 'estoque', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const prefixo = searchParams.get('prefixo')?.toUpperCase()

  if (!prefixo || !/^[A-Z]{2}$/.test(prefixo)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'Prefixo deve ter exatamente 2 letras (ex: EL, PL)', success: false },
      { status: 400 }
    )
  }

  // Find the highest sequential number for this prefix
  const last = await prisma.material.findFirst({
    where: {
      codigo: { startsWith: `${prefixo}-` },
    },
    orderBy: { codigo: 'desc' },
    select: { codigo: true },
  })

  let nextNum = 1
  if (last) {
    const parts = last.codigo.split('-')
    const lastNum = parseInt(parts[1] ?? '0', 10)
    if (!isNaN(lastNum)) nextNum = lastNum + 1
  }

  const nextCodigo = `${prefixo}-${String(nextNum).padStart(5, '0')}`

  // Double-check it's not already taken (race condition safety)
  const conflict = await prisma.material.findUnique({ where: { codigo: nextCodigo } })
  if (conflict) {
    // Scan forward to find a free slot
    let attempt = nextNum + 1
    let free = `${prefixo}-${String(attempt).padStart(5, '0')}`
    while (await prisma.material.findUnique({ where: { codigo: free } })) {
      attempt++
      free = `${prefixo}-${String(attempt).padStart(5, '0')}`
    }
    return NextResponse.json({ data: { codigo: free }, success: true })
  }

  return NextResponse.json({ data: { codigo: nextCodigo }, success: true })
})
