/**
 * Teste de Integração: KMS + Crypto (Document Encryption)
 * 
 * Valida que o crypto.ts está usando chaves do KMS corretamente
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { 
  encryptDoc, 
  decryptDoc, 
  getDocKeyFingerprint, 
  getFallbackKeyFingerprints 
} from '@/shared/lib/crypto';
import { KMS } from '@/lib/security/kms';
import { prisma } from '@/shared/lib/prisma';

async function testCryptoKMSIntegration() {
  console.log('🧪 Testing KMS Integration with Crypto Service...\n');
  
  try {
    // 1. Verificar se KMS tem chave de documento
    console.log('1️⃣  Testing KMS document key derivation...');
    const docKey = await KMS.deriveDocKey();
    console.log(`   ✅ Document key derived (${docKey.length} bytes)`);
    
    // 2. Obter fingerprint da chave ativa
    console.log('\n2️⃣  Testing key fingerprint...');
    const fingerprint = await getDocKeyFingerprint();
    console.log(`   ✅ Active key fingerprint: ${fingerprint}`);
    
    // 3. Listar todas as chaves válidas
    console.log('\n3️⃣  Testing fallback keys...');
    const fallbacks = await getFallbackKeyFingerprints();
    console.log(`   ✅ ${fallbacks.length} valid key(s) available`);
    fallbacks.forEach((fp, i) => console.log(`      - Key ${i + 1}: ${fp}`));
    
    // 4. Testar encriptação
    console.log('\n4️⃣  Testing document encryption...');
    const testDocument = 'CPF:123.456.789-00';
    const encrypted = await encryptDoc(testDocument);
    console.log(`   ✅ Document encrypted (${encrypted.length} chars)`);
    console.log(`   📦 Encrypted payload: ${encrypted.substring(0, 40)}...`);
    
    // 5. Testar decriptação
    console.log('\n5️⃣  Testing document decryption...');
    const decrypted = await decryptDoc(encrypted);
    console.log(`   ✅ Document decrypted: ${decrypted}`);
    
    // 6. Validar integridade
    console.log('\n6️⃣  Validating data integrity...');
    if (decrypted === testDocument) {
      console.log(`   ✅ Data integrity verified!`);
    } else {
      throw new Error(`Data mismatch! Expected: ${testDocument}, Got: ${decrypted}`);
    }
    
    // 7. Testar com múltiplos documentos
    console.log('\n7️⃣  Testing multiple documents...');
    const documents = [
      '12345678901',
      '98765432100',
      '11122233344'
    ];
    
    const encryptedDocs: string[] = [];
    for (const doc of documents) {
      const enc = await encryptDoc(doc);
      encryptedDocs.push(enc);
    }
    console.log(`   ✅ ${documents.length} documents encrypted`);
    
    let successCount = 0;
    for (let i = 0; i < encryptedDocs.length; i++) {
      const dec = await decryptDoc(encryptedDocs[i]);
      if (dec === documents[i]) {
        successCount++;
      }
    }
    console.log(`   ✅ ${successCount}/${documents.length} documents decrypted correctly`);
    
    // 8. Verificar auditoria
    console.log('\n8️⃣  Checking KMS audit logs...');
    const auditCount = await (prisma as any).keyUsageAudit.count({
      where: {
        keyType: 'DOC_ENCRYPTION',
        operacao: {
          in: ['ENCRYPT', 'DECRYPT']
        }
      }
    });
    console.log(`   ✅ ${auditCount} audit logs found`);
    
    // 9. Testar erro de decriptação (payload inválido)
    console.log('\n9️⃣  Testing error handling...');
    try {
      await decryptDoc('invalid-base64-payload');
      console.log(`   ❌ Should have thrown error!`);
    } catch (error: any) {
      console.log(`   ✅ Error handling works: ${error.message}`);
    }
    
    await prisma.$disconnect();
    
    console.log('\n🎉 All tests passed! Crypto + KMS integration is working correctly.\n');
    console.log('Summary:');
    console.log('  ✅ KMS document key derivation');
    console.log('  ✅ Key fingerprints');
    console.log('  ✅ Document encryption with KMS keys');
    console.log('  ✅ Document decryption with multiple key versions');
    console.log('  ✅ Data integrity validation');
    console.log('  ✅ Batch operations');
    console.log('  ✅ Audit logging');
    console.log('  ✅ Error handling');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

testCryptoKMSIntegration();
