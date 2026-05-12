/**
 * Key Rotation Service
 * 
 * Implementa rotação automática de chaves com:
 * - Grace period para transição suave
 * - Re-encriptação de dados
 * - Rollback capability
 * - Notificações automáticas
 * 
 * Lifecycle de rotação:
 * 1. Nova chave criada (status: READ_ONLY)
 * 2. Chave antiga demoted para READ_ONLY
 * 3. Nova chave promoted para ACTIVE
 * 4. Grace period: ambas as chaves funcionam para decrypt
 * 5. Re-encriptação de dados antigos
 * 6. Chave antiga RETIRED
 * 7. Após período de retenção: ARCHIVED
 */

import { prisma } from '@/lib/prisma';
import { createKey, getActiveKey, clearKeyCache, auditKeyUsage, type KeyType } from './key-manager';

function shouldDebugKms() {
  return process.env.DEBUG_KMS === '1';
}

/**
 * Configuração de rotação por tipo de chave
 */
const ROTATION_CONFIG = {
  JWT_SIGNING: {
    rotationDays: 90, // Rotacionar a cada 90 dias
    graceDays: 30,    // Grace period de 30 dias
    retentionDays: 365 // Manter archived por 1 ano
  },
  DOC_ENCRYPTION: {
    rotationDays: 180, // Rotacionar a cada 6 meses
    graceDays: 60,     // Grace period maior para docs
    retentionDays: 730 // 2 anos para compliance
  },
  SESSION: {
    rotationDays: 30,  // Rotacionar mensalmente
    graceDays: 7,
    retentionDays: 90
  },
  BACKUP: {
    rotationDays: 365, // Rotacionar anualmente
    graceDays: 90,
    retentionDays: 1095 // 3 anos
  }
};

export interface RotationResult {
  success: boolean;
  oldKeyId: number;
  newKeyId: number;
  oldVersion: number;
  newVersion: number;
  message: string;
  reEncryptionNeeded: boolean;
  affectedRecords?: number;
}

/**
 * Executa rotação de chave
 * 
 * Passos:
 * 1. Validar se rotação é necessária
 * 2. Criar nova chave
 * 3. Demotar chave atual para READ_ONLY
 * 4. Promover nova chave para ACTIVE
 * 5. Definir expiry na chave antiga
 * 
 * @param keyType - Tipo de chave a rotacionar
 * @param reason - Motivo da rotação
 * @param userId - ID do usuário executando rotação
 * @param force - Forçar rotação mesmo se não necessário
 * @returns Resultado da rotação
 */
