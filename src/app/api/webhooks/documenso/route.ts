import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import {
  verifyWebhookSignature,
  type DocumensoWebhookPayload,
} from '@/lib/documenso'

/**
 * POST /api/webhooks/documenso
 * Receives events from Documenso (document.completed, document.expired, etc.)
 * Registered at: Documenso Dashboard > Settings > Webhooks
 * No auth — secured by HMAC-SHA256 signature verification.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signatureHeader =
    request.headers.get('x-documenso-signature') ??
    request.headers.get('x-webhook-signature') ??
    null

  if (!(await verifyWebhookSignature(rawBody, signatureHeader))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: DocumensoWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, payload: doc } = payload

  // Find proposta by Documenso document ID
  const proposta = await prisma.proposta.findFirst({
    where: { documensoDocumentId: String(doc.id), deletedAt: null },
    select: { id: true, status: true, assinadaEm: true },
  })

  if (!proposta) {
    // Unknown document — acknowledge but don't process
    return NextResponse.json({ received: true })
  }

  switch (event) {
    case 'document.completed': {
      // Guard: do not downgrade APROVADA or re-process CANCELADA proposals
      if (proposta.status === 'APROVADA' || proposta.status === 'CANCELADA') {
        return NextResponse.json({ received: true })
      }
      await prisma.$transaction(async (tx) => {
        await tx.proposta.update({
          where: { id: proposta.id },
          data: {
            documensoStatus: 'COMPLETED',
            status: 'ASSINADA',
            // Preserve existing assinadaEm if already set (idempotent)
            assinadaEm: proposta.assinadaEm ?? (doc.completedAt ? new Date(doc.completedAt) : new Date()),
            atualizadoEm: new Date(),
          },
        })

        await tx.propostaLog.create({
          data: {
            id: randomUUID(),
            propostaId: proposta.id,
            actorId: 0,
            action: 'SIGNED',
            newJson: JSON.stringify({
              documentId: doc.id,
              completedAt: doc.completedAt,
            }),
            ip: 'webhook',
            userAgent: 'documenso-webhook',
          },
        })
      })
      break
    }

    case 'document.expired': {
      await prisma.proposta.update({
        where: { id: proposta.id },
        data: { documensoStatus: 'EXPIRED', atualizadoEm: new Date() },
      })
      await prisma.propostaLog.create({
        data: {
          id: randomUUID(),
          propostaId: proposta.id,
          actorId: 0,
          action: 'CANCELLED',
          newJson: JSON.stringify({ documentId: doc.id }),
          ip: 'webhook',
          userAgent: 'documenso-webhook',
        },
      }).catch(() => {})
      break
    }

    case 'document.cancelled': {
      await prisma.proposta.update({
        where: { id: proposta.id },
        data: { documensoStatus: 'CANCELLED', atualizadoEm: new Date() },
      })
      break
    }

    default:
      // Other events (document.sent, recipient.signed) — acknowledge silently
      break
  }

  return NextResponse.json({ received: true })
}
