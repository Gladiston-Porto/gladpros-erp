// Script para executar migration manualmente
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function executeMigration() {
  // Detectar qual migration executar pelo argumento ou usar a mais recente
  const migrationName = process.argv[2] || '20251005164420_add_kms_tables';
  
  const migrationPath = path.join(
    __dirname,
    `../prisma/migrations/${migrationName}/migration.sql`
  );
  
  console.log(`Executando migration: ${migrationName}`);
  
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Dividir SQL em comandos separados
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0);
  
  console.log(`Executando ${commands.length} comandos SQL...`);
  
  for (let i = 0; i < commands.length; i++) {
    try {
      console.log(`\n[${i + 1}/${commands.length}] Executando comando...`);
      await prisma.$executeRawUnsafe(commands[i]);
      console.log('✅ Sucesso!');
    } catch (error) {
      if (error.code === 'P2010' || error.message.includes('already exists')) {
        console.log('⚠️  Já existe (ignorando)');
      } else {
        console.error('❌ Erro:', error.message);
      }
    }
  }
  
  console.log('\n✅ Migration concluída!');
}

executeMigration()
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
