// Check JWT encryption key
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const key = await prisma.encryptionKey.findFirst({
    where: { keyType: 'JWT_SIGNING', status: 'ACTIVE' }
  });

  if (!key) {
    console.error('❌ No JWT_SIGNING key found!');
    return;
  }

  console.log('=== JWT Encryption Key Info ===');
  console.log('Version:', key.version);
  console.log('Algorithm:', key.algorithm);
  console.log('Key Length:', key.keyLength);
  console.log('Status:', key.status);
  console.log('Encrypted Key (base64):', key.encryptedKey.substring(0, 32) + '...');
  console.log('Fingerprint:', key.fingerprint);
  
  // Try to decrypt with KMS_MASTER_KEY
  const kmsMasterKey = process.env.KMS_MASTER_KEY;
  console.log('\n=== Decryption Test ===');
  console.log('KMS_MASTER_KEY present:', !!kmsMasterKey);
  
  if (kmsMasterKey) {
    try {
      const masterKey = Buffer.from(kmsMasterKey, 'base64');
      console.log('Master key length:', masterKey.length, 'bytes');
      
      const buffer = Buffer.from(key.encryptedKey, 'base64');
      const iv = buffer.subarray(0, 12);
      const tag = buffer.subarray(12, 28);
      const encrypted = buffer.subarray(28);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      console.log('✅ Decryption successful!');
      console.log('Decrypted key (hex):', decrypted.toString('hex').substring(0, 32) + '...');
      console.log('Decrypted key length:', decrypted.length, 'bytes');
      
    } catch (error) {
      console.error('❌ Decryption failed:', error.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
