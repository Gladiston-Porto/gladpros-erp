const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const repoRoot = path.resolve(__dirname, '..')
const envPath = path.join(repoRoot, '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found at', envPath)
  process.exit(1)
}
const txt = fs.readFileSync(envPath, 'utf8')
function get(k) {
  const re = new RegExp('^' + k + '=(?:"([\s\S]*)"|' + "'([\\s\\S]*)'" + '|([^#\n]*))', 'im')
  const mm = txt.match(re)
  return mm ? (mm[1] || mm[2] || mm[3] || '') : ''
}

function toFp(b64) {
  try {
    const b = Buffer.from(b64, 'base64')
    return { len: b.length, fp: crypto.createHash('sha256').update(b).digest('base64') }
  } catch (e) {
    return null
  }
}

const primary = get('CLIENT_DOC_ENCRYPTION_KEY_BASE64')
const fallbacks = get('CLIENT_DOC_ENCRYPTION_KEY_FALLBACKS')
console.log('env path:', envPath)
console.log('primary:', toFp(primary))
if (fallbacks) console.log('fallbacks:', fallbacks.split(',').map(s => toFp(s.trim())))
else console.log('fallbacks: none')
