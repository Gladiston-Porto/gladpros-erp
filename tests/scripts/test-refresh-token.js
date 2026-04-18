const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRefreshTokenTable() {
  try {
    const count = await prisma.refreshToken.count();
    console.log('✅ Tabela refresh_tokens existe! Total de registros:', count);
    
    // Testar campos
    const fields = await prisma.$queryRaw`DESCRIBE refresh_tokens`;
    console.log('\n📋 Estrutura da tabela:');
    console.table(fields);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRefreshTokenTable();
