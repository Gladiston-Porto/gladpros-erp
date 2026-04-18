/**
 * KMS (Key Management System) - VUL-004
 * 
 * Export unificado de todos os serviços do KMS
 */

// Key Manager (core)
export {
  getActiveKey,
  getAllValidKeys,
  createKey,
  auditKeyUsage,
  getKeyStats,
  clearKeyCache,
  validateMasterKey,
  type KeyType,
  type KeyStatus,
  type KeyOperation,
  type ManagedKey,
  type KeyUsageContext
} from './key-manager';

// Key Derivation
export {
  deriveHKDF,
  deriveJWTKey,
  deriveDocKey,
  deriveSessionKey,
  deriveBackupKey,
  initializeAllKeys
} from './key-derivation';

// Key Rotation
export {
  rotateKey,
  reEncryptData,
  retireExpiredKeys,
  archiveOldKeys,
  scheduleAutomaticRotations,
  performMaintenance,
  type RotationResult
} from './key-rotation';

/**
 * Namespace KMS para uso simplificado
 * 
 * Exemplo de uso:
 * ```typescript
 * import { KMS } from '@/lib/security/kms';
 * 
 * const jwtKey = await KMS.deriveJWTKey();
 * const docKey = await KMS.getActiveKey('DOC_ENCRYPTION');
 * ```
 */
import * as keyManager from './key-manager';
import * as keyDerivation from './key-derivation';
import * as keyRotation from './key-rotation';

export const KMS = {
  // Key Manager
  ...keyManager,
  // Key Derivation
  ...keyDerivation,
  // Key Rotation
  ...keyRotation
};
