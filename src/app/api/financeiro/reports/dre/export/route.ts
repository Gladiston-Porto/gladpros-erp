// GET /api/financeiro/reports/dre/export?startDate=...&endDate=...
// Returns CSV of revenues and expenses for the period

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/shared/lib/rbac'
import { can, type Role } from '@/shared/lib/rbac-core'

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)
    if (!can(user.role as Role, 'financeiro', 'read')) {
      return NextResponse.json({ error: 'Forbidden', success: false }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const empresaId = 1

    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    const defaultEnd = now.toISOString().split('T')[0]

    const startDate = searchParams.get('startDate') ?? defaultStart
    const endDate = searchParams.get('endDate') ?? defaultEnd

    const periodStart = new Date(startDate)
    const periodEnd = new Date(endDate + 'T23:59:59')

    const [receitas, despesas] = await Promise.all([
      prisma.revenue.findMany({
        where: {
          empresaId,
          status: 'RECEBIDA',
          dataVencimento: { gte: periodStart, lte: periodEnd },
        },
        include: { categoria: { select: { nome: true } } },
        orderBy: { dataVencimento: 'asc' },
      }),
      prisma.expense.findMany({
        where: {
          empresaId,
          status: 'PAGA',
          dataVencimento: { gte: periodStart, lte: periodEnd },
        },
        include: { categoria: { select: { nome: true } } },
        orderBy: { dataVencimento: 'asc' },
      }),
    ])

    const rows: string[] = ['Tipo,Categoria,Descrição,Data,Valor']

    for (const r of receitas) {
      const date = new Date(r.dataVencimento).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })
      const cat = r.categoria?.nome ?? 'Sem Categoria'
      const desc = r.descricao.replace(/,/g, ';').replace(/"/g, "'")
      rows.push(`Receita,"${cat}","${desc}",${date},${Number(r.valor).toFixed(2)}`)
    }

    for (const d of despesas) {
      const date = new Date(d.dataVencimento).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })
      const cat = d.categoria?.nome ?? 'Sem Categoria'
      const desc = d.descricao.replace(/,/g, ';').replace(/"/g, "'")
      rows.push(`Despesa,"${cat}","${desc}",${date},${Number(d.valor).toFixed(2)}`)
    }

    const csv = rows.join('\n')
    const filename = `dre-${startDate}-${endDate}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }
    console.error('[DRE Export]', error)
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
