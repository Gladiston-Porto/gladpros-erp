/**
 * Key Derivation - Derivação de chaves usando HKDF
 * 
 * Implementa VUL-004: Key Management System
 * 
 * HKDF (HMAC-based Key Derivation Function) permite:
 * 1. Derivar múltiplas chaves de uma master key
 * 2. Cada chave derivada é única e independente
 * 3. Contexto específico garante que chaves não colidem
 * 4. Segurança criptográfica mantida
 * 
 * Referência: RFC 5869 - https://tools.ietf.org/html/rfc5869
 */

import crypto from 'crypto';
import { getActiveKey, createKey, type KeyType } from './key-manager';

function shouldDebugKms() {
  return process.env.DEBUG_KMS === '1';
}

/**
 * Deriva uma chave usando HKDF (HMAC-based Key Derivation Function)
 * 
 * @param masterKey - Chave mestre (32 bytes)
 * @param context - Contexto único para esta chave (ex: 'jwt-signing', 'doc-encryption')
 * @param salt - Salt aleatório para esta derivação
 * @param keyLength - Comprimento da chave derivada em bytes
 * @returns Chave derivada
 */
export function deriveHKDF(
  masterKey: Buffer,
  context: string,
  salt: Buffer,
  keyLength: number = 32
): Buffer {
  // HKDF-Extract: Gera PRK (Pseudorandom Key)
  const prk = crypto
    .createHmac('sha256', salt)
    .update(masterKey)
    .digest();
  
  // HKDF-Expand: Gera chave final com contexto
  const info = Buffer.from(context, 'utf8');
  const okm = crypto
    .createHmac('sha256', prk)
    .update(Buffer.concat([info, Buffer.from([0x01])]))
    .digest();
  
  return okm.subarray(0, keyLength);
}

/**
 * Gera uma chave para assinatura de JWT
 * 
 * Se versão específica não for fornecida, usa a chave ACTIVE
 * Se nenhuma chave existir, cria a primeira
 * 
 * @param version - Versão específica da chave (opcional)
 * @returns Chave para JWT signing
 */
export async function deriveJWTKey(version?: number): Promise<Buffer> {
  try {
    if (version) {
      // Buscar versão específica
      const { prisma } = await import('@/lib/prisma');
      const record = await prisma.encryptionKey.findUnique({
        where: {
          keyType_version: {
            keyType: 'JWT_SIGNING',
            version
          }
        }
      });
      
      if (!record) {
        throw new Error(`JWT key version ${version} not found`);
      }
      
      // Decriptar e retornar
      const masterKey = getMasterKeyBuffer();
      return decryptWithMaster(record.encryptedKey, masterKey);
    }
    
    // Tentar obter chave ativa
    const activeKey = await getActiveKey('JWT_SIGNING');
    return activeKey.key;
    
  } catch (error) {
    // Se não existe chave ativa, criar a primeira
    if (error instanceof Error && error.message.includes('No active')) {
      if (shouldDebugKms()) {
        console.log('[KMS] No JWT key found, creating initial key...');
      }
      
      const newKey = await createKey(
        'JWT_SIGNING',
        'HMAC-SHA256',
        32,
        undefined,
        'Initial setup'
      );
      
      return newKey.key;
    }
    
    throw error;
  }
}

/**
 * Gera uma chave para encriptação de documentos
 * 
 * @param version - Versão específica da chave (opcional)
 * @returns Chave para document encryption
 */
export async function deriveDocKey(version?: number): Promise<Buffer> {
  try {
    if (version) {
      const { prisma } = await import('@/lib/prisma');
      const record = await prisma.encryptionKey.findUnique({
        where: {
          keyType_version: {
            keyType: 'DOC_ENCRYPTION',
            version
          }
        }
      });
      
      if (!record) {
        throw new Error(`Doc encryption key version ${version} not found`);
      }
      
      const masterKey = getMasterKeyBuffer();
      return decryptWithMaster(record.encryptedKey, masterKey);
    }
    
    const activeKey = await getActiveKey('DOC_ENCRYPTION');
    return activeKey.key;
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('No active')) {
      if (shouldDebugKms()) {
        console.log('[KMS] No DOC_ENCRYPTION key found, creating initial key...');
      }
      
      const newKey = await createKey(
        'DOC_ENCRYPTION',
        'AES-256-GCM',
        32,
        undefined,
        'Initial setup'
      );
      
      return newKey.key;
    }
    
    throw error;
  }
}

/**
 * Gera uma chave ephemeral para sessões
 * 
 * Chaves de sessão são derivadas on-the-fly e não são armazenadas
 * Usa timestamp atual como salt para garantir unicidade
 * 
 * @returns Chave ephemeral para sessão
 */
export async function deriveSessionKey(): Promise<Buffer> {
  const masterKey = getMasterKeyBuffer();
  const timestamp = Date.now().toString();
  const salt = crypto.createHash('sha256').update(timestamp).digest();
  
  return deriveHKDF(masterKey, 'session-encryption', salt, 32);
}

/**
 * Gera uma chave para backup/export
 * 
 * @returns Chave para backup encryption
 */
export async function deriveBackupKey(): Promise<Buffer> {
  try {
    const activeKey = await getActiveKey('BACKUP');
    return activeKey.key;
  } catch (error) {
    if (error instanceof Error && error.message.includes('No active')) {
      if (shouldDebugKms()) {
        console.log('[KMS] No BACKUP key found, creating initial key...');
      }
      
      const newKey = await createKey(
        'BACKUP',
        'AES-256-GCM',
        32,
        undefined,
        'Initial setup'
      );
      
      return newKey.key;
    }
    
    throw error;
  }
}

/**
 * Obtém master key como Buffer (helper interno)
 */
function getMasterKeyBuffer(): Buffer {
  const masterKeyB64 = process.env.KMS_MASTER_KEY;
  
  if (!masterKeyB64) {
    throw new Error('KMS_MASTER_KEY not configured');
  }
  
  return Buffer.from(masterKeyB64, 'base64');
}

/**
 * Decripta uma chave usando master key (helper interno)
 */
function decryptWithMaster(encryptedKeyB64: string, masterKey: Buffer): Buffer {
  const buffer = Buffer.from(encryptedKeyB64, 'base64');
  
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(tag);
  
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
}

/**
 * Inicializa todas as chaves necessárias do sistema
 * 
 * Deve ser executado no primeiro deploy ou quando chaves são perdidas
 */
export async function initializeAllKeys(userId?: number): Promise<void> {
  if (shouldDebugKms()) {
    console.log('[KMS] Initializing all system keys...');
  }
  
  const keyTypes: Array<{ type: KeyType; algorithm: string }> = [
    { type: 'JWT_SIGNING', algorithm: 'HMAC-SHA256' },
    { type: 'DOC_ENCRYPTION', algorithm: 'AES-256-GCM' },
    { type: 'BACKUP', algorithm: 'AES-256-GCM' }
  ];
  
  for (const { type, algorithm } of keyTypes) {
    try {
      await getActiveKey(type);
      if (shouldDebugKms()) {
        console.log(`[KMS] ✅ ${type} key already exists`);
      }
    } catch (error) {
      if (shouldDebugKms()) {
        console.log(`[KMS] Creating ${type} key...`);
      }
      await createKey(type, algorithm, 32, userId, 'System initialization');
      if (shouldDebugKms()) {
        console.log(`[KMS] ✅ ${type} key created`);
      }
    }
  }
  
  if (shouldDebugKms()) {
    console.log('[KMS] ✅ All keys initialized');
  }
}
