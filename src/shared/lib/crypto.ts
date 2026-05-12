import crypto from "node:crypto"
import { KMS } from "@/lib/security/kms"

/**
 * Crypto Module - Integrado com KMS (VUL-004)
 * 
 * Suporta dois modos:
 * 1. KMS Mode (preferido): Chaves gerenciadas pelo Key Management System
 * 2. Legacy Mode (fallback): Chaves do ambiente (CLIENT_DOC_ENCRYPTION_KEY_BASE64)
 * 
 * Mantém compatibilidade total com documentos criptografados anteriormente
 */

// Cache para chaves KMS
let cachedDocKey: Buffer | null = null
let cachedDocKeys: Buffer[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type KMSKey = Awaited<ReturnType<typeof KMS.getAllValidKeys>>[number];

// Legacy keys (fallback se KMS não disponível)
const b64 = process.env.CLIENT_DOC_ENCRYPTION_KEY_BASE64 || ""
let CLIENT_DOC_KEY_LEGACY: Buffer | null = null

if (b64) {
  try {
    const decoded = Buffer.from(b64, "base64")
    if (decoded.length !== 32) {
      console.warn('[Crypto] CLIENT_DOC_ENCRYPTION_KEY_BASE64 must decode to 32 bytes, ignoring')
    } else {
      CLIENT_DOC_KEY_LEGACY = decoded
    }
  } catch (error) {
    console.warn('[Crypto] Failed to decode CLIENT_DOC_ENCRYPTION_KEY_BASE64:', error)
  }
}

// Optional fallback keys for rotation (comma-separated base64 strings)
const fallbacksEnv = process.env.CLIENT_DOC_ENCRYPTION_KEY_FALLBACKS || ""
const CLIENT_DOC_FALLBACK_KEYS: Buffer[] = fallbacksEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => Buffer.from(s, "base64"))
  .filter((buf) => buf.length === 32)

/**
 * Obtém a chave de documento ativa (preferência: KMS > Legacy)
 */
async function getActiveDocKey(): Promise<Buffer> {
  const now = Date.now()
  
  // Verificar cache
  if (cachedDocKey && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedDocKey
  }
  
  // Tentar KMS primeiro
  try {
    const key = await KMS.deriveDocKey()
    cachedDocKey = key
    cacheTimestamp = now
    return key
  } catch (error) {
    console.warn('[Crypto] Failed to get key from KMS, using legacy key:', error)
    
    // Fallback para legacy
    if (!CLIENT_DOC_KEY_LEGACY) {
      throw new Error(
        'No encryption key available. ' +
        'Set CLIENT_DOC_ENCRYPTION_KEY_BASE64 or initialize KMS with: npm run kms:init'
      )
    }
    
    return CLIENT_DOC_KEY_LEGACY
  }
}

/**
 * Obtém todas as chaves válidas (para decrypt de docs antigos)
 */
async function getAllDocKeys(): Promise<Buffer[]> {
  const now = Date.now()
  
  // Verificar cache
  if (cachedDocKeys && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedDocKeys
  }
  
  const keys: Buffer[] = []
  
  // Tentar obter chaves do KMS
  try {
    const kmsKeys = await KMS.getAllValidKeys('DOC_ENCRYPTION')
    keys.push(...kmsKeys.map((k) => k.key))
  } catch (error) {
    console.warn('[Crypto] Failed to get keys from KMS:', error)
  }
  
  // Adicionar legacy keys (se existirem)
  if (CLIENT_DOC_KEY_LEGACY) {
    keys.push(CLIENT_DOC_KEY_LEGACY)
  }
  keys.push(...CLIENT_DOC_FALLBACK_KEYS)
  
  // Remover duplicatas (comparando buffers)
  const uniqueKeys = keys.filter((key, index, self) => {
    return index === self.findIndex((k) => k.equals(key))
  })
  
  cachedDocKeys = uniqueKeys
  cacheTimestamp = now
  
  return uniqueKeys
}

function sha256hex(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex")
}