export async function rotateKey(
  keyType: KeyType,
  reason: string,
  userId?: number,
  force: boolean = false
): Promise<RotationResult> {
  if (shouldDebugKms()) {
     
    // eslint-disable-next-line no-console
    console.log(`[KMS Rotation] Starting rotation for ${keyType}...`);
  }
  
  // 1. Obter chave atual
  const currentKey = await getActiveKey(keyType);
   
  if (shouldDebugKms()) {
    // eslint-disable-next-line no-console
    console.log(`[KMS Rotation] Current key: v${currentKey.version}`);
  }
  
  // 2. Verificar se rotação é necessária (a menos que forçada)
  if (!force) {
    const needsRotation = await checkIfRotationNeeded(keyType, currentKey.id);
    if (!needsRotation) {
      return {
        success: false,
        oldKeyId: currentKey.id,
        newKeyId: currentKey.id,
        oldVersion: currentKey.version,
        newVersion: currentKey.version,
        message: 'Rotation not needed yet',
        reEncryptionNeeded: false
      };
    }
  }
  
   
  // 3. Criar nova chave
  if (shouldDebugKms()) {
    // eslint-disable-next-line no-console
    console.log(`[KMS Rotation] Creating new key version...`);
  }
  const newKey = await createKey(
    keyType,
    currentKey.algorithm,
    currentKey.keyLength,
    userId,
     
    reason
  );
  if (shouldDebugKms()) {
    // eslint-disable-next-line no-console
    console.log(`[KMS Rotation] New key created: v${newKey.version}`);
  }
  
  // 4. Demotar chave atual para READ_ONLY
  const config = ROTATION_CONFIG[keyType];
   
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.graceDays);
  
  if (shouldDebugKms()) {
    // eslint-disable-next-line no-console
    console.log(`[KMS Rotation] Demoting old key to READ_ONLY (expires: ${expiresAt.toISOString()})...`);
  }
  await prisma.encryptionKey.update({
    where: { id: currentKey.id },
    data: {
      status: 'READ_ONLY',
      expiraEm: expiresAt,
      retiradoEm: null
     
    }
  });
  
  // 5. Promover nova chave para ACTIVE
  if (shouldDebugKms()) {
    // eslint-disable-next-line no-console
    console.log(`[KMS Rotation] Promoting new key to ACTIVE...`);
  }
  await prisma.encryptionKey.update({
    where: { id: newKey.id },
    data: {
      status: 'ACTIVE',
      ativadoEm: new Date()
    }
  });
  
  // 6. Limpar cache
  clearKeyCache();
  
  // 7. Auditar rotação
  await auditKeyUsage({
    keyId: newKey.id,
    keyVersion: newKey.version,
    keyType: newKey.type,
    operation: 'ROTATE',
    success: true,
    userId,
    context: {
      operation: 'ROTATE',
      entityType: 'EncryptionKey',
       
      entityId: currentKey.id,
      userId
    }
  });
  
  if (shouldDebugKms()) {
    // eslint-disable-next-line no-console
    console.log(`[KMS Rotation] ✅ Rotation complete: v${currentKey.version} → v${newKey.version}`);
  }
  
  // 8. Verificar se há dados para re-encriptar
  const needsReEncryption = await checkReEncryptionNeeded(keyType, currentKey.version);
  
  return {
    success: true,
    oldKeyId: currentKey.id,
    newKeyId: newKey.id,
    oldVersion: currentKey.version,
    newVersion: newKey.version,
    message: `Successfully rotated ${keyType} from v${currentKey.version} to v${newKey.version}`,
    reEncryptionNeeded: needsReEncryption
  };
}

/**
 * Verifica se uma chave precisa de rotação
 * 
 * Critérios:
 * - Idade da chave > rotationDays
 * - Chave próxima da expiração
 * - Uso excessivo (mais de 1 milhão de operações)
 */
