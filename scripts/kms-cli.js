#!/usr/bin/env node
/**
 * KMS CLI - Ferramenta de linha de comando para gerenciar o Key Management System
 * 
 * Comandos disponíveis:
 * - init: Inicializa todas as chaves do sistema
 * - rotate [key-type]: Rotaciona uma chave específica
 * - status: Mostra status de todas as chaves
 * - maintenance: Executa manutenção completa
 * - validate: Valida configuração do KMS
 */

const { execSync } = require('child_process');
const path = require('path');

// Comandos que precisam executar TypeScript
const COMMANDS_THAT_NEED_TS = ['init', 'rotate', 'maintenance'];

async function main() {
  const command = process.argv[2];
  
  if (!command) {
    printHelp();
    process.exit(0);
  }
  
  // Para comandos help e validate, executar diretamente
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  
  if (command === 'validate') {
    await validateCommand();
    return;
  }
  
  if (command === 'status') {
    await statusCommand();
    return;
  }
  
  // Para outros comandos, usar tsx
  if (COMMANDS_THAT_NEED_TS.includes(command)) {
    const tsxPath = path.join(__dirname, 'kms-cli.ts');
    try {
      execSync(`npx tsx ${tsxPath} ${process.argv.slice(2).join(' ')}`, {
        stdio: 'inherit',
        env: { ...process.env }
      });
    } catch (error) {
      process.exit(1);
    }
    return;
  }
  
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

function printHelp() {
  console.log(`
🔐 KMS CLI - Key Management System

Usage: npm run kms:<command> [options]

Commands:
  kms:init              Initialize all system keys (first-time setup)
  kms:rotate [type]     Rotate a specific key (JWT_SIGNING, DOC_ENCRYPTION, etc)
  kms:status            Show status of all keys
  kms:maintenance       Run full maintenance (retire, archive, rotate)
  kms:validate          Validate KMS configuration

Examples:
  npm run kms:init
  npm run kms:rotate JWT_SIGNING
  npm run kms:status
  npm run kms:maintenance
  npm run kms:validate

Environment:
  Requires KMS_MASTER_KEY in .env.local
  Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
`);
}

async function statusCommand() {
  require('dotenv').config({ path: '.env.local' });
  console.log('🔐 KMS Status\n');
  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const keys = await prisma.encryptionKey.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'READ_ONLY']
        }
      },
      orderBy: [
        { keyType: 'asc' },
        { version: 'desc' }
      ]
    });
    
    if (keys.length === 0) {
      console.log('ℹ️  No keys found. Run: npm run kms:init');
      await prisma.$disconnect();
      return;
    }
    
    const keysByType = keys.reduce((acc, key) => {
      if (!acc[key.keyType]) acc[key.keyType] = [];
      acc[key.keyType].push(key);
      return acc;
    }, {});
    
    for (const [keyType, typeKeys] of Object.entries(keysByType)) {
      console.log(`\n📁 ${keyType}`);
      
      for (const key of typeKeys) {
        const statusIcon = key.status === 'ACTIVE' ? '✅' : '📖';
        const age = Math.floor((Date.now() - key.criadoEm.getTime()) / (1000 * 60 * 60 * 24));
        const expiryInfo = key.expiraEm 
          ? `expires ${new Date(key.expiraEm).toLocaleDateString()}`
          : 'no expiry';
        
        console.log(`   ${statusIcon} v${key.version} - ${key.status} - ${age} days old - ${expiryInfo}`);
        console.log(`      Fingerprint: ${key.fingerprint.substring(0, 16)}...`);
      }
    }
    
    console.log('');
  } catch (error) {
    console.error('❌ Failed to fetch status:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function validateCommand() {
  require('dotenv').config({ path: '.env.local' });
  console.log('🔍 Validating KMS configuration...\n');
  
  // 1. Validar master key
  console.log('1. Checking master key...');
  const masterKey = process.env.KMS_MASTER_KEY;
  
  if (!masterKey) {
    console.log('   ❌ KMS_MASTER_KEY not found in environment');
    console.log('      Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
    console.log('      Add to .env.local: KMS_MASTER_KEY=<generated-key>');
    process.exit(1);
  }
  
  try {
    const decoded = Buffer.from(masterKey, 'base64');
    if (decoded.length !== 32) {
      console.log('   ❌ Master key must be exactly 32 bytes (256 bits)');
      console.log(`      Current length: ${decoded.length} bytes`);
      process.exit(1);
    }
    console.log('   ✅ Master key is valid (32 bytes)');
  } catch (error) {
    console.log('   ❌ Master key is not valid base64');
    console.error(error);
    process.exit(1);
  }
  
  // 2. Verificar conexão com banco
  console.log('\n2. Checking database connection...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✅ Database connection successful');
  } catch (error) {
    console.log('   ❌ Database connection failed');
    console.error(error.message);
    process.exit(1);
  }
  
  // 3. Verificar se as tabelas existem
  console.log('\n3. Checking KMS tables...');
  try {
    const keyCount = await prisma.encryptionKey.count();
    console.log(`   ✅ encryption_keys table exists (${keyCount} keys)`);
    
    if (keyCount === 0) {
      console.log('      ℹ️  No keys found. Run: npm run kms:init');
    }
  } catch (error) {
    console.log('   ❌ encryption_keys table not found');
    console.log('      Run: npm run db:migrate:deploy');
    process.exit(1);
  }
  
  try {
    const auditCount = await prisma.keyUsageAudit.count();
    console.log(`   ✅ key_usage_audit table exists (${auditCount} logs)`);
  } catch (error) {
    console.log('   ❌ key_usage_audit table not found');
    console.log('      Run: npm run db:migrate:deploy');
    process.exit(1);
  }
  
  await prisma.$disconnect();
  
  console.log('\n✅ KMS configuration is valid!');
}

// Execute
main().catch(error => {
  console.error('\n❌ Fatal error:');
  console.error(error);
  process.exit(1);
});
