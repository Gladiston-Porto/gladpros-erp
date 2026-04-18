const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

function getKeysFromEnv() {
  const primaryB64 = process.env.CLIENT_DOC_ENCRYPTION_KEY_BASE64
  if (!primaryB64) throw new Error('Missing CLIENT_DOC_ENCRYPTION_KEY_BASE64 in env')
  const primary = Buffer.from(primaryB64, 'base64')
  if (primary.length !== 32) throw new Error('Primary key must decode to 32 bytes')
  const fallbacks = (process.env.CLIENT_DOC_ENCRYPTION_KEY_FALLBACKS || '').split(',').map(s => s.trim()).filter(Boolean).map(s => Buffer.from(s, 'base64')).filter(b => b.length === 32)
  return [primary, ...fallbacks]
}

function decryptWithKeys(payloadB64, keys) {
  const buf = Buffer.from(payloadB64, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      const dec = Buffer.concat([decipher.update(data), decipher.final()])
      return dec.toString('utf8')
    } catch (e) {
      // try next
    }
  }
  throw new Error('DECRYPT_FAILED')
}

(async () => {
  try {
    const keys = getKeysFromEnv()
    const prisma = new PrismaClient()
    const rows = await prisma.cliente.findMany({ take: 50, select: { id: true, documentoEnc: true, docLast4: true, docHash: true } })
    const results = []
    for (const r of rows) {
      if (!r.documentoEnc) { results.push({ id: r.id, ok: true }); continue }
      try {
        decryptWithKeys(r.documentoEnc, keys)
        results.push({ id: r.id, ok: true })
      } catch (e) {
        results.push({ id: r.id, ok: false, error: e.message })
      }
    }
    console.log('Sample decrypt failures:', results.filter(r => !r.ok))
    await prisma.$disconnect()
  } catch (e) {
    console.error(e)
  }
})()
