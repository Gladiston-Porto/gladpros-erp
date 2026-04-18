/**
 * Key Manager - Core do KMS (Key Management System)
 * 
 * Implementa VUL-004: Key Management System
 * 
 * Responsabilidades:
 * - Gerenciamento centralizado de chaves criptográficas
 * - Versionamento de chaves
 * - Lifecycle management (ACTIVE → READ_ONLY → RETIRED → ARCHIVED)
 * - Auditoria de uso de chaves
 * - Proteção de master key
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Tipos
export type KeyType = 'JWT_SIGNING' | 'DOC_ENCRYPTION' | 'SESSION' | 'BACKUP';
export type KeyStatus = 'ACTIVE' | 'READ_ONLY' | 'RETIRED' | 'ARCHIVED';
export type KeyOperation = 'ENCRYPT' | 'DECRYPT' | 'SIGN' | 'VERIFY' | 'DERIVE' | 'ROTATE';

export interface ManagedKey {
  id: number;
  type: KeyType;
  version: number;
  key: Buffer; // Chave decriptada (ephemeral - só em memória)
  fingerprint: string;
  algorithm: string;
  keyLength: number;
  status: KeyStatus;
  createdAt: Date;
  expiresAt?: Date;
}

export interface KeyUsageContext {
  operation: KeyOperation;
  entityType?: string;
  entityId?: number;
  userId?: number;
  ip?: string;
  userAgent?: string;
}

/**
 * Cache em memória de chaves ativas (evita hits constantes ao banco)
 * Chaves são re-validadas a cada 5 minutos
 */
