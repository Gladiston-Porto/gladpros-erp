/**
 * Documenso API client — eSignature for proposals
 * Free tier: 5 documents/month. Account: https://documenso.com
 *
 * API reference: https://app.documenso.com/api/v1 (OpenAPI)
 */

import { createHmac } from 'crypto'

const DOCUMENSO_API_URL = process.env.DOCUMENSO_API_URL ?? 'https://app.documenso.com/api/v2'
const DOCUMENSO_API_TOKEN = process.env.DOCUMENSO_API_TOKEN ?? ''
const DOCUMENSO_WEBHOOK_SECRET = process.env.DOCUMENSO_WEBHOOK_SECRET ?? ''

function headers() {
  return {
    Authorization: `Bearer ${DOCUMENSO_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type DocumensoDocumentStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'

export interface DocumensoRecipient {
  id: number
  email: string
  name: string
  role: 'SIGNER' | 'CC' | 'VIEWER'
  signingUrl?: string
  signedAt?: string
  status: 'PENDING' | 'OPENED' | 'SIGNED' | 'REJECTED'
}

export interface DocumensoDocument {
  id: number
  externalId?: string
  title: string
  status: DocumensoDocumentStatus
  recipients: DocumensoRecipient[]
  createdAt: string
  completedAt?: string
}

export interface CreateDocumentParams {
  /** Proposal title to show on the document */
  title: string
  /** Client email address */
  recipientEmail: string
  /** Client full name */
  recipientName: string
  /** Base64-encoded PDF content */
  pdfBase64: string
  /** Internal reference (proposal ID) stored in externalId */
  externalId: string
  /** Redirect URL after signing */
  redirectUrl?: string
}

// ─── API calls ───────────────────────────────────────────────────────────────

/**
 * Creates a document in Documenso with a single signer recipient.
 * Returns the document ID and the recipient's signing URL.
 */
export async function createDocument(
  params: CreateDocumentParams
): Promise<{ documentId: number; signingUrl: string | null }> {
  if (!DOCUMENSO_API_TOKEN) {
    throw new Error('DOCUMENSO_API_TOKEN not configured')
  }

  const body = {
    title: params.title,
    externalId: params.externalId,
    recipients: [
      {
        email: params.recipientEmail,
        name: params.recipientName,
        role: 'SIGNER',
      },
    ],
    // Send PDF as base64 data URI
    documentDataId: undefined as string | undefined,
  }

  // Step 1: upload the PDF to get a documentDataId
  const uploadRes = await fetch(`${DOCUMENSO_API_URL}/documents/upload`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      fileName: `${params.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
      contentType: 'application/pdf',
      // Documenso expects base64-encoded file content
      content: params.pdfBase64,
    }),
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Documenso upload failed (${uploadRes.status}): ${err}`)
  }

  const uploadData = await uploadRes.json()
  body.documentDataId = uploadData.id as string

  // Step 2: create the document
  const createRes = await fetch(`${DOCUMENSO_API_URL}/documents`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Documenso createDocument failed (${createRes.status}): ${err}`)
  }

  const doc: DocumensoDocument = await createRes.json()

  const signingUrl =
    doc.recipients?.find((r) => r.role === 'SIGNER')?.signingUrl ?? null

  return { documentId: doc.id, signingUrl }
}

/**
 * Sends a document for signing (triggers Documenso to email the recipient).
 */
export async function sendDocumentForSigning(documentId: number): Promise<void> {
  if (!DOCUMENSO_API_TOKEN) {
    throw new Error('DOCUMENSO_API_TOKEN not configured')
  }

  const res = await fetch(`${DOCUMENSO_API_URL}/documents/${documentId}/send`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Documenso sendDocument failed (${res.status}): ${err}`)
  }
}

/**
 * Retrieves the signing URL for a recipient of a document.
 * Returns null if the document is already completed/cancelled.
 */
export async function getSigningUrl(documentId: number): Promise<string | null> {
  if (!DOCUMENSO_API_TOKEN) {
    throw new Error('DOCUMENSO_API_TOKEN not configured')
  }

  const res = await fetch(`${DOCUMENSO_API_URL}/documents/${documentId}`, {
    headers: headers(),
  })

  if (!res.ok) return null

  const doc: DocumensoDocument = await res.json()

  if (doc.status === 'COMPLETED' || doc.status === 'CANCELLED') return null

  return doc.recipients?.find((r) => r.role === 'SIGNER')?.signingUrl ?? null
}

/**
 * Gets the full document status from Documenso.
 */
export async function getDocument(
  documentId: number
): Promise<DocumensoDocument | null> {
  if (!DOCUMENSO_API_TOKEN) return null

  const res = await fetch(`${DOCUMENSO_API_URL}/documents/${documentId}`, {
    headers: headers(),
  })

  if (!res.ok) return null
  return res.json()
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export type DocumensoWebhookEvent =
  | 'document.completed'
  | 'document.expired'
  | 'document.cancelled'
  | 'document.sent'
  | 'recipient.signed'

export interface DocumensoWebhookPayload {
  event: DocumensoWebhookEvent
  payload: {
    id: number
    externalId?: string
    status: DocumensoDocumentStatus
    recipients?: DocumensoRecipient[]
    completedAt?: string
  }
  createdAt: string
  webhookEndpoint: string
}

/**
 * Verifies the HMAC-SHA256 signature from Documenso webhook headers.
 * - If DOCUMENSO_WEBHOOK_SECRET is not configured → accept (dev/test mode)
 * - If configured → verify and reject on mismatch
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  // No secret configured → allow (useful for local dev/testing)
  if (!DOCUMENSO_WEBHOOK_SECRET) return true

  // Secret configured but no signature sent → reject
  if (!signatureHeader) return false

  const expected = createHmac('sha256', DOCUMENSO_WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex')

  // Normalize: strip common prefixes like "sha256=", "HMAC 2024 ", etc.
  const received = signatureHeader
    .replace(/^sha256=/i, '')
    .replace(/^HMAC\s+\d+\s+/i, '')
    .trim()

  try {
    const { timingSafeEqual } = await import('node:crypto')
    const expectedBuf = Buffer.from(expected, 'hex')
    const receivedBuf = Buffer.from(received, 'hex')
    if (expectedBuf.length !== receivedBuf.length) return false
    return timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return expected === received
  }
}

/**
 * Returns whether Documenso is configured (API token present).
 * Used for fail-open logic in ProposalSendService.
 */
export function isDocumensoConfigured(): boolean {
  return Boolean(DOCUMENSO_API_TOKEN)
}
