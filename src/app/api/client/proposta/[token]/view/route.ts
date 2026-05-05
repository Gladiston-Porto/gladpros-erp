import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEDUP_WINDOW_MS = 30 * 60 * 1000 // 30 minutes

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') ?? undefined

    const proposta = await prisma.proposta.findFirst({
      where: { tokenPublico: token, deletedAt: null },
      select: { id: true },
    })

    if (!proposta) {
      return NextResponse.json({ success: false }, { status: 404 })
    }

    // Dedup: skip if same IP viewed this proposal in the last 30 min
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS)
    const recent = await prisma.propostaView.findFirst({
      where: {
        propostaId: proposta.id,
        ip,
        viewedAt: { gte: cutoff },
      },
      select: { id: true },
    })

    if (recent) {
      return NextResponse.json({ success: true, counted: false })
    }

    const now = new Date()

    await prisma.$transaction([
      prisma.propostaView.create({
        data: { propostaId: proposta.id, ip, userAgent, viewedAt: now },
      }),
      prisma.proposta.update({
        where: { id: proposta.id },
        data: {
          visualizacoes: { increment: 1 },
          ultimaVisualizacaoEm: now,
          primeiraVisualizacaoEm: undefined, // handled below via upsert pattern
        },
      }),
    ])

    // Set primeiraVisualizacaoEm only if null
    await prisma.proposta.updateMany({
      where: { id: proposta.id, primeiraVisualizacaoEm: null },
      data: { primeiraVisualizacaoEm: now },
    })

    return NextResponse.json({ success: true, counted: true })
  } catch (error) {
    // Error is surfaced to client via 500 response — no console needed
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
