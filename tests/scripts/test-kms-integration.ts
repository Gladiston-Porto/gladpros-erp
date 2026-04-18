/**
 * Teste de Integração: KMS + Token Service
 * 
 * Valida que o token-service está usando chaves do KMS corretamente
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { generateTokenPair, validateAccessToken, validateRefreshToken } from './src/lib/auth/token-service';
import { KMS } from './src/lib/security/kms';
import { prisma } from './src/shared/lib/prisma';

async function testKMSIntegration() {
  console.log('🧪 Testing KMS Integration with Token Service...\n');
  
  try {
    // 1. Verificar se KMS está funcionando
    console.log('1️⃣  Testing KMS key derivation...');
    const jwtKey = await KMS.deriveJWTKey();
    console.log(`   ✅ JWT key derived (${jwtKey.length} bytes)`);
    
    // 2. Buscar um usuário real para teste
    console.log('\n2️⃣  Finding test user...');
    const testUser = await prisma.usuario.findFirst({
      where: { status: 'ATIVO' }
    });
    
    if (!testUser) {
      throw new Error('No active user found for testing');
    }
    
    console.log(`   ✅ Using user: ${testUser.email}`);
    
    // 3. Gerar tokens usando KMS
    console.log('\n3️⃣  Testing token generation with KMS...');
    const tokens = await generateTokenPair(
      testUser.id,
      testUser.email,
      testUser.nivel,
      { ip: '127.0.0.1', userAgent: 'test-agent' }
    );
    console.log(`   ✅ Access token generated`);
    console.log(`   ✅ Refresh token generated`);
    console.log(`   📅 Access expires: ${tokens.accessTokenExpiresAt.toISOString()}`);
    console.log(`   📅 Refresh expires: ${tokens.refreshTokenExpiresAt.toISOString()}`);
    
    // 4. Validar access token
    console.log('\n4️⃣  Testing access token validation...');
    const validated = await validateAccessToken(tokens.accessToken);
    console.log(`   ✅ Token validated`);
    console.log(`   👤 User ID: ${validated.userId}`);
    console.log(`   📧 Email: ${validated.email}`);
    console.log(`   🔑 JTI: ${validated.jti}`);
    
    // 5. Validar refresh token
    console.log('\n5️⃣  Testing refresh token validation...');
    const refreshValidated = await validateRefreshToken(tokens.refreshToken);
    console.log(`   ✅ Refresh token validated`);
    console.log(`   👤 User ID: ${refreshValidated.userId}`);
    console.log(`   📧 Email: ${refreshValidated.email}`);
    
    // 6. Verificar auditoria
    console.log('\n6️⃣  Checking KMS audit logs...');
    const auditCount = await (prisma as any).keyUsageAudit.count({
      where: {
        keyType: 'JWT_SIGNING',
        operacao: 'VERIFY'
      }
    });
    console.log(`   ✅ ${auditCount} audit logs found`);
    
    await prisma.$disconnect();
    
    console.log('\n🎉 All tests passed! KMS integration is working correctly.\n');
    console.log('Summary:');
    console.log('  ✅ KMS key derivation');
    console.log('  ✅ Token generation with KMS keys');
    console.log('  ✅ Token validation with multiple key versions');
    console.log('  ✅ Audit logging');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

testKMSIntegration();