/**
 * Obtém fingerprint da chave ativa (para visibilidade operacional)
 */
export async function getDocKeyFingerprint(): Promise<string> {
  const key = await getActiveDocKey()
  return sha256hex(key).slice(0, 16)
}

/**
 * Obtém fingerprints de todas as chaves válidas
 */
export async function getFallbackKeyFingerprints(): Promise<string[]> {
  const keys = await getAllDocKeys()
  return keys.map((k) => sha256hex(k).slice(0, 16))
}

/**
 * Encripta um documento usando a chave ativa
 * 
 * @param plaintext - Texto a ser encriptado
 * @returns Base64 string (formato: iv|tag|data)
 */
export async function encryptDoc(plaintext: string): Promise<string> {
  const key = await getActiveDocKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  
  // Auditar uso da chave (se disponível)
  try {
    const kmsKeys = await KMS.getAllValidKeys('DOC_ENCRYPTION')
    const usedKey = kmsKeys.find((k) => k.key.equals(key))
    if (usedKey) {
      await KMS.auditKeyUsage({
        keyId: usedKey.id,
        keyVersion: usedKey.version,
        keyType: 'DOC_ENCRYPTION',
        operation: 'ENCRYPT',
        success: true,
        context: {
          operation: 'ENCRYPT',
          entityType: 'Document',
          entityId: plaintext.length // Tamanho como ID (não sensível)
        }
      }).catch(() => {}) // Não falhar se auditoria falhar
    }
  } catch {
    // Modo legacy, sem auditoria
  }
  
  return Buffer.concat([iv, tag, enc]).toString("base64") // iv|tag|data
}

/**
 * Decripta um documento usando todas as chaves válidas
 * 
 * Tenta chaves em ordem:
 * 1. Chaves do KMS (mais recente primeiro)
 * 2. Legacy key do ambiente
 * 3. Fallback keys do ambiente
 * 
 * @param payloadB64 - Base64 string (formato: iv|tag|data)
 * @returns Texto decriptado
 * @throws Error se nenhuma chave conseguir decriptar
 */
export async function decryptDoc(payloadB64: string): Promise<string> {
  const buf = Buffer.from(payloadB64, "base64")
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  
  // Obter todas as chaves válidas
  const tryKeys = await getAllDocKeys()
  
  if (tryKeys.length === 0) {
    throw new Error(
      'No encryption keys available. ' +
      'Set CLIENT_DOC_ENCRYPTION_KEY_BASE64 or initialize KMS'
    )
  }
  
  // Tentar cada chave
  let lastError: Error | null = null
  
  for (const key of tryKeys) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
      decipher.setAuthTag(tag)
      const dec = Buffer.concat([decipher.update(data), decipher.final()])
      
      // Auditar uso da chave (se disponível)
      try {
        const kmsKeys = await KMS.getAllValidKeys('DOC_ENCRYPTION')
        const usedKey = kmsKeys.find((k) => k.key.equals(key))
        if (usedKey) {
          await KMS.auditKeyUsage({
            keyId: usedKey.id,
            keyVersion: usedKey.version,
            keyType: 'DOC_ENCRYPTION',
            operation: 'DECRYPT',
            success: true,
            context: {
              operation: 'DECRYPT',
              entityType: 'Document',
              entityId: dec.length
            }
          }).catch(() => {})
        }
      } catch {
        // Modo legacy, sem auditoria
      }
      
      return dec.toString("utf8")
    } catch (error) {
      lastError = error as Error
      continue // Tentar próxima chave
    }
  }
  
  // Nenhuma chave funcionou
  throw new Error(`DECRYPT_FAILED: ${lastError?.message || 'No valid key found'}`)
}

export function normalizeDocument(doc: string) {
  return doc.replace(/[^0-9A-Za-z]/g, "").toUpperCase()
}

export function docHashHex(doc: string) {
  const norm = normalizeDocument(doc)
  return crypto.createHash("sha256").update(norm).digest("hex")
}

export function last4(doc: string) {
  return normalizeDocument(doc).slice(-4)
}