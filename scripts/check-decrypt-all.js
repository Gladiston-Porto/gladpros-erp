const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

function loadEnvFile(envPath) {
  try {
    const content = fs.readFileSync(envPath, 'utf8')
    const lines = content.split(/\r?\n/)
    const map = {}
    for (let line of lines) {
      line = line.trim()
      if (!line || line.startsWith('#')) continue
      const m = line.match(/^([A-Z0-9_]+)=(?:"([\s\S]*)"|'([\s\S]*)'|([^#\n]*))/i)
      if (m) {
        const key = m[1]
        const val = m[2] ?? m[3] ?? m[4] ?? ''
        map[key] = val
      }
    }
    return map
  } catch (e) {
    return {}
  }
}

function getKeysFromEnv(env) {
  const primaryB64 = env.CLIENT_DOC_ENCRYPTION_KEY_BASE64
  if (!primaryB64) throw new Error('Missing CLIENT_DOC_ENCRYPTION_KEY_BASE64 in env or .env.local')
  const primary = Buffer.from(primaryB64, 'base64')
  if (primary.length !== 32) throw new Error('Primary key must decode to 32 bytes')
  const fallbacks = (env.CLIENT_DOC_ENCRYPTION_KEY_FALLBACKS || '').split(',').map(s => s.trim()).filter(Boolean).map(s => Buffer.from(s, 'base64')).filter(b => b.length === 32)
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
    // Load .env.local if present
    const repoRoot = path.resolve(__dirname, '..')
    const envPath = path.join(repoRoot, '.env.local')
    const env = Object.assign({}, process.env, loadEnvFile(envPath))

    const keys = getKeysFromEnv(env)
    const prisma = new PrismaClient()

    const pageSize = Number(env.CHECK_DECRYPT_PAGE_SIZE || '500')
    let lastId = 0
    let totalScanned = 0
    let totalFailures = 0
    const failingIds = []

    while (true) {
      const rows = await prisma.cliente.findMany({
        where: { id: { gt: lastId } },
        orderBy: { id: 'asc' },
        take: pageSize,
        select: { id: true, documentoEnc: true, docLast4: true, docHash: true }
      })
      if (!rows || rows.length === 0) break

      for (const r of rows) {
        totalScanned++
        if (!r.documentoEnc) { lastId = r.id; continue }
        try {
          decryptWithKeys(r.documentoEnc, keys)
        } catch (e) {
          totalFailures++
          if (failingIds.length < 500) failingIds.push({ id: r.id, error: e.message })
        }
        lastId = r.id
      }

      // small progress log
      if (totalScanned % (pageSize * 2) === 0) console.log(`Scanned ${totalScanned} rows, failures so far: ${totalFailures}`)
    }

    console.log('=== DECRYPT SCAN RESULT ===')
    console.log('Total scanned:', totalScanned)
    console.log('Total failures:', totalFailures)
    console.log('First failing ids (up to 500):', failingIds.slice(0, 500))

    await prisma.$disconnect()
  } catch (e) {
    console.error('Error during decrypt scan:', e)
    process.exitCode = 2
  }
})()