async function checkIfRotationNeeded(
  keyType: KeyType,
  keyId: number
): Promise<boolean> {
  const key = await prisma.encryptionKey.findUnique({
    where: { id: keyId }
  });
  
  if (!key || !key.ativadoEm) return false;
  
  const config = ROTATION_CONFIG[keyType];
   
  const daysSinceActivation = Math.floor(
    (Date.now() - key.ativadoEm.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Verificar idade
  if (daysSinceActivation >= config.rotationDays) {
    if (shouldDebugKms()) {
      // eslint-disable-next-line no-console
      console.log(`[KMS Rotation] Key is ${daysSinceActivation} days old (threshold: ${config.rotationDays})`);
    }
    return true;
  }
  
 
  
  // Verificar uso excessivo
  const usageCount = await prisma.keyUsageAudit.count({
    where: { keyId, sucesso: true }
  });
  
  if (usageCount >= 1_000_000) {
    if (shouldDebugKms()) {
      // eslint-disable-next-line no-console
      console.log(`[KMS Rotation] Key has ${usageCount} operations (threshold: 1M)`);
    }
    return true;
  }
  
  return false;
 
}

/**
 * Verifica se há dados que precisam ser re-encriptados
 *
 * Implementação específica por tipo de chave
 */
async function checkReEncryptionNeeded(
  keyType: KeyType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  oldVersion: number
): Promise<boolean> {
  // Para DOC_ENCRYPTION, verificar se há clientes com dados encriptados
  if (keyType === 'DOC_ENCRYPTION') {
    const count = await prisma.cliente.count({ where: { documentoEnc: { not: null } } });
    return count > 0;
  }

  // JWT_SIGNING não precisa re-encriptar (tokens expiram)
  if (keyType === 'JWT_SIGNING') {
    return false;
  }

  return false;
}

/**
 * Re-encripta dados usando nova chave.
 *
 * LIMITAÇÃO CONHECIDA: A re-encriptação automática ainda não está implementada.
 *
 * Pré-requisitos para implementar:
 * 1. Adicionar campo `encKeyVersion Int?` em `Cliente` e `WorkerFinancialProfile` via migration
 * 2. Atualizar o formato de criptografia em `src/lib/crypto/sensitive-data.ts` para embutir
 *    o keyVersion no ciphertext (ex: `v{version}:{iv}:{authTag}:{ciphertext}`)
 * 3. Popular `encKeyVersion` em todos os registros existentes com a versão atual
 * 4. Implementar a rotação em lotes abaixo buscando por `encKeyVersion = oldVersion`
 *
 * Enquanto não implementado:
 * - A rotação de chave KMS funciona (nova chave gerada e ativada)
 * - Documentos existentes continuam decriptáveis (chave antiga permanece em status RETIRED)
 * - Novos documentos são encriptados com a nova chave via ENCRYPTION_KEY env var
 *
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 * @param keyType - Tipo de chave
 * @param oldVersion - Versão antiga
 * @param newVersion - Versão nova
 * @param batchSize - Tamanho do lote
 * @returns Número de registros re-encriptados (0 até implementação completa)
 */
export async function reEncryptData(
  keyType: KeyType,
  oldVersion: number,
  newVersion: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  batchSize: number = 100
): Promise<number> {
  if (keyType !== 'DOC_ENCRYPTION') {
    return 0;
  }

  // Re-encriptação automática pendente — ver comentário da função acima.
  // Retorna 0 para não bloquear a rotação de chave.
  console.warn(
    `[KMS Re-encryption] ATENÇÃO: re-encriptação automática pendente para ${keyType} ` +
    `v${oldVersion}→v${newVersion}. Documentos existentes usam chave RETIRED. ` +
    `Consulte docs/security/VUL-004-CONCLUSAO-FINAL.md para o plano de implementação.`
  );

   
  return 0;
}

/**
 * Retira chaves expiradas (move para RETIRED)
 * 
 * Deve ser executado periodicamente (cron job diário)
 * 
 * @returns Número de chaves retiradas
 */
export async function retireExpiredKeys(): Promise<number> {
  // eslint-disable-next-line no-console
  console.log('[KMS Cleanup] Retiring expired keys...');
  
  const result = await prisma.encryptionKey.updateMany({
     
    where: {
      status: 'READ_ONLY',
      expiraEm: {
        lt: new Date()
      }
    },
    data: {
      status: 'RETIRED',
      retiradoEm: new Date()
    }
  });
  
   
  // eslint-disable-next-line no-console
  console.log(`[KMS Cleanup] ✅ Retired ${result.count} keys`);
  return result.count;
}

/**
 * Arquiva chaves antigas (move para ARCHIVED)
 * 
 * Chaves RETIRED há mais de retentionDays são arquivadas
 * 
 * @returns Número de chaves arquivadas
 */
export async function archiveOldKeys(): Promise<number> {
  // eslint-disable-next-line no-console
  console.log('[KMS Cleanup] Archiving old retired keys...');
  
  let totalArchived = 0;
  
  for (const [keyType, config] of Object.entries(ROTATION_CONFIG)) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - config.retentionDays);
    
    const result = await prisma.encryptionKey.updateMany({
      where: {
         
        keyType: keyType as KeyType,
        status: 'RETIRED',
        retiradoEm: {
          lt: thresholdDate
         
        }
      },
      data: {
        status: 'ARCHIVED'
      }
    });
    
    totalArchived += result.count;
    
    if (result.count > 0) {
      // eslint-disable-next-line no-console
      console.log(`[KMS Cleanup] Archived ${result.count} ${keyType} keys`);
    }
  }
  
  // eslint-disable-next-line no-console
  console.log(`[KMS Cleanup] ✅ Total archived: ${totalArchived} keys`);
  return totalArchived;
}

 
/**
 * Agenda rotação automática de todas as chaves
 * 
 * Verifica todas as chaves e rotaciona as que precisam
 * Deve ser executado diariamente via cron job
 * 
 * @param userId - ID do usuário (sistema) executando
 * @returns Resumo das rotações
 */
