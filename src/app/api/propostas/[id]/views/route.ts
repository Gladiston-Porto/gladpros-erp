import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/shared/lib/rbac'
import { can, type Role } from '@/shared/lib/rbac-core'
import { withErrorHandler } from '@/lib/api/error-handler'

function maskIP(ip: string): string {
  if (ip === 'unknown') return ip
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`
  // IPv6 — keep first two groups only
  const v6parts = ip.split(':')
  return v6parts.slice(0, 2).join(':') + ':xxxx:xxxx'
}

function parseDevice(ua: string | null): string {
  if (!ua) return 'Unknown'
  const lower = ua.toLowerCase()
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) return 'Mobile'
  if (lower.includes('tablet') || lower.includes('ipad')) return 'Tablet'
  return 'Desktop'
}

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request)
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 })
  }

  const { id } = await params
  const propostaId = parseInt(id)
  if (isNaN(propostaId)) {
    return NextResponse.json({ error: 'Invalid ID', message: 'ID inválido', success: false }, { status: 400 })
  }

  const proposta = await prisma.proposta.findUnique({
    where: { id: propostaId },
    select: {
      id: true,
      visualizacoes: true,
      primeiraVisualizacaoEm: true,
      ultimaVisualizacaoEm: true,
    },
  })

  if (!proposta) {
    return NextResponse.json({ error: 'Not found', message: 'Proposta não encontrada', success: false }, { status: 404 })
  }

  const views = await prisma.propostaView.findMany({
    where: { propostaId },
    orderBy: { viewedAt: 'desc' },
    take: 50,
    select: { id: true, viewedAt: true, ip: true, userAgent: true },
  })

  return NextResponse.json({
    data: {
      visualizacoes: proposta.visualizacoes,
      primeiraVisualizacaoEm: proposta.primeiraVisualizacaoEm,
      ultimaVisualizacaoEm: proposta.ultimaVisualizacaoEm,
      views: views.map((v) => ({
        id: v.id,
        viewedAt: v.viewedAt,
        ip: maskIP(v.ip ?? 'unknown'),
        device: parseDevice(v.userAgent),
      })),
    },
    success: true,
  })
})
