const { PrismaClient } = require('@prisma/client')
const { decryptDoc } = require('../src/shared/lib/crypto')

(async () => {
  const prisma = new PrismaClient()
  try {
    const rows = await prisma.cliente.findMany({ take: 20, select: { id: true, documentoEnc: true, docLast4: true, docHash: true } })
    const results = []
    for (const r of rows) {
      if (!r.documentoEnc) {
        results.push({ id: r.id, ok: true })
        continue
      }
      try {
        decryptDoc(r.documentoEnc)
        results.push({ id: r.id, ok: true })
      } catch (e) {
        results.push({ id: r.id, ok: false, error: e.message })
      }
    }
    console.log('Sample decrypt check:', results)
  } catch (e) {
    console.error('error', e)
  } finally {
    await prisma.$disconnect()
  }
})()
