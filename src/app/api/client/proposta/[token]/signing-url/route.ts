import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSigningUrl } from '@/lib/documenso'
import { validateTokenPublico } from '@/shared/lib/services/proposta-token'

/**
 * GET /api/client/proposta/[token]/signing-url
 * Public route — secured by tokenPublico (no JWT auth required).
 * Returns the Documenso signing URL for the client to sign the proposal.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const proposta = await validateTokenPublico(token)

  if (!proposta) {
    return NextResponse.json(
      { error: 'Proposta não encontrada ou token expirado' },
      { status: 404 }
    )
  }

  const full = await prisma.proposta.findUnique({
    where: { id: proposta.id },
    select: {
      status: true,
      documensoDocumentId: true,
      documensoStatus: true,
      assinaturaTipo: true,
      assinadaEm: true,
    },
  })

  if (!full) {
    return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
  }

  if (full.assinaturaTipo !== 'DOCUMENSO' || !full.documensoDocumentId) {
    return NextResponse.json(
      { error: 'Assinatura eletrônica não configurada para esta proposta' },
      { status: 404 }
    )
  }

  if (full.status === 'ASSINADA' || full.documensoStatus === 'COMPLETED') {
    return NextResponse.json({
      signed: true,
      signingUrl: null,
      signedAt: full.assinadaEm,
    })
  }

  const signingUrl = await getSigningUrl(parseInt(full.documensoDocumentId))

  return NextResponse.json({
    signed: false,
    signingUrl,
    documentStatus: full.documensoStatus,
  })
}