export async function scheduleAutomaticRotations(
  userId?: number
): Promise<{
  rotated: string[];
  skipped: string[];
  errors: Array<{ keyType: string; error: string }>;
}> {
  // eslint-disable-next-line no-console
  console.log('[KMS Auto-Rotation] Starting automatic rotation check...');
  
   
  const rotated: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ keyType: string; error: string }> = [];
  
 
  
  const keyTypes: KeyType[] = ['JWT_SIGNING', 'DOC_ENCRYPTION', 'SESSION', 'BACKUP'];
  
  for (const keyType of keyTypes) {
    try {
      const result = await rotateKey(
        keyType,
        'Automatic scheduled rotation',
        userId,
         
        false // Não forçar - só rotacionar se necessário
       
      );
      
 
      
       
      if (result.success) {
        rotated.push(keyType);
        // eslint-disable-next-line no-console
        console.log(`[KMS Auto-Rotation] ✅ ${keyType}: v${result.oldVersion} → v${result.newVersion}`);
      } else {
        skipped.push(keyType);
        // eslint-disable-next-line no-console
        console.log(`[KMS Auto-Rotation] ⏭️ ${keyType}: ${result.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ keyType, error: errorMessage });
      console.error(`[KMS Auto-Rotation] ❌ ${keyType}: ${errorMessage}`);
    }
  }
  
  // eslint-disable-next-line no-console
  console.log('[KMS Auto-Rotation] ✅ Complete');
  // eslint-disable-next-line no-console
  console.log(`  Rotated: ${rotated.length}`);
   
  // eslint-disable-next-line no-console
  console.log(`  Skipped: ${skipped.length}`);
  // eslint-disable-next-line no-console
  console.log(`  Errors: ${errors.length}`);
  
  return { rotated, skipped, errors };
}

/**
 * Executa manutenção completa do KMS
 * 
 * - Retire expired keys
 * - Archive old keys
 * - Check for automatic rotations
 * - Cleanup audit logs
 * 
 * Deve ser executado diariamente
 */
export async function performMaintenance(userId?: number): Promise<{
  retired: number;
  archived: number;
  rotationResult: Awaited<ReturnType<typeof scheduleAutomaticRotations>>;
  auditCleaned: number;
}> {
   
   
  // eslint-disable-next-line no-console
  console.log('[KMS Maintenance] Starting daily maintenance...');
  
 
  
   
  // 1. Retire expired keys
  const retired = await retireExpiredKeys();
  
  // 2. Archive old keys
  const archived = await archiveOldKeys();
  
  // 3. Check automatic rotations
  const rotationResult = await scheduleAutomaticRotations(userId);
  
  // 4. Cleanup old audit logs (keep last 1 year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const auditResult = await prisma.keyUsageAudit.deleteMany({
    where: {
      timestamp: {
        lt: oneYearAgo
      }
    }
  });
  
  // eslint-disable-next-line no-console
  console.log(`[KMS Maintenance] ✅ Complete`);
  // eslint-disable-next-line no-console
  console.log(`  Retired: ${retired}`);
  // eslint-disable-next-line no-console
  console.log(`  Archived: ${archived}`);
  // eslint-disable-next-line no-console
  console.log(`  Audit cleaned: ${auditResult.count}`);
  
  return {
    retired,
    archived,
    rotationResult,
    auditCleaned: auditResult.count
  };
}
