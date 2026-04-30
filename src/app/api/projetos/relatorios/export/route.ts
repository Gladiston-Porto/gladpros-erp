/**
 * GET /api/projetos/relatorios/export
 * Exporta dados de projetos em formato CSV.
 * Requer permissão de leitura em projetos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/shared/lib/rbac'
import { can, type Role } from '@/shared/lib/rbac-core'
import { withErrorHandler } from '@/lib/api/error-handler'
import { apiRateLimit } from '@/shared/lib/rate-limit'

export const runtime = 'nodejs'

const STATUS_LABELS: Record<string, string> = {
  planejado: 'Planejado',
  em_execucao: 'Em Execução',
  em_inspecao: 'Em Inspeção',
  aguardando_devolucoes: 'Ag. Devoluções',
  concluido: 'Concluído',
  arquivado: 'Arquivado',
  suspenso: 'Suspenso',
  cancelado: 'Cancelado',
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const rateCheck = await apiRateLimit.isAllowed(request)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: rateCheck.message, success: false },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
    )
  }

  const user = await requireUser(request)
  if (!can(user.role as Role, 'projetos', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 }
    )
  }

  const projetos = await prisma.projeto.findMany({
    select: {
      numeroProjeto: true,
      titulo: true,
      status: true,
      valorEstimado: true,
      custoPrevisto: true,
      custoReal: true,
      dataInicioPrevista: true,
      dataConclusaoPrevista: true,
      dataConclusaoReal: true,
      localidade: true,
      Cliente: { select: { nomeCompleto: true, nomeFantasia: true } },
      Responsavel: { select: { nomeCompleto: true } },
    },
    orderBy: { criadoEm: 'desc' },
    take: 5000,
  })

  const headers = [
    'Número',
    'Título',
    'Status',
    'Cliente',
    'Responsável',
    'Valor Estimado (USD)',
    'Custo Previsto (USD)',
    'Custo Real (USD)',
    'Início Previsto',
    'Conclusão Prevista',
    'Conclusão Real',
    'Localidade',
  ]

  const rows = projetos.map((p) => [
    escapeCsv(p.numeroProjeto),
    escapeCsv(p.titulo),
    escapeCsv(STATUS_LABELS[p.status] ?? p.status),
    escapeCsv(p.Cliente?.nomeFantasia ?? p.Cliente?.nomeCompleto),
    escapeCsv(p.Responsavel?.nomeCompleto),
    escapeCsv(p.valorEstimado?.toNumber() ?? 0),
    escapeCsv(p.custoPrevisto?.toNumber() ?? 0),
    escapeCsv(p.custoReal?.toNumber() ?? 0),
    escapeCsv(formatDate(p.dataInicioPrevista)),
    escapeCsv(formatDate(p.dataConclusaoPrevista)),
    escapeCsv(formatDate(p.dataConclusaoReal)),
    escapeCsv(p.localidade),
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replace(/\//g, '-')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="projetos-${dateStr}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
})