const keyCache = new Map<string, { key: ManagedKey; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtém e valida a master key do ambiente
 * 
 * A master key é usada para:
 * 1. Encriptar chaves derivadas antes de armazenar no banco
 * 2. Decriptar chaves do banco para uso
 * 3. Derivação de chaves específicas via HKDF
 * 
 * IMPORTANTE: Master key NUNCA é armazenada no banco
 */
function getMasterKey(): Buffer {
  const masterKeyB64 = process.env.KMS_MASTER_KEY;
  
  if (!masterKeyB64) {
    throw new Error(
      'KMS_MASTER_KEY not found in environment. ' +
      'Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'base64\'))"'
    );
  }
  
  const masterKey = Buffer.from(masterKeyB64, 'base64');
  
  if (masterKey.length !== 32) {
    throw new Error(
      `KMS_MASTER_KEY must be 32 bytes (256 bits). ` +
      `Got ${masterKey.length} bytes. ` +
      `Generate a new one with: node -e "console.log(crypto.randomBytes(32).toString(\'base64\'))"`
    );
  }
  
  return masterKey;
}

/**
 * Encripta uma chave com a master key antes de armazenar
 * Usa AES-256-GCM para autenticação
 */
function encryptKey(key: Buffer): string {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(key),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  // Format: iv (12 bytes) | tag (16 bytes) | encrypted data
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decripta uma chave armazenada usando a master key
 */
function decryptKey(encryptedKeyB64: string): Buffer {
  const masterKey = getMasterKey();
  const buffer = Buffer.from(encryptedKeyB64, 'base64');
  
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted;
}

/**
 * Gera fingerprint SHA-256 de uma chave para identificação
 * O fingerprint é não-reversível e seguro para armazenar/logar
 */
function generateFingerprint(key: Buffer): string {
  return crypto
    .createHash('sha256')
    .update(key)
    .digest('hex');
}

/**
 * Obtém a chave ATIVA de um tipo específico
 * 
 * Retorna a chave com status ACTIVE e version mais recente
 * Usa cache para performance
 * 
 * @param keyType - Tipo de chave (JWT_SIGNING, DOC_ENCRYPTION, etc)
 * @returns Chave gerenciada com dados decriptados
 * @throws Error se nenhuma chave ativa encontrada
 */
export async function getActiveKey(keyType: KeyType): Promise<ManagedKey> {
  const cacheKey = `${keyType}:ACTIVE`;
  const cached = keyCache.get(cacheKey);
  
  // Verificar cache
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
    return cached.key;
  }
  
  // Buscar no banco
  const record = await prisma.encryptionKey.findFirst({
    where: {
      keyType,
      status: 'ACTIVE'
    },
    orderBy: {
      version: 'desc'
    }
  });
  
  if (!record) {
    throw new Error(
      `No active ${keyType} key found. ` +
      `Initialize keys with: npm run kms:init`
    );
  }
  
  // Decriptar chave
  const key = decryptKey(record.encryptedKey);
  
  const managedKey: ManagedKey = {
    id: record.id,
    type: record.keyType as KeyType,
    version: record.version,
    key,
    fingerprint: record.fingerprint,
    algorithm: record.algorithm,
    keyLength: record.keyLength,
    status: record.status as KeyStatus,
    createdAt: record.criadoEm,
    expiresAt: record.expiraEm || undefined
  };
  
  // Atualizar cache
  keyCache.set(cacheKey, {
    key: managedKey,
    cachedAt: Date.now()
  });
  
  return managedKey;
}

/**
 * Obtém TODAS as chaves válidas de um tipo (ACTIVE + READ_ONLY)
 * 
 * Usado para decrypt de dados antigos que podem ter sido encriptados
 * com versões anteriores da chave
 * 
 * @param keyType - Tipo de chave
 * @returns Array de chaves ordenadas por version (mais recente primeiro)
 */
export async function getAllValidKeys(keyType: KeyType): Promise<ManagedKey[]> {
  const records = await prisma.encryptionKey.findMany({
    where: {
      keyType,
      status: {
        in: ['ACTIVE', 'READ_ONLY']
      }
    },
    orderBy: {
      version: 'desc'
    }
  });
  
  const result = records.map(record => ({
    id: record.id,
    type: record.keyType as KeyType,
    version: record.version,
    key: decryptKey(record.encryptedKey),
    fingerprint: record.fingerprint,
    algorithm: record.algorithm,
    keyLength: record.keyLength,
    status: record.status as KeyStatus,
    createdAt: record.criadoEm,
    expiresAt: record.expiraEm || undefined
  }));
  return result;
}

/**
 * Cria uma nova versão de chave
 * 
 * @param keyType - Tipo de chave a criar
 * @param algorithm - Algoritmo (ex: 'AES-256-GCM', 'HMAC-SHA256')
 * @param keyLength - Comprimento em bytes (ex: 32 para 256 bits)
 * @param userId - ID do usuário criando a chave
 * @param reason - Motivo da criação (ex: 'Initial setup', 'Scheduled rotation')
 * @returns Nova chave gerenciada
 */
export async function createKey(
  keyType: KeyType,
  algorithm: string,
  keyLength: number,
  userId?: number,
  reason?: string
): Promise<ManagedKey> {
  // Gerar chave aleatória
  const key = crypto.randomBytes(keyLength);
  const fingerprint = generateFingerprint(key);
  const encryptedKey = encryptKey(key);
  
  // Determinar próxima versão
  const latestKey = await prisma.encryptionKey.findFirst({
    where: { keyType },
    orderBy: { version: 'desc' }
  });
  
  const nextVersion = latestKey ? latestKey.version + 1 : 1;
  
  // Se é a primeira chave, ativar imediatamente
  // Senão, criar como READ_ONLY até rotação ser completada
  const initialStatus = nextVersion === 1 ? 'ACTIVE' : 'READ_ONLY';
  
  // Criar registro no banco
  const record = await prisma.encryptionKey.create({
    data: {
      keyType,
      version: nextVersion,
      encryptedKey,
      fingerprint,
      algorithm,
      keyLength,
      status: initialStatus,
      ativadoEm: initialStatus === 'ACTIVE' ? new Date() : null,
      expiraEm: null, // Definido durante rotação
      criadoPorUsuarioId: userId,
      motivoRotacao: reason
    }
  });
  
  // Limpar cache
  keyCache.clear();
  
  // Registrar auditoria
  await auditKeyUsage({
    keyId: record.id,
    keyVersion: record.version,
    keyType: record.keyType as KeyType,
    operation: 'DERIVE',
    success: true,
    userId,
    context: {
      operation: 'DERIVE',
      entityType: 'EncryptionKey',
      entityId: record.id,
      userId
    }
  });
  
  return {
    id: record.id,
    type: record.keyType as KeyType,
    version: record.version,
    key,
    fingerprint: record.fingerprint,
    algorithm: record.algorithm,
    keyLength: record.keyLength,
    status: record.status as KeyStatus,
    createdAt: record.criadoEm,
    expiresAt: record.expiraEm || undefined
  };
}

/**
 * Registra uso de uma chave para auditoria
 * 
 * @param params - Parâmetros do audit log
 */
export async function auditKeyUsage(params: {
  keyId: number;
  keyVersion: number;
  keyType: KeyType;
  operation: KeyOperation;
  success: boolean;
  error?: string;
  userId?: number;
  context?: KeyUsageContext;
}): Promise<void> {
  try {
    await prisma.keyUsageAudit.create({
      data: {
        keyId: params.keyId,
        keyVersion: params.keyVersion,
        keyType: params.keyType,
        operacao: params.operation,
        tipoEntidade: params.context?.entityType,
        entidadeId: params.context?.entityId,
        sucesso: params.success,
        mensagemErro: params.error,
        usuarioId: params.userId,
        ip: params.context?.ip,
        userAgent: params.context?.userAgent
      }
    });
  } catch (error) {
    // Não deixar falha de auditoria quebrar operação principal
    console.error('[KMS] Failed to audit key usage:', error);
  }
}

/**
 * Obtém estatísticas de uso de uma chave
 */
export async function getKeyStats(keyId: number) {
  const [total, successful, failed, byOperation] = await Promise.all([
    prisma.keyUsageAudit.count({ where: { keyId } }),
    prisma.keyUsageAudit.count({ where: { keyId, sucesso: true } }),
    prisma.keyUsageAudit.count({ where: { keyId, sucesso: false } }),
    prisma.keyUsageAudit.groupBy({
      by: ['operacao'],
      where: { keyId },
      _count: true
    })
  ]);
  
  return {
    total,
    successful,
    failed,
    byOperation: byOperation.map(o => ({
      operation: o.operacao,
      count: o._count
    }))
  };
}

/**
 * Limpa cache de chaves (forçar reload do banco)
 */
export function clearKeyCache(): void {
  keyCache.clear();
}

/**
 * Valida se master key está configurada corretamente
 */
export function validateMasterKey(): { valid: boolean; error?: string } {
  try {
    getMasterKey();
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
