#!/usr/bin/env tsx
/**
 * KMS CLI (TypeScript) - Comandos que requerem acesso ao KMS
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar .env.local primeiro
config({ path: resolve(process.cwd(), '.env.local') });

import { KMS } from '../src/lib/security/kms';

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'init':
      await initCommand();
      break;
      
    case 'rotate':
      await rotateCommand(arg);
      break;
      
    case 'maintenance':
      await maintenanceCommand();
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

async function initCommand() {
  console.log('🔐 Initializing KMS...\n');
  
  // Validar master key primeiro
  const validation = KMS.validateMasterKey();
  if (!validation.valid) {
    console.error('❌ Master key validation failed:');
    console.error(`   ${validation.error}\n`);
    process.exit(1);
  }
  
  console.log('✅ Master key validated\n');
  
  try {
    await KMS.initializeAllKeys();
    console.log('\n✅ KMS initialization complete!');
    console.log('\nRun npm run kms:status to see all keys.');
  } catch (error) {
    console.error('\n❌ Initialization failed:');
    console.error(error);
    process.exit(1);
  }
}

async function rotateCommand(keyType: string) {
  if (!keyType) {
    console.error('❌ Key type required');
    console.log('Usage: npm run kms:rotate <key-type>');
    console.log('Valid types: JWT_SIGNING, DOC_ENCRYPTION, SESSION, BACKUP');
    process.exit(1);
  }
  
  const validTypes = ['JWT_SIGNING', 'DOC_ENCRYPTION', 'SESSION', 'BACKUP'];
  if (!validTypes.includes(keyType)) {
    console.error(`❌ Invalid key type: ${keyType}`);
    console.log(`Valid types: ${validTypes.join(', ')}`);
    process.exit(1);
  }
  
  console.log(`🔄 Rotating ${keyType} key...\n`);
  
  try {
    const result = await KMS.rotateKey(
      keyType as 'JWT_SIGNING' | 'DOC_ENCRYPTION' | 'SESSION' | 'BACKUP',
      'Manual CLI rotation',
      undefined,
      true
    );
    
    if (result.success) {
      console.log(`✅ Rotation complete!`);
      console.log(`   Old version: v${result.oldVersion}`);
      console.log(`   New version: v${result.newVersion}`);
      
      if (result.reEncryptionNeeded) {
        console.log(`\n⚠️  Re-encryption needed!`);
        console.log(`   Affected records: ${result.affectedRecords || 'unknown'}`);
      }
    } else {
      console.log(`ℹ️  ${result.message}`);
    }
  } catch (error) {
    console.error('\n❌ Rotation failed:');
    console.error(error);
    process.exit(1);
  }
}

async function maintenanceCommand() {
  console.log('🔧 Running KMS maintenance...\n');
  
  try {
    const result = await KMS.performMaintenance();
    
    console.log('\n✅ Maintenance complete!');
    console.log(`   Retired keys: ${result.retired}`);
    console.log(`   Archived keys: ${result.archived}`);
    console.log(`   Rotated keys: ${result.rotationResult.rotated.length}`);
    console.log(`   Audit logs cleaned: ${result.auditCleaned}`);
    
    if (result.rotationResult.rotated.length > 0) {
      console.log(`\n🔄 Rotated keys:`);
      result.rotationResult.rotated.forEach((k: string) => console.log(`   - ${k}`));
    }
    
    if (result.rotationResult.errors.length > 0) {
      console.log(`\n⚠️  Errors during rotation:`);
      result.rotationResult.errors.forEach((e: any) => {
        console.log(`   - ${e.keyType}: ${e.error}`);
      });
    }
  } catch (error) {
    console.error('\n❌ Maintenance failed:');
    console.error(error);
    process.exit(1);
  }
}

// Execute
main().catch(error => {
  console.error('\n❌ Fatal error:');
  console.error(error);
  process.exit(1);
});
