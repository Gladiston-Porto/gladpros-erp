// GET /api/financeiro/reports/balanco/export?endDate=...
// Returns CSV of simplified balance sheet

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
    const empresaId = user.empresaId

    const defaultEnd = new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') ?? defaultEnd
    const periodEnd = new Date(endDate + 'T23:59:59')

    const [contas, receitasAReceber, despesasAPagar] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { empresaId, ativo: true },
        orderBy: [{ principal: 'desc' }, { nome: 'asc' }],
      }),
      prisma.revenue.findMany({
        where: {
          empresaId,
          status: { in: ['PENDENTE', 'VENCIDA'] },
          dataVencimento: { lte: periodEnd },
        },
        include: { cliente: { select: { nomeFantasia: true, razaoSocial: true } } },
      }),
      prisma.expense.findMany({
        where: {
          empresaId,
          status: { in: ['PENDENTE', 'AGUARDANDO_APROVACAO', 'APROVADA'] },
          dataVencimento: { lte: periodEnd },
        },
        include: { categoria: { select: { nome: true } } },
      }),
    ])

    const rows: string[] = [`Balanço Patrimonial — Data de referência: ${endDate}`, '', 'Grupo,Item,Valor']

    // Ativo
    for (const c of contas) {
      rows.push(`Ativo — Caixa e Bancos,"${c.nome} (${c.banco})",${Number(c.saldoAtual).toFixed(2)}`)
    }

    for (const r of receitasAReceber) {
      const nome = r.cliente?.nomeFantasia ?? r.cliente?.razaoSocial ?? 'Sem cliente'
      const desc = r.descricao.replace(/,/g, ';')
      rows.push(`Ativo — Contas a Receber,"${desc} — ${nome}",${Number(r.valor).toFixed(2)}`)
    }

    rows.push('')

    // Passivo
    for (const d of despesasAPagar) {
      const cat = d.categoria?.nome ?? 'Sem Categoria'
      const desc = d.descricao.replace(/,/g, ';')
      rows.push(`Passivo — Contas a Pagar,"${desc} (${cat})",${Number(d.valor).toFixed(2)}`)
    }

    const csv = rows.join('\n')
    const filename = `balanco-${endDate}.csv`

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
    console.error('[Balanço Export]', error)
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
